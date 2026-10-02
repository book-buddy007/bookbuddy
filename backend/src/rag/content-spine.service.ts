import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Book Buddy's read-only window into the shared `trio` content spine.
 *
 * Book Buddy owns its `Book` rows and DCP owns the spine; the two are joined by
 * `content.content_source_ref (app, local_id) -> content_item_id`, written by
 * DCP when it ingests on Book Buddy's behalf. This service resolves that join and
 * nothing else — it is deliberately read-only, connecting as
 * `book_buddy_content_reader`, which has SELECT and no more (a write attempt gets
 * `permission denied`, verified).
 *
 * Why this exists at all: Varta's retrieval filters `content_item_id`, and a
 * Book Buddy `bookId` means nothing to the shared collection. Without the translation
 * a book-scoped question either matches nothing or, worse, gets answered from
 * the whole corpus and cites a different book entirely. `rag-search.service.ts`
 * refuses rather than guess; this is what stops that refusal being permanent.
 *
 * A SEPARATE POOL from Prisma on purpose: Prisma points at the `book_buddy` database
 * and Postgres has no cross-database join, so this is a second connection to a
 * different database on the same cluster — the same shape as the entitlements
 * and taxonomy integrations.
 */
@Injectable()
export class ContentSpineService implements OnModuleDestroy {
  private readonly logger = new Logger(ContentSpineService.name);
  private pool: Pool | null = null;
  private warnedUnconfigured = false;

  /**
   * Short-lived cache. The mapping only changes when a book is (re-)ingested,
   * and a book-chat turn resolves it on every message; a cold lookup per message
   * would put a Postgres round-trip in front of every question for a value that
   * is stable for the life of the book.
   */
  private readonly cache = new Map<
    string,
    { contentItemId: string | null; at: number }
  >();
  private static readonly TTL_MS = 5 * 60 * 1000;

  private getPool(): Pool | null {
    if (this.pool) return this.pool;
    const connectionString = process.env.TRIO_CONTENT_DATABASE_URL;
    if (!connectionString) {
      if (!this.warnedUnconfigured) {
        this.warnedUnconfigured = true;
        this.logger.warn(
          'TRIO_CONTENT_DATABASE_URL is not set — book-scoped Varta chat cannot resolve which ' +
            'shared work a book is, so it will refuse rather than search the whole corpus.',
        );
      }
      return null;
    }
    // Small: this pool serves one lookup, and Book Buddy should not hold a large
    // share of the shared cluster's connections for it.
    this.pool = new Pool({
      connectionString,
      max: 3,
      idleTimeoutMillis: 30_000,
    });
    this.pool.on('error', (err) =>
      this.logger.error(`content spine pool error: ${err.message}`),
    );
    return this.pool;
  }

  /**
   * The canonical work this Book Buddy book is, or null if it was never ingested
   * into the spine.
   *
   * Null is a real answer, not an error: a book whose PDF is in the catalogue
   * but whose chapters were never ingested genuinely has no work, and the
   * caller must treat that as "cannot scope" rather than "search everything".
   */
  /**
   * The full printed page extent of a work, from the spine.
   *
   * Needed because Book Buddy's own `BookChunkMapping` holds only the chunks that
   * were vectorised — reference content — while the PDF a student reads also
   * contains the practice pages. For the one embedded book that is 183-209
   * locally against 183-213 in the spine: a four page difference, entirely at
   * the end, which is enough to make a page-count comparison disagree with the
   * file and disable page-scoped quizzing for a book where the mapping is
   * actually perfectly determined.
   *
   * `content_chunk` is readable by the reader role; `content_asset`, which
   * carries the authoritative per-file `page_count`, is not — so the extent is
   * taken from the chunks' own page bounds instead.
   */
  async getPrintedPageSpan(
    bookId: string,
  ): Promise<{ minPrinted: number; maxPrinted: number; span: number } | null> {
    const contentItemId = await this.resolveContentItemId(bookId);
    if (!contentItemId) return null;

    const pool = this.getPool();
    if (!pool) return null;

    try {
      const res = await pool.query<{
        min_printed: number;
        max_printed: number;
      }>(
        `SELECT MIN(page_start)::int AS min_printed, MAX(page_end)::int AS max_printed
           FROM content.content_chunk
          WHERE content_item_id = $1`,
        [contentItemId],
      );
      const row = res.rows[0];
      if (!row || row.min_printed == null || row.max_printed == null)
        return null;
      return {
        minPrinted: row.min_printed,
        maxPrinted: row.max_printed,
        span: row.max_printed - row.min_printed + 1,
      };
    } catch (err: any) {
      // Same fail-closed posture as resolveContentItemId: a null here makes the
      // caller refuse to map pages rather than map them wrongly.
      this.logger.error(
        `Could not read printed page span for book ${bookId}: ${err.message}`,
      );
      return null;
    }
  }

  async resolveContentItemId(bookId: string): Promise<string | null> {
    const hit = this.cache.get(bookId);
    if (hit && Date.now() - hit.at < ContentSpineService.TTL_MS)
      return hit.contentItemId;

    const pool = this.getPool();
    if (!pool) return null;

    try {
      const res = await pool.query<{ content_item_id: string }>(
        `SELECT content_item_id
           FROM content.content_source_ref
          WHERE app = 'bookbuddy' AND local_id = $1
          LIMIT 1`,
        [bookId],
      );
      const contentItemId = res.rows[0]?.content_item_id ?? null;
      this.cache.set(bookId, { contentItemId, at: Date.now() });
      return contentItemId;
    } catch (err: any) {
      // Fail CLOSED by returning null: the caller refuses a book-scoped question
      // it cannot scope. Returning "no filter" on a database hiccup would answer
      // from the whole library and cite the wrong book, which is worse than an
      // error because nothing about it looks wrong.
      this.logger.error(
        `Could not resolve content_item for book ${bookId}: ${err.message}`,
      );
      return null;
    }
  }

  /** Drop a cached mapping — call after a (re-)ingest so the next turn sees it. */
  invalidate(bookId: string): void {
    this.cache.delete(bookId);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) await this.pool.end().catch(() => undefined);
  }
}
