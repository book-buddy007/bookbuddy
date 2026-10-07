import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue, UnrecoverableError } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from './file.service';
import { BookIndex, ContentSpineService, SharedIndexUnavailableError } from './content-spine.service';
import { QdrantInitService } from './qdrant-init.service';
import { EmbeddingService } from './embedding.service';
import { LocalIndexerService } from './local/local-indexer.service';
import { handsNewBooksToShared, qdrantCollectionName, sharedIndexConfig } from './local/index-config';
import { sharedIndexBlocker } from './local/shared-index-policy';
import { SharedLibraryError, SharedLibraryService } from './shared-library.service';
import { HubFilesService } from './hub-files.service';


/**
 * Two ingestion modes, chosen by INGESTION_MODE (see local/index-config.ts):
 *
 *   local (default)  Book Buddy indexes the book itself: it reads each chapter's enriched
 *                    markdown from storage, chunks it (local/enriched-markdown.ts), embeds it with
 *                    OpenAI and writes it to its own Qdrant collection (local/local-indexer.service.ts).
 *   trio             The interim path described next: a thin proxy to DCP's ingestion service.
 *
 * Trio interim path: DCP's enhanced-rag-pipeline is the sole ingestion writer
 * against the shared `trio_content_v1_openai3072` collection + `content.*`
 * schema (see TRIO_RESET_PROGRESS.md §5.5-5.6). This processor is now a thin
 * proxy — fetch the PDF, hand it to DCP's internal ingestion endpoint,
 * record the result. Book Buddy's own PDF-extract → embed → Qdrant-upsert pipeline
 * (PDFExtractKitAdapter, EmbeddingService, QdrantInitService) is retired from
 * this path; Book Buddy's `Book` row stays the source of truth (per the owner's
 * explicit book-ownership decision), linked to the canonical content_item via
 * `content.content_source_ref` (app='bookbuddy', local_id=book.id), which DCP's
 * endpoint creates server-side.
 */
/** Payload of a `book-ingestion` job. `force` is set only by an operator re-embed. */
/** Payload of a `link-work` job: use an existing shared-library work instead of embedding. */
export interface LinkJobData {
  bookId: string;
  contentItemId: string;
}

export interface IngestJobData {
  bookId: string;
  force?: boolean;
}

@Processor('book-ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
    private contentSpine: ContentSpineService,
    private qdrantInit: QdrantInitService,
    private embedding: EmbeddingService,
    private localIndexer: LocalIndexerService,
    private sharedLibrary: SharedLibraryService,
    @InjectQueue('book-graph-extraction') private graphQueue: Queue,
    private hubFiles: HubFilesService,
  ) {
    super();
  }

  /**
   * Rebuild `BookChunkMapping` for a book from the shared collection.
   *
   * WHY THIS EXISTS. Ingestion became a proxy to DCP, so Book Buddy stopped writing
   * chunk rows of its own — and five features still read them: the citation →
   * page jump (which THROWS 404, making every citation Varta produces a dead
   * link), the chapter list (returns []), Chapter Recap (silently null), and
   * adaptive-flags / paragraph-simplify. The chat kept working because it reads
   * Qdrant directly, so the breakage is invisible until a student clicks a
   * citation.
   *
   * The spine already holds everything the table needs, so this reads it back
   * rather than asking DCP to return it: the endpoint reports counts, not point
   * ids, and having Book Buddy derive its own view keeps the contract between the two
   * apps narrow.
   *
   * REBUILDS THE WHOLE BOOK, not just the chapter just ingested. A book is
   * ingested one chapter at a time and the spine accumulates them, so a full
   * rebuild is what keeps the table consistent with the corpus — and it
   * self-heals a book whose mapping was lost or never written. Idempotent by
   * construction: delete then insert, inside one transaction, so a failure
   * leaves the previous mapping rather than a half-built one.
   */
  private async rebuildChunkMapping(
    bookId: string,
    index: BookIndex,
  ): Promise<number> {
    const qdrant = index.client;
    const contentItemId = index.contentItemId;

    type Row = {
      bookId: string;
      chunkIndex: number;
      qdrantPointId: string;
      pageNumber: number | null;
      chapterTitle: string | null;
      textPreview: string;
      runId: string | null;
    };
    const rows: Row[] = [];

    // Scroll, not search: this wants every point of the work, not the nearest
    // few. `practice` chunks are included deliberately — they are real positions
    // in the book, so a citation that lands on one still has to resolve even
    // though retrieval never returns it.
    let offset: any = undefined;
    do {
      const page = await qdrant.scroll(index.collection, {
        filter: {
          must: [
            { key: 'content_item_id', match: { value: contentItemId } },
            // Only what is public: a citation table must never list a passage the search itself
            // would refuse to return.
            { key: 'visibility', match: { value: 'public' } },
          ],
        },
        with_payload: true,
        with_vector: false,
        limit: 256,
        offset,
      });

      for (const pt of page.points ?? []) {
        const p: any = pt.payload ?? {};
        const text: string = typeof p.text === 'string' ? p.text : '';
        rows.push({
          bookId,
          // chunk_index is contiguous WITHIN a file, so it repeats across
          // chapters of the same book. Kept as-is: it is the spine's own
          // vocabulary, and the unique key is the point id, not this.
          chunkIndex: Number.isFinite(p.chunk_index) ? p.chunk_index : 0,
          qdrantPointId: String(pt.id),
          pageNumber: Number.isFinite(p.page_start) ? p.page_start : null,
          chapterTitle: p.chapter ?? p.section_title ?? null,
          textPreview: text.slice(0, 200),
          runId: p.run_id ?? null,
        });
      }
      offset = page.next_page_offset ?? undefined;
    } while (offset);

    if (rows.length === 0) {
      // Nothing to map is not necessarily an error (a work with only skipped
      // content), but it does mean citations will not resolve — say so rather
      // than reporting a silent success.
      this.logger.warn(
        `No points found in "${index.collection}" for work ${contentItemId} — citation links for ` +
          `book ${bookId} will not resolve.`,
      );
      return 0;
    }

    await this.prisma.$transaction([
      this.prisma.bookChunkMapping.deleteMany({ where: { bookId } }),
      this.prisma.bookChunkMapping.createMany({
        data: rows,
        skipDuplicates: true,
      }),
    ]);

    return rows.length;
  }

  /** @nestjs/bullmq entry point — dispatches by job.name */
  async process(job: Job<any>): Promise<void> {
    switch (job.name) {
      case 'ingest-book':
        return this.handleIngestion(job);
      case 'link-work':
        return this.handleLink(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  /**
   * Local mode, steps 2 to 5: index the whole book and finish the bookkeeping.
   *
   * All-or-nothing by design. A book missing half its chapters still answers confidently from
   * the half it has, and neither the tutor nor the student can tell the rest is absent, so a
   * chapter that cannot be read fails the whole run. The indexer itself keeps the previous
   * index in place until the new one is complete, so a failed re-index changes nothing.
   */
  private async ingestLocally(
    job: Job<IngestJobData>,
    book: { id: string; title: string; tenantId: string },
    chapters: { id: string; partIndex: number; fileUrl: string | null }[],
    startTime: number,
  ) {
    const bookId = book.id;
    const inputs: { assetId: string; partIndex: number; markdown: string }[] = [];

    for (const [i, fmt] of chapters.entries()) {
      let buffer: Buffer;
      try {
        buffer = await this.fileService.getFileBuffer(fmt.fileUrl!);
      } catch (err: any) {
        throw new Error(
          `Could not read chapter ${fmt.partIndex} from storage: ${err.message}. Nothing was indexed.`,
        );
      }
      inputs.push({
        assetId: fmt.id,
        partIndex: fmt.partIndex,
        markdown: buffer.toString('utf8'),
      });
      this.logger.log(
        `📝 Chapter ${fmt.partIndex}: ${(buffer.length / 1024).toFixed(1)} KB (${i + 1}/${chapters.length})`,
      );
    }
    await job.updateProgress(20);

    const result = await this.localIndexer.indexBook({
      bookId,
      tenantId: book.tenantId,
      bookTitle: book.title,
      chapters: inputs,
      requireApproved: process.env.INGEST_REQUIRE_APPROVED === 'true',
      onProgress: (pct) => job.updateProgress(20 + Math.round(pct * 0.65)),
    });
    await job.updateProgress(90);

    // The book may have been queried before this run; drop any cached negative lookup.
    this.contentSpine.invalidate(bookId);

    // Citations, the chapter list, Chapter Recap and the adaptation features read this table.
    // Not fatal if it fails: the book is indexed and the chat works without it.
    try {
      const mapped = await this.rebuildChunkMapping(bookId, this.contentSpine.localIndex(bookId));
      this.logger.log(`🔗 Chunk mapping rebuilt for book ${bookId}: ${mapped} row(s)`);
    } catch (mapErr: any) {
      this.logger.error(
        `Chunk mapping rebuild FAILED for book ${bookId}: ${mapErr.message}. The book is indexed ` +
          `and chat works, but citation links, the chapter list and Chapter Recap will not resolve ` +
          `until this is rebuilt.`,
      );
    }

    await this.prisma.bookEmbeddingStatus.update({
      where: { bookId },
      data: {
        status: 'READY',
        totalChunks: result.totalChunks,
        embeddedChunks: result.totalChunks,
        embeddingModel: this.embedding.modelId,
      },
    });
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        embeddingStatus: 'READY',
        vectorCollectionId: qdrantCollectionName(),
        // This book now lives in Book Buddy's own index, wherever it lived before.
        spineContentItemId: null,
      },
    });
    await job.updateProgress(100);

    // Pre-generate the entity graph, chapter by chapter, as the trio path does. A separate job:
    // an extraction failure never fails indexing, and the book is searchable meanwhile.
    await this.graphQueue.add(
      'extract-graph',
      { bookId },
      { jobId: `graph-ingest-${bookId}`, removeOnComplete: true, removeOnFail: true },
    );

    this.logger.log(
      `✅ Indexed "${book.title}" (${bookId}) locally: ${result.totalChunks} chunks in ` +
        `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    );
  }

  /**
   * Use a work that is already embedded in the shared library, rather than embedding the book
   * again. Nothing is written to the shared index: DigiClassroom records the link, and this
   * only reads the passages back to build Book Buddy's citation table.
   *
   * The order matters. The work id is saved on the book, and the book marked READY, only after
   * the passages were actually found; saving it first would leave a book that claims to be
   * ready and answers from nothing.
   */
  private async handleLink(job: Job<LinkJobData>) {
    const { bookId, contentItemId } = job.data;
    this.logger.log(`🔗 Linking book ${bookId} to shared work ${contentItemId}`);

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true, isbn: true },
    });
    if (!book) {
      this.logger.warn(`Book ${bookId} deleted before linking started. Skipping.`);
      return;
    }

    try {
      await this.prisma.bookEmbeddingStatus.upsert({
        where: { bookId },
        create: { bookId, status: 'PROCESSING', totalChunks: 0, embeddedChunks: 0, embeddingModel: this.embedding.modelId },
        update: { status: 'PROCESSING', totalChunks: 0, embeddedChunks: 0, errorMessage: null, embeddingModel: this.embedding.modelId },
      });
      await this.prisma.book.update({
        where: { id: bookId },
        data: { embeddingStatus: 'PROCESSING', embeddingStartedAt: new Date() },
      });
      await job.updateProgress(10);

      // DigiClassroom checks the work is public, the ISBNs agree and the record is not already
      // attached to a different work, and answers with a reason a person can act on if not.
      try {
        await this.sharedLibrary.linkWork({ contentItemId, bookId, isbn: book.isbn });
      } catch (err) {
        if (err instanceof SharedLibraryError && !err.retryable) {
          throw new UnrecoverableError(err.message);
        }
        throw err;
      }
      await job.updateProgress(40);

      let index: BookIndex;
      try {
        index = this.contentSpine.sharedIndex(contentItemId);
      } catch (err) {
        if (err instanceof SharedIndexUnavailableError) throw new UnrecoverableError(err.message);
        throw err;
      }
      const mapped = await this.rebuildChunkMapping(bookId, index);
      if (mapped === 0) {
        throw new UnrecoverableError(
          'The shared work was linked, but no public passages of it could be read from the shared index. ' +
            'Check that it has been embedded and that QDRANT_URL and the collection name are correct.',
        );
      }
      await job.updateProgress(80);

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          spineContentItemId: contentItemId,
          embeddingStatus: 'READY',
          vectorCollectionId: index.collection,
        },
      });
      this.contentSpine.invalidate(bookId);
      await this.prisma.bookEmbeddingStatus.update({
        where: { bookId },
        data: { status: 'READY', totalChunks: mapped, embeddedChunks: mapped },
      });

      // The book now reads from the shared library, so any passages it had in Book Buddy's own index
      // are unused. Removed (only this book's, only there) so they cannot go stale or be paid for.
      // Best effort: leftovers are harmless, search never looks at them.
      try {
        const own = this.contentSpine.localIndex(bookId);
        await own.client.delete(own.collection, {
          filter: { must: [{ key: 'content_item_id', match: { value: own.contentItemId } }] },
          wait: true,
        });
      } catch (cleanupErr: any) {
        this.logger.warn(`Could not clear the old local passages of book ${bookId}: ${cleanupErr.message}`);
      }
      // Hub books: record the PDF/EPUB as hub-owned formats (streamed on every read, never copied) and
      // bring the cover across. Best effort: the passages are what linking is for, and syncing can be
      // repeated by linking again.
      if (this.sharedLibrary.usesHub()) {
        try {
          const synced = await this.hubFiles.syncFromWork(bookId, contentItemId);
          this.logger.log(`Hub files for ${bookId}: formats [${synced.formats.join(', ')}], cover copied: ${synced.cover}`);
        } catch (syncErr: any) {
          this.logger.warn(`Linked ${bookId}, but could not record its hub files: ${syncErr.message}`);
        }
      }
      await job.updateProgress(100);

      await this.graphQueue.add(
        'extract-graph',
        { bookId },
        { jobId: `graph-ingest-${bookId}`, removeOnComplete: true, removeOnFail: true },
      );
      this.logger.log(
        `✅ Book "${book.title}" (${bookId}) now uses shared work ${contentItemId}: ${mapped} passages`,
      );
    } catch (err: any) {
      this.logger.error(`❌ Linking failed for ${bookId}: ${err.message}`);
      await this.prisma.bookEmbeddingStatus.upsert({
        where: { bookId },
        create: { bookId, status: 'FAILED', errorMessage: err.message },
        update: { status: 'FAILED', errorMessage: err.message },
      });
      await this.prisma.book.update({ where: { id: bookId }, data: { embeddingStatus: 'FAILED' } });
      throw err;
    }
  }

  private async handleIngestion(job: Job<IngestJobData>) {
    const { bookId, force = false } = job.data;
    const startTime = Date.now();

    this.logger.log(
      `🚀 Starting indexing for book ${bookId}`,
    );

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      // AI_EMBED is the enriched-markdown rendition: human-validated text that
      // carries the PRINTED page numbers. That is what gets embedded. The PDF
      // stays the reader's copy and is never sent here — DCP's extraction lane
      // is disabled on every deployed host, so a PDF would fail after upload
      // rather than before it, and OCR'd text would produce worse chunks and
      // guessed page numbers than the markdown already has.
      include: {
        bookFormats: {
          where: { type: 'AI_EMBED' },
          orderBy: { partIndex: 'asc' },
        },
      },
    });

    if (!book) {
      this.logger.warn(
        `Book ${bookId} deleted before ingestion started. Skipping.`,
      );
      return;
    }

    // EVERY chapter, not the first. A book is many markdown files, one per
    // chapter, and sending only one indexed a fraction of the book while
    // reporting success for all of it.
    const chapters = book.bookFormats.filter((f) => !!f.fileUrl);
    if (chapters.length === 0) {
      throw new Error(
        `Book ${bookId} has no AI_EMBED (enriched markdown) format. Retrieval is built from ` +
          `validated markdown, not from the PDF: upload the chapter markdown against this book ` +
          `before requesting embedding.`,
      );
    }

    try {
      // ── Step 1: Mark PROCESSING ──────────────────────────────────────
      await this.prisma.bookEmbeddingStatus.upsert({
        where: { bookId },
        create: {
          bookId,
          status: 'PROCESSING',
          totalChunks: 0,
          embeddedChunks: 0,
          embeddingModel: this.embedding.modelId,
        },
        update: {
          status: 'PROCESSING',
          totalChunks: 0,
          embeddedChunks: 0,
          errorMessage: null,
          embeddingModel: this.embedding.modelId,
        },
      });

      await this.prisma.book.update({
        where: { id: bookId },
        data: { embeddingStatus: 'PROCESSING', embeddingStartedAt: new Date() },
      });
      await job.updateProgress(10);

      // Where this book goes. The shared library takes only books meant for everyone, because
      // nothing in it can keep a book private; every other book (an institution's own, or any book
      // while INGESTION_MODE is local) is embedded here, into Book Buddy's own index. Decided here,
      // where the job runs, because the shared library is the one place a mistake cannot be undone.
      const toShared = handsNewBooksToShared() && sharedIndexBlocker(book) === null;
      if (!toShared) {
        await this.ingestLocally(job, book, chapters, startTime);
        return;
      }

      // The book will be read back from the shared library, so refuse before sending anything if
      // that is not set up: otherwise DigiClassroom would embed it and Book Buddy could not use it.
      if (!sharedIndexConfig()) {
        throw new UnrecoverableError(
          'This book is meant for the shared library, but reading from it is not set up: set SHARED_QDRANT_URL ' +
            '(and a read-only SHARED_QDRANT_API_KEY). Nothing was sent.',
        );
      }

      // ── Steps 2-3: every chapter, in order ───────────────────────────
      const ingestUrl = process.env.TRIO_INGEST_URL;
      const serviceSecret = process.env.TRIO_SERVICE_SECRET;
      if (!ingestUrl || !serviceSecret) {
        throw new Error(
          'TRIO_INGEST_URL/TRIO_SERVICE_SECRET are not configured — cannot reach the shared ingestion pipeline.',
        );
      }

      const outcomes: Array<{
        part: number;
        ok: boolean;
        chunks: number;
        detail?: string;
      }> = [];
      let contentItemId: string | undefined;

      for (const [i, fmt] of chapters.entries()) {
        const part = fmt.partIndex;
        const filename =
          fmt.fileUrl!.split('/').pop() ?? `${bookId}-${part}.md`;

        let mdBuffer: Buffer;
        try {
          mdBuffer = await this.fileService.getFileBuffer(fmt.fileUrl!);
        } catch (fetchErr: any) {
          outcomes.push({
            part,
            ok: false,
            chunks: 0,
            detail: `fetch failed: ${fetchErr.message}`,
          });
          continue;
        }
        this.logger.log(
          `📝 Chapter ${part}: ${(mdBuffer.length / 1024).toFixed(1)} KB (${i + 1}/${chapters.length})`,
        );

        const form = new FormData();
        form.append(
          'file',
          new Blob([new Uint8Array(mdBuffer)], { type: 'text/markdown' }),
          filename.toLowerCase().endsWith('.md') ? filename : `${filename}.md`,
        );
        // FORCE: re-index content the spine has already seen.
        //
        // The spine is idempotent by content hash — an upload whose bytes match
        // the previous run returns `skipped_unchanged` and writes nothing. That
        // is right for a repeated upload and WRONG for a re-embed, because the
        // thing that changed is the PIPELINE, not the file. Without this flag a
        // re-embed of unchanged markdown was a guaranteed no-op: it reported
        // success, rebuilt the chunk mapping from the rows already there, and
        // left the old chunks in place. That is how a chapter stayed at one
        // chunk per page after the chunker was fixed.
        //
        // NOTE: force also bypasses the spine's validation_status gate, so a
        // file that is not APPROVED would be indexed. Only ever set from an
        // explicit operator re-embed, never from the ordinary ingest path.
        if (force) {
          form.append('force', 'true');
          form.append(
            'forceReason',
            'Book Buddy re-embed: re-index under the current chunker',
          );
        }
        form.append('bookTitle', book.title);
        form.append('sourceApp', 'bookbuddy');
        form.append('sourceLocalId', bookId);
        // Which chapter this is. Sending it explicitly means the slot a file
        // lands in is the slot Book Buddy filed it under, so the two cannot drift.
        //
        // Only when we actually know it. Rows that predate per-chapter uploads
        // were backfilled to 0 by the migration — a real value for a PDF, but
        // for markdown it means "unrecorded", and 0 is reserved for whole-work
        // renditions so DCP would refuse it outright. Omitting it lets DCP fall
        // back to the file's own chapter_number, which is where the number came
        // from in the first place, so legacy rows ingest correctly instead of
        // needing to be re-uploaded by hand.
        if (part >= 1) form.append('partIndex', String(part));
        // The spine keys work identity on (isbn, edition). Book Buddy holds the ISBN
        // on the Book row and the chapter markdown may not repeat it, so send
        // ours — without it the same book ingested twice becomes two canonical
        // works, and neither looks wrong. DCP refuses if this and the
        // frontmatter disagree.
        if (book.isbn) form.append('isbn', book.isbn);
        form.append('book', book.title);

        let response: Response;
        try {
          response = await fetch(ingestUrl, {
            method: 'POST',
            headers: { 'X-Trio-Service-Secret': serviceSecret },
            body: form,
            signal: AbortSignal.timeout(10 * 60 * 1000), // embedding a long chapter
          });
        } catch (netErr: any) {
          outcomes.push({
            part,
            ok: false,
            chunks: 0,
            detail: `request failed: ${netErr.message}`,
          });
          continue;
        }

        const bodyText = await response.text().catch(() => '');
        let parsed: any = {};
        try {
          parsed = bodyText ? JSON.parse(bodyText) : {};
        } catch {
          /* keep raw */
        }

        if (!response.ok || !parsed.success) {
          // The message is the useful part — DCP refuses with a reason a human
          // can act on (not APPROVED, no chapter number, ISBN mismatch), and
          // collapsing that into "ingest failed" is what makes an operator
          // re-upload a file that was never the problem.
          outcomes.push({
            part,
            ok: false,
            chunks: 0,
            detail:
              parsed.error ||
              `HTTP ${response.status} ${bodyText.slice(0, 200)}`,
          });
          continue;
        }

        contentItemId = parsed.contentItemId ?? contentItemId;
        outcomes.push({ part, ok: true, chunks: parsed.chunksIndexed ?? 0 });
        await job.updateProgress(
          20 + Math.round(((i + 1) / chapters.length) * 65),
        );
      }

      const failed = outcomes.filter((o) => !o.ok);
      const succeeded = outcomes.filter((o) => o.ok);
      const totalChunks = succeeded.reduce((a, o) => a + o.chunks, 0);

      if (succeeded.length === 0) {
        throw new Error(
          `No chapter could be ingested. ` +
            failed.map((f) => `ch${f.part}: ${f.detail}`).join(' | '),
        );
      }
      if (failed.length > 0) {
        // Deliberately NOT marked READY. A book missing half its chapters still
        // answers confidently from the half it has, and neither the tutor nor
        // the student can tell the rest is absent — a partial index is the kind
        // of wrong that looks exactly like right.
        const detail =
          `${succeeded.length}/${chapters.length} chapters indexed; failed — ` +
          failed.map((f) => `ch${f.part}: ${f.detail}`).join(' | ');
        this.logger.error(`⚠️ Partial ingest for book ${bookId}: ${detail}`);
        await this.prisma.bookEmbeddingStatus.update({
          where: { bookId },
          data: {
            status: 'FAILED',
            errorMessage: detail,
            totalChunks,
            embeddedChunks: totalChunks,
          },
        });
        await this.prisma.book.update({
          where: { id: bookId },
          data: { embeddingStatus: 'FAILED' },
        });
        this.contentSpine.invalidate(bookId);
        if (contentItemId) {
          await Promise.resolve()
            .then(() => this.rebuildChunkMapping(bookId, this.contentSpine.sharedIndex(contentItemId!)))
            .catch((e) => this.logger.error(`Chunk-mapping rebuild failed: ${e.message}`));
        }
        throw new Error(detail);
      }

      await job.updateProgress(90);
      const result = { contentItemId, chunksIndexed: totalChunks };

      this.logger.log(
        `✅ Book "${book.title}" (${bookId}) ingested via DCP — content_item_id=${result.contentItemId}, chunks=${result.chunksIndexed}`,
      );

      // The book now HAS a canonical work. A negative resolution cached before
      // this moment would keep book-chat refusing for the rest of the TTL, on a
      // book that is demonstrably ready — so drop it now rather than wait it out.
      this.contentSpine.invalidate(bookId);

      // ── Step 3b: Rebuild the local chunk mapping ─────────────────────
      // Citations, the chapter list, Chapter Recap and the adaptation features
      // all read this table. It is NOT fatal if it fails: the chapter is
      // indexed and the chat works without it, so failing the whole job here
      // would throw away a completed ingest over a derived index. It is logged
      // loudly instead, and the next ingest of this book rebuilds it.
      let mappedChunks = 0;
      if (result.contentItemId) {
        try {
          mappedChunks = await this.rebuildChunkMapping(
            bookId,
            this.contentSpine.sharedIndex(result.contentItemId),
          );
          this.logger.log(
            `🔗 Chunk mapping rebuilt for book ${bookId}: ${mappedChunks} row(s)`,
          );
        } catch (mapErr: any) {
          this.logger.error(
            `Chunk mapping rebuild FAILED for book ${bookId}: ${mapErr.message}. The chapter is ` +
              `indexed and chat works, but citation links, the chapter list and Chapter Recap ` +
              `will not resolve until this is rebuilt.`,
          );
        }
      }

      // ── Step 4: Set READY ─────────────────────────────────────────────
      await this.prisma.bookEmbeddingStatus.update({
        where: { bookId },
        data: {
          status: 'READY',
          totalChunks: result.chunksIndexed ?? 0,
          embeddedChunks: result.chunksIndexed ?? 0,
        },
      });

      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          embeddingStatus: 'READY',
          vectorCollectionId: sharedIndexConfig()?.collection ?? null,
          // Recorded from DigiClassroom's answer, so later lookups need no shared database.
          ...(result.contentItemId ? { spineContentItemId: result.contentItemId } : {}),
        },
      });

      await job.updateProgress(100);

      // ── Step 5: pre-generate the entity graph, chapter by chapter ─────
      // Stage 2 makes the reader a VIEWER of pre-generated per-chapter maps, so
      // the graph must exist by the time a student opens the Map tab — it is no
      // longer built on demand. Enqueue a chapter-wise build (no page scope ⇒
      // extractAllChapters) on the dedicated graph queue, which runs after this
      // ingestion job. Non-fatal to ingestion: it is a separate job, so an
      // extraction failure never fails the ingest, and the book stays fully
      // searchable/chattable meanwhile. Idempotent per book (jobId dedup).
      await this.graphQueue.add(
        'extract-graph',
        { bookId },
        {
          jobId: `graph-ingest-${bookId}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      this.logger.log(
        `Enqueued chapter-wise graph pre-generation for "${book.title}" (${bookId})`,
      );

      const elapsedMs = Date.now() - startTime;
      this.logger.log(
        `✅ trio-ingest proxy complete for "${book.title}" (${bookId}) in ${(elapsedMs / 1000).toFixed(1)}s`,
      );
    } catch (err: any) {
      this.logger.error(`❌ Ingestion failed for ${bookId}: ${err.message}`);

      await this.prisma.bookEmbeddingStatus.upsert({
        where: { bookId },
        create: { bookId, status: 'FAILED', errorMessage: err.message },
        update: { status: 'FAILED', errorMessage: err.message },
      });
      await this.prisma.book.update({
        where: { id: bookId },
        data: { embeddingStatus: 'FAILED' },
      });

      throw err; // BullMQ will retry with backoff
    }
  }
}
