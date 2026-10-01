import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/books')
@UseGuards(BetterAuthGuard, RolesGuard)
export class EmbeddingController {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('book-ingestion') private ingestionQueue: Queue,
  ) {}

  /**
   * Live progress for one book's ingestion, for the dialog that watches a run.
   *
   * Two sources, deliberately. `bookEmbeddingStatus` is what the last run
   * *reported* — durable, and the only thing left once a job is gone. The queue
   * is what is *happening right now*: the processor calls `job.updateProgress()`
   * after setup and again after every chapter, so `progress` moves during a run
   * while the database row sits on PROCESSING from start to finish. A bar driven
   * off the row alone would freeze at 0 for the whole ingest and then jump to
   * done, which is exactly the thing a progress bar exists to avoid.
   *
   * `queueState` is null once BullMQ evicts the job. That is not an error — the
   * row outlives it, so the dialog still has a final status to show.
   */
  @Get(':bookId/embedding-status')
  @Roles('super-admin')
  async getEmbeddingStatus(@Param('bookId') bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, embeddingStatus: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    const [row, job, chapterCount] = await Promise.all([
      this.prisma.bookEmbeddingStatus.findUnique({ where: { bookId } }),
      this.ingestionQueue.getJob(`embed-${bookId}`),
      this.prisma.bookFormat.count({
        where: { bookId, type: 'AI_EMBED' },
      }),
    ]);

    const queueState = job ? await job.getState() : null;
    const rawProgress = job?.progress;
    const progress = typeof rawProgress === 'number' ? rawProgress : null;

    const running =
      queueState === 'active' ||
      queueState === 'waiting' ||
      queueState === 'delayed' ||
      queueState === 'prioritized';

    return {
      bookId: book.id,
      bookTitle: book.title,
      // The book's own column is the one the catalogue renders, so it is the
      // headline; the status row carries the detail.
      status: row?.status ?? book.embeddingStatus ?? 'NONE',
      queueState,
      running,
      // 0-100 while a job exists. Null means "no job to measure" — finished and
      // evicted, or never started — and the dialog shows a state, not a bar.
      progress,
      totalChunks: row?.totalChunks ?? 0,
      embeddedChunks: row?.embeddedChunks ?? 0,
      chapterCount,
      errorMessage: row?.errorMessage ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  @Post(':bookId/embed')
  @Roles('super-admin')
  async triggerEmbedding(@Param('bookId') bookId: string, force = false) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      // AI_EMBED, not PDF: the processor builds retrieval from the enriched
      // markdown rendition and hands THAT to the shared spine. This gate used
      // to require a PDF, which was wrong in both directions once the bridge
      // moved to the markdown lane — a markdown-only book was refused here,
      // and a PDF-only book was happily queued and then failed inside the
      // processor, where the user never sees the reason.
      include: { bookFormats: { where: { type: 'AI_EMBED' } } },
    });
    if (!book) throw new NotFoundException('Book not found');

    // LICENSE GATE (Phase 0)
    if (book.licenseType !== 'AI_PERMITTED') {
      throw new ForbiddenException(
        `Cannot embed: licenseType is "${book.licenseType}". ` +
          `Set to "AI_PERMITTED" after verifying publisher agreement.`,
      );
    }
    if (!book.aiEmbedEnabled) {
      // Name the switch and where it lives. This defaults to false on every new
      // book and had no UI at all, so the previous message ("AI embedding is not
      // enabled for this book") described a state with no visible cause and no
      // visible remedy — an operator who had just uploaded the markdown
      // specifically to enable AI had no way to know what to do next.
      // The label here MUST match the switch's label in EditBookDialog verbatim.
      // It said "Enable AI embedding" while the toggle reads "Enable AI
      // indexing" — a message whose whole purpose is to point at a control,
      // naming it something that cannot be found by searching the screen.
      throw new ForbiddenException(
        'AI indexing is switched off for this book. Turn on "Enable AI indexing" ' +
          'in Edit Metadata, then trigger indexing again. (Separate from the licence: ' +
          'Licence says whether you MAY index this book, this switch says whether you want it indexed.)',
      );
    }

    // ENRICHED-MARKDOWN FORMAT CHECK
    if (!book.bookFormats.length || !book.bookFormats[0].fileUrl) {
      throw new NotFoundException(
        'This book has no enriched-markdown (AI_EMBED) file. Retrieval is built ' +
          'from validated markdown carrying the printed page numbers, not from the ' +
          'PDF — upload the chapter markdown against this book, then embed.',
      );
    }

    // 409 CONFLICT: only a genuinely in-flight run may block a new one.
    //
    // The queue is asked, not the database. `bookEmbeddingStatus` records what
    // the last run *reported*, so a worker killed mid-run leaves PROCESSING
    // written forever and the old check refused every future trigger with no
    // way back. BullMQ knows whether work actually exists, and recovers stalled
    // jobs on its own, so it is the honest source of truth for "still running".
    const existingJob = await this.ingestionQueue.getJob(`embed-${bookId}`);
    if (existingJob) {
      const state = await existingJob.getState();
      const inFlight = ['active', 'waiting', 'delayed', 'prioritized', 'waiting-children'];
      if (inFlight.includes(state)) {
        throw new ConflictException(
          `Embedding is already queued or running for this book (state: ${state}). ` +
            'Wait for it to finish or fail before triggering again.',
        );
      }

      // Settled — completed or failed — so clear it to make room for a rerun.
      //
      // This is the whole bug. The jobId is fixed per book so that triggering
      // twice during a run is a no-op, but BullMQ dedupes on the job EXISTING,
      // and removeOnComplete/removeOnFail deliberately KEEP finished jobs. So
      // once a book had been embedded once — or had failed once — its id was
      // still present, `add` quietly handed back the settled job, and no run was
      // ever queued again. Nothing surfaced it: the endpoint still answered
      // QUEUED and still set embeddingStatus to PENDING, so the button looked
      // like it worked and the book sat at PENDING forever. Verified against
      // production on 2026-08-11, where a failed run left the id in place and
      // re-adding returned that same failed job instead of starting a new one.
      await existingJob.remove();
    }

    // QUEUE JOB with idempotent jobId — BullMQ deduplicates by this key.
    // The separator is a HYPHEN, not a colon: BullMQ builds its Redis keys as
    // `bull:<queue>:<jobId>`, so it rejects a custom id containing ':' outright
    // (`Custom Id cannot contain :`, bullmq/dist/cjs/classes/job.js). With a
    // colon here every single trigger threw before the job was ever queued —
    // the endpoint could not embed anything, and the caller saw a 500 with no
    // hint that the id was the problem.
    await this.ingestionQueue.add(
      'ingest-book',
      { bookId, force },
      {
        jobId: `embed-${bookId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );

    await this.prisma.book.update({
      where: { id: bookId },
      data: { embeddingStatus: 'PENDING' },
    });

    return { status: 'QUEUED', bookId };
  }

  @Post(':bookId/re-embed')
  @Roles('super-admin')
  async retriggerEmbedding(@Param('bookId') bookId: string) {
    // force: true is what makes this endpoint mean anything.
    //
    // The spine skips an upload whose content hash matches the previous run, so
    // re-embedding UNCHANGED markdown was a no-op that reported success — it
    // rebuilt the chunk mapping from the rows already there and left the old
    // chunks untouched. The whole reason to press re-embed is that the pipeline
    // changed while the file did not, which is exactly the case the hash check
    // suppresses. Safe re-indexing itself is handled by the spine's
    // supersede -> delete-old-points -> activate sequence.
    return this.triggerEmbedding(bookId, true);
  }

  @Post(':bookId/retry-embedding')
  @Roles('super-admin')
  async retryFailedEmbedding(@Param('bookId') bookId: string) {
    // Only allow retry on FAILED status
    const status = await this.prisma.bookEmbeddingStatus.findUnique({
      where: { bookId },
    });
    if (status && status.status !== 'FAILED') {
      throw new ConflictException(
        `Cannot retry: current status is "${status.status}". Only FAILED jobs can be retried.`,
      );
    }
    return this.triggerEmbedding(bookId);
  }
}
