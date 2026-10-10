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
import { HubFilesService } from './hub-files.service';

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
    private readonly hubFiles: HubFilesService,
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

  /**
   * What the catalogue screens need to know about the shared library before drawing their menus:
   * whether one is set up, whose it is, and whether a book can be taken off it from here.
   */
  @Get('shared-library/status')
  @Roles('super-admin')
  status() {
    return {
      configured: !!sharedIndexConfig(),
      owner: this.library.ownerName(),
      // Only PDLMS's hub has an unlink call; DigiClassroom's endpoints do not.
      canUnlink: this.library.usesHub(),
    };
  }

  @Get('shared-library/works')
  @Roles('super-admin')
  async works(@Query('q') q?: string, @Query('limit') limit?: string) {
    this.requireSharedMode();
    try {
      const works = await this.library.listWorks(q, limit ? Number(limit) : 50);
      // The hub does not know which of its works Book Buddy already has a book for (DigiClassroom reports
      // it), so Book Buddy says so itself: the screen then shows "Already in Book Buddy" instead of
      // offering a second book that would split the readers' notes and chat history.
      const used = this.library.usesHub() && works.length ? await this.workIdsInBookBuddy(works.map((w) => w.contentItemId)) : new Set<string>();
      const marked = works.map((w) => (used.has(w.contentItemId) ? { ...w, linkedApps: [...new Set([...(w.linkedApps ?? []), 'bookbuddy'])] } : w));
      // `owner` lets the screen say whose library this is (PDLMS's hub, or DigiClassroom).
      return { works: marked, owner: this.library.ownerName() };
    } catch (err) {
      this.rethrow(err);
    }
  }

  /** Which of these hub work ids a live Book Buddy book is already linked to. */
  private async workIdsInBookBuddy(workIds: string[]): Promise<Set<string>> {
    const rows = await this.prisma.book.findMany({
      where: { deletedAt: null, hubWorkId: { in: workIds } },
      select: { hubWorkId: true },
    });
    return new Set(rows.map((r) => r.hubWorkId as string));
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
   * Take a book off the shared library: tell PDLMS this book is no longer used, then let go of the
   * work here. The book's readers keep their annotations, progress and chat history.
   *
   *   outcome 'retire'  unlink and move the book to the Bin, in one step;
   *   outcome 'keep'    unlink and keep the book here, to be given its own files and index.
   *
   * One job per book at a time, and not while the book is being linked or embedded. See
   * IngestionProcessor.handleUnlink for what the job does, in what order, and why it can be repeated.
   */
  @Post('books/:bookId/unlink-shared-work')
  @Roles('super-admin')
  async unlink(@Param('bookId') bookId: string, @Body() body: { outcome?: string }, @Req() req: any) {
    if (!this.library.usesHub()) {
      throw new ConflictException(
        'Taking a book off the shared library is only available when the library is PDLMS’s hub (HUB_URL is set). ' +
          'See docs/shared-spine.md for how to take a DigiClassroom-linked book back to Book Buddy’s own index.',
      );
    }
    const outcome = body?.outcome;
    if (outcome !== 'retire' && outcome !== 'keep') {
      throw new BadRequestException('outcome must be "retire" (unlink and move to the Bin) or "keep" (unlink and keep the book here).');
    }

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, deletedAt: true, spineContentItemId: true, hubWorkId: true },
    });
    if (!book || book.deletedAt) throw new NotFoundException('Book not found');
    if (!book.spineContentItemId && !book.hubWorkId) {
      throw new ConflictException('This book is not linked to the shared library, so there is nothing to unlink.');
    }
    if (!book.hubWorkId) {
      // Linked through DigiClassroom's older endpoints (or before the hub recorded its work id): the hub
      // has no link record to remove, and this job only detaches what the hub supplied.
      throw new ConflictException(
        'This book is linked to the shared library through DigiClassroom, not PDLMS’s hub, so it cannot be unlinked from here. ' +
          'See docs/shared-spine.md for how to take a DigiClassroom-linked book back to Book Buddy’s own index.',
      );
    }

    // One job at a time per book, whichever kind. A settled job of the same kind is cleared so it
    // cannot swallow the new request (the job id is fixed per book).
    for (const prefix of ['link', 'embed', 'unlink']) {
      const job = await this.queue.getJob(`${prefix}-${bookId}`);
      if (!job) continue;
      const state = await job.getState();
      if (['active', 'waiting', 'delayed', 'prioritized', 'waiting-children'].includes(state)) {
        throw new ConflictException(`This book is busy (${prefix === 'embed' ? 'embedding' : prefix + 'ing'}, state: ${state}). Try again when it has finished.`);
      }
      if (prefix === 'unlink') await job.remove();
    }

    await this.queue.add(
      'unlink-work',
      { bookId, outcome, requestedBy: req?.user?.id ?? null },
      {
        jobId: `unlink-${bookId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    return { status: 'QUEUED', bookId, outcome };
  }

  /**
   * Bring a hub-linked book up to date with PDLMS: its PDF/EPUB markers, its audio, and its cover (the
   * cover is the one thing that is copied rather than streamed, so it is the one that goes stale, or was
   * never copied because storage was misconfigured when the book was linked).
   *
   * Nothing is embedded and no passage is touched. A cover someone uploaded is never replaced; one copied
   * from the library is. Done inside the request (a few small files), not as a job, so the admin sees the
   * outcome straight away, including why a cover was not copied. Refused while the book is being linked,
   * unlinked or embedded, because those rewrite the same rows.
   */
  @Post('books/:bookId/refresh-from-library')
  @Roles('super-admin')
  async refreshFromLibrary(@Param('bookId') bookId: string) {
    if (!this.library.usesHub()) {
      throw new ConflictException('Refreshing from the library is only available when the library is PDLMS’s hub (HUB_URL is set).');
    }
    const book = await this.prisma.book.findUnique({ where: { id: bookId }, select: { id: true, deletedAt: true, hubWorkId: true } });
    if (!book || book.deletedAt) throw new NotFoundException('Book not found');
    if (!book.hubWorkId) {
      throw new ConflictException('This book is not linked to PDLMS’s library, so there is nothing to refresh it from.');
    }
    for (const prefix of ['link', 'embed', 'unlink']) {
      const job = await this.queue.getJob(`${prefix}-${bookId}`);
      if (!job) continue;
      const state = await job.getState();
      if (['active', 'waiting', 'delayed', 'prioritized', 'waiting-children'].includes(state)) {
        throw new ConflictException(`This book is busy (${prefix === 'embed' ? 'embedding' : prefix + 'ing'}, state: ${state}). Try again when it has finished.`);
      }
    }
    try {
      const out = await this.hubFiles.syncFromWork(bookId, book.hubWorkId, { refreshCover: true });
      return { status: 'REFRESHED', bookId, ...out };
    } catch (err) {
      this.rethrow(err);
    }
  }

  /**
   * Create a Book Buddy book from a work already in the shared library, and link it.
   *
   * The book is made in the global catalogue from what the shared library knows (title, ISBN,
   * language, and from PDLMS's hub also author, publisher, year, pages and description; DigiClassroom
   * holds no author, so for its works the admin supplies one). The work is confirmed
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
    // The work is known by two ids with the hub: PDLMS's (what is selected) and the embedder's (what the
    // passages carry, `work.index`). A book linked through either, or through DigiClassroom before the hub
    // was switched on, uses the same work, so all of them are checked.
    const already = await this.prisma.book.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { hubWorkId: contentItemId },
          { spineContentItemId: contentItemId },
          ...(work.index ? [{ spineContentItemId: work.index.contentItemId }] : []),
        ],
      },
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
        // Everything else the library knows about the book (hub works only; null for DigiClassroom's).
        publisher: fields.publisher,
        publishYear: fields.publishYear,
        pages: fields.pages,
        description: fields.description,
        format: fields.format,
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
