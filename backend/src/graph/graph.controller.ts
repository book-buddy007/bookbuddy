import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from './graph.service';
import { GraphEmbeddingService } from './graph-embedding.service';

const SYSTEM_TENANT = '__SYSTEM__';
const READER_ROLES = ['super-admin', 'admin', 'librarian', 'teacher', 'student'];

@Controller('books/:bookId/graph')
@UseGuards(BetterAuthGuard, RolesGuard)
export class GraphController {
  constructor(
    private graphService: GraphService,
    private graphEmbedding: GraphEmbeddingService,
    private prisma: PrismaService,
    @InjectQueue('book-graph-extraction') private graphQueue: Queue,
  ) {}

  /**
   * Same object-level authorization as BookChatController: the global
   * catalog (__SYSTEM__) is readable by everyone; a tenant-scoped book
   * requires an ACTIVE membership in that tenant. Duplicated rather than
   * shared because the two controllers sit in different modules and this
   * is a three-line check, not worth a cross-module dependency for.
   */
  private async authorizeBookAccess(bookId: string, req: any) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    if (book.tenantId && book.tenantId !== SYSTEM_TENANT) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId: req.user.id, tenantId: book.tenantId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('You do not have access to this book.');
      }
    }
    return book;
  }

  // The chapters that have a pre-generated map, in reading order — drives the
  // Map tab's chapter picker (the graph is built and viewed chapter by chapter).
  @Get('chapters')
  @Roles(...READER_ROLES)
  async listChapters(@Param('bookId') bookId: string, @Req() req: any) {
    await this.authorizeBookAccess(bookId, req);
    return this.graphService.listGraphChapters(bookId);
  }

  @Get('entities')
  @Roles(...READER_ROLES)
  async listEntities(
    @Param('bookId') bookId: string,
    @Query('type') type: string | undefined,
    @Query('chapter') chapter: string | undefined,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    return this.graphService.listEntities(bookId, type, chapter);
  }

  @Get('network')
  @Roles(...READER_ROLES)
  async getNetwork(
    @Param('bookId') bookId: string,
    @Query('type') type: string | undefined,
    @Query('chapter') chapter: string | undefined,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    return this.graphService.getNetwork(bookId, type, chapter);
  }

  @Get('entities/:entityId')
  @Roles(...READER_ROLES)
  async getEntity(
    @Param('bookId') bookId: string,
    @Param('entityId') entityId: string,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    return this.graphService.getEntity(bookId, entityId);
  }

  @Get('summary')
  @Roles(...READER_ROLES)
  async getSummary(
    @Param('bookId') bookId: string,
    @Query('level') level: string | undefined,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    const resolvedLevel = level === 'chapter' ? 'chapter' : 'book';
    return this.graphService.getCommunitySummary(bookId, resolvedLevel);
  }

  @Post('query')
  @Roles(...READER_ROLES)
  async query(
    @Param('bookId') bookId: string,
    @Body() body: { query?: string; maxHops?: number },
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    if (!body?.query?.trim()) {
      throw new BadRequestException('"query" is required.');
    }
    return this.graphService.queryGraph(bookId, body.query.trim(), body.maxHops);
  }

  /**
   * Build (or rebuild) this book's graph. As of Stage 2 this is an ADMIN/backfill
   * path, not a reader action: new books extract automatically at ingestion
   * (chapter by chapter), and the reader only VIEWS the pre-generated maps. This
   * endpoint rebuilds books ingested before auto-extraction, or refreshes one
   * whose graph tuning changed.
   *
   * No page scope ⇒ the whole book, built chapter-wise and accumulated
   * (extractAllChapters) — the canonical pre-generation path. A page scope keeps
   * the legacy single-range replace build (extractForBook), retained for
   * back-compat / targeted debugging. One job per book/scope (jobId dedup).
   */
  @Post('extract')
  @Roles(...READER_ROLES)
  async extract(
    @Param('bookId') bookId: string,
    @Body() body: { pageStart?: number; pageEnd?: number },
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);

    // Page-scoped build: the reader picks a page or range, and only those pages
    // are read. A scoped build always runs — it replaces the current map with
    // the chosen range — so there is no "already exists" short-circuit.
    const rawStart = Number(body?.pageStart);
    const pageStart = Number.isFinite(rawStart) ? Math.max(1, Math.floor(rawStart)) : undefined;
    const rawEnd = Number(body?.pageEnd);
    const pageEnd =
      pageStart != null
        ? Number.isFinite(rawEnd)
          ? Math.max(pageStart, Math.floor(rawEnd))
          : pageStart // no end given ⇒ a single page
        : undefined;

    const jobId = pageStart != null ? `graph-${bookId}-p${pageStart}-${pageEnd}` : `graph-ondemand-${bookId}`;
    await this.graphQueue.add(
      'extract-graph',
      { bookId, pageStart, pageEnd },
      { jobId, removeOnComplete: true, removeOnFail: true },
    );
    return { status: 'queued' as const, pageStart: pageStart ?? null, pageEnd: pageEnd ?? null };
  }

  // Semantic sibling of /query: ranks entities by what they're ABOUT (vector
  // similarity to the typed text) rather than by literal label substring.
  @Post('search')
  @Roles(...READER_ROLES)
  async search(
    @Param('bookId') bookId: string,
    @Body() body: { query?: string; limit?: number },
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    if (!body?.query?.trim()) {
      throw new BadRequestException('"query" is required.');
    }
    const limit = Math.min(Math.max(body.limit ?? 20, 1), 50);
    return this.graphEmbedding.search(bookId, body.query.trim(), limit);
  }
}
