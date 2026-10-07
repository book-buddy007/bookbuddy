import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpException,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { sharedIndexConfig } from './local/index-config';
import { SharedLibraryError, SharedLibraryService, isUuid } from './shared-library.service';
import { newBookFromWork } from './shared-work-book';

const SYSTEM_TENANT_ID = '__SYSTEM__';

/**
 * Super-admin: use a book that is already embedded in the shared library (DigiClassroom)
 * instead of embedding it again here. Only available in shared-index mode.
 */
@Controller('api')
@UseGuards(BetterAuthGuard, RolesGuard)
export class SharedLibraryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly library: SharedLibraryService,
    @InjectQueue('book-ingestion') private readonly queue: Queue,
  ) {}

  private requireSharedMode() {
    if (!sharedIndexConfig()) {
      throw new ConflictException(
        'The shared library is not set up for this deployment (SHARED_QDRANT_URL is empty), so there is nothing to link to. ' +
          'See docs/shared-spine.md.',
      );
    }
  }

  private rethrow(err: unknown): never {
    if (err instanceof SharedLibraryError) {
      throw new HttpException({ message: err.message }, err.status >= 400 ? err.status : 502);
    }
    throw err;
  }

  @Get('shared-library/works')
  @Roles('super-admin')
  async works(@Query('q') q?: string, @Query('limit') limit?: string) {
    this.requireSharedMode();
    try {
      // `owner` lets the screen say whose library this is (PDLMS's hub, or DigiClassroom).
      return { works: await this.library.listWorks(q, limit ? Number(limit) : 50), owner: this.library.ownerName() };
    } catch (err) {
      this.rethrow(err);
    }
  }

  @Post('books/:bookId/link-shared-work')
  @Roles('super-admin')
  async link(@Param('bookId') bookId: string, @Body() body: { contentItemId?: string }) {
    this.requireSharedMode();
    if (!isUuid(body?.contentItemId)) {
      throw new BadRequestException('contentItemId must be the id of a work in the shared library.');
    }

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, deletedAt: true },
    });
    if (!book || book.deletedAt) throw new NotFoundException('Book not found');

    await this.queueLink(bookId, body.contentItemId);
    return { status: 'QUEUED', bookId };
  }

  /**
   * Create a Book Buddy book from a work already in the shared library, and link it.
   *
   * The book is made in the global catalogue from what the shared library knows (title, ISBN,
   * language); the author is supplied because the library does not hold one. The work is confirmed
   * with DigiClassroom first, so a typo or a restricted work creates nothing. A work already used by
   * another Book Buddy book is refused rather than duplicated. If the link cannot be queued, the
   * book just created is removed again: it has no files and no link, so nothing else depends on it.
   *
   * When the library is PDLMS's hub, the PDF/EPUB appear on the new book by themselves (they are streamed
   * from the hub on every read, never copied) and the cover is brought across once. With DigiClassroom's
   * older endpoints nothing is copied: upload the files to the new book afterwards.
   */
  @Post('shared-library/create-book')
  @Roles('super-admin')
  async createBook(
    @Body() body: { contentItemId?: string; author?: string; title?: string; language?: string },
    @Req() req: any,
  ) {
    this.requireSharedMode();
    if (!isUuid(body?.contentItemId)) {
      throw new BadRequestException('contentItemId must be the id of a work in the shared library.');
    }
    const contentItemId = body.contentItemId;

    let work;
    try {
      work = await this.library.getWork(contentItemId);
    } catch (err) {
      this.rethrow(err);
    }
    const fields = newBookFromWork(work, body);

    // One Book Buddy book per work: two records of the same book would split its readers, notes and
    // chat history across copies.
    const already = await this.prisma.book.findFirst({
      where: { spineContentItemId: contentItemId, deletedAt: null },
      select: { title: true },
    });
    if (already) {
      throw new ConflictException(`This work is already used by the Book Buddy book "${already.title}". Open that book instead.`);
    }

    // The system tenant owns the global catalogue; it exists once a global book has ever been made.
    await this.prisma.tenant.upsert({
      where: { domain: '__system__.internal' },
      update: {},
      create: {
        id: SYSTEM_TENANT_ID,
        name: 'Book Buddy System (Global Catalog)',
        domain: '__system__.internal',
        type: 'UNIVERSITY',
        description: 'Internal system tenant for global catalog books.',
        allowJoinRequests: false,
        isActive: true,
        isGlobalPublisher: true,
      },
    });

    const created = await this.prisma.book.create({
      data: {
        title: fields.title,
        author: fields.author,
        isbn: fields.isbn,
        language: fields.language,
        format: 'pdf',
        genre: 'General',
        tenantId: SYSTEM_TENANT_ID,
        catalogScope: 'GLOBAL',
        globalPublishStatus: 'APPROVED',
        globalPublishReviewedBy: req?.user?.id ?? null,
        globalPublishReviewedAt: new Date(),
      },
      select: { id: true, title: true },
    });

    try {
      await this.queueLink(created.id, contentItemId);
    } catch (err) {
      await this.prisma.book.delete({ where: { id: created.id } }).catch(() => undefined);
      throw err;
    }
    return { status: 'QUEUED', bookId: created.id, title: created.title };
  }

  /** Queue the job that links a book to a shared work. One per book at a time. */
  private async queueLink(bookId: string, contentItemId: string): Promise<void> {
    // The jobId is fixed per book, as for embedding, so pressing twice during a run is a no-op.
    const existing = await this.queue.getJob(`link-${bookId}`);
    if (existing) {
      const state = await existing.getState();
      if (['active', 'waiting', 'delayed', 'prioritized', 'waiting-children'].includes(state)) {
        throw new ConflictException(`Linking is already queued or running for this book (state: ${state}).`);
      }
      await existing.remove(); // a settled job would otherwise swallow the new request
    }

    await this.queue.add(
      'link-work',
      { bookId, contentItemId },
      {
        jobId: `link-${bookId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    await this.prisma.book.update({ where: { id: bookId }, data: { embeddingStatus: 'PENDING' } });
  }
}
