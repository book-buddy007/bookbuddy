import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { BooksService } from './books.service';
import { BookQueryDto } from './dto/book-query.dto';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ContentSpineService } from '../rag/content-spine.service';

const SYSTEM_TENANT = '__SYSTEM__';

/**
 * Public book catalog — the shared API surface consumed by the web app
 * and the native iOS/Android apps.
 *
 * Listing/detail/categories are public (global approved books only);
 * read-url, borrow and return require an authenticated session
 * (cookie or Bearer token — see BetterAuthGuard).
 */
@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly prisma: PrismaService,
    private readonly contentSpine: ContentSpineService,
  ) {}

  @Get()
  async findAll(@Query(ValidationPipe) query: BookQueryDto) {
    return this.booksService.findAll(query);
  }

  @Get('categories')
  async getCategories(@Query('type') type?: string) {
    return this.booksService.getCategories(type);
  }

  /* Both of these are called by the discovery page and the student dashboard
     and existed nowhere in the API, so every call 404'd into a `.catch`.
     Declared ABOVE `@Get(':id')` deliberately — Nest matches routes in
     declaration order, so a literal path registered after a parameterised one
     is shadowed by it and would resolve as a book with id "trending". */
  @Get('trending')
  async getTrending(@Query('limit') limit?: string) {
    return this.booksService.getTrending(this.parseLimit(limit));
  }

  @UseGuards(BetterAuthGuard)
  @Get('recommendations')
  async getRecommendations(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as { id: string };
    return this.booksService.getRecommendations(user.id, this.parseLimit(limit));
  }

  /** Clamp a client-supplied limit into a sane range. */
  private parseLimit(raw?: string): number {
    const n = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(n) || n <= 0) return 12;
    return Math.min(n, 50);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  // Distinct chapter titles for a book, in first-appearance order — the
  // shared list the reader's quiz/digest/simplify affordances all pick a
  // chapter from (they're all keyed by this same chapterTitle string, see
  // graph/quiz/digest/text-adaptation). Lives here rather than duplicated
  // per feature controller since it's plain book metadata, not
  // feature-specific data.
  @UseGuards(BetterAuthGuard)
  @Get(':id/chapters')
  async getChapters(@Param('id') id: string, @Req() req: any) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.tenantId && book.tenantId !== SYSTEM_TENANT) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId: (req.user as any).id, tenantId: book.tenantId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!membership) throw new ForbiddenException('You do not have access to this book.');
    }

    const rows = await this.prisma.bookChunkMapping.findMany({
      where: { bookId: id, chapterTitle: { not: null } },
      orderBy: { chunkIndex: 'asc' },
      select: { chapterTitle: true },
      distinct: ['chapterTitle'],
    });
    return rows.map((r) => r.chapterTitle);
  }

  /**
   * How the reader's page numbers relate to the book's printed page numbers.
   *
   * These are two different coordinate systems and conflating them is the
   * reason "quiz me on what I've read" could not ship. The reader counts PDF
   * pages from the start of the file — page 1, 2, 3 — while every ingested
   * chunk carries the page number PRINTED on the page, which for this
   * catalogue's chapter extracts starts at 183. Filtering one by the other
   * silently matches nothing, or the wrong pages.
   *
   * The offset is DERIVED and self-verifying rather than stored. The caller
   * sends the PDF's real page count; if it equals the printed span, the file
   * covers exactly the ingested range and printed = readerPage + (min - 1).
   * If the counts disagree — a whole-book PDF with only two chapters ingested,
   * front matter, a re-upload — nothing can be concluded, and this says so
   * instead of guessing. A wrong offset here would quiz students on pages they
   * have never seen while looking perfectly correct, which is worse than the
   * feature being unavailable.
   *
   * Deliberately not persisted: a stored offset silently rots the next time
   * the PDF is replaced, whereas this is recomputed from the file in front of
   * the reader every time.
   */
  @UseGuards(BetterAuthGuard)
  @Get(':id/page-map')
  async getPageMap(@Param('id') id: string, @Query('pdfPages') pdfPagesParam?: string) {
    // The spine's extent, NOT BookChunkMapping's. The local table holds only
    // vectorised reference chunks, so its range stops short of the practice
    // pages the PDF still contains — 183-209 locally against 183-213 in the
    // spine for the one embedded book. Comparing the short range against the
    // real file disagrees by four pages and disables the feature for a book
    // whose mapping is exactly determined.
    const spine = await this.contentSpine.getPrintedPageSpan(id);
    if (!spine) {
      return { resolved: false as const, reason: 'not_ingested' };
    }

    const { minPrinted, maxPrinted, span: printedSpan } = spine;
    const pdfPages = Number.parseInt(pdfPagesParam ?? '', 10);
    if (!Number.isFinite(pdfPages) || pdfPages <= 0) {
      return { resolved: false as const, reason: 'pdf_page_count_missing', minPrinted, maxPrinted, printedSpan };
    }

    if (pdfPages !== printedSpan) {
      return {
        resolved: false as const,
        reason: 'span_mismatch',
        minPrinted,
        maxPrinted,
        printedSpan,
        pdfPages,
      };
    }

    return {
      resolved: true as const,
      /** printedPage = readerPage + offset */
      offset: minPrinted - 1,
      minPrinted,
      maxPrinted,
      printedSpan,
    };
  }

  @UseGuards(BetterAuthGuard)
  @Get(':id/read-url')
  async getReadUrl(
    @Param('id') id: string,
    @Query('format') format: string,
    @Req() req: Request,
  ) {
    const user = req.user as { id: string };
    return this.booksService.getReadUrl(user.id, id, format);
  }

  @UseGuards(BetterAuthGuard)
  @Post(':id/borrow')
  async borrow(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.booksService.borrow(user.id, id);
  }

  @UseGuards(BetterAuthGuard)
  @Post(':id/return')
  async returnBook(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.booksService.returnBook(user.id, id);
  }
}
