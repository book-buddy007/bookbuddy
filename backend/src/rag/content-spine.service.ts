import { Injectable, Logger } from '@nestjs/common';
import type { QdrantClient } from '@qdrant/js-client-rest';
import { PrismaService } from '../prisma/prisma.service';
import { QdrantInitService } from './qdrant-init.service';
import { qdrantCollectionName, sharedIndexConfig } from './local/index-config';

/** Where one book's passages live, and everything needed to read them safely. */
export interface BookIndex {
  kind: 'local' | 'shared';
  client: QdrantClient;
  collection: string;
  /** Width a question must be embedded to, to be compared with this index's vectors. */
  dimensions: number;
  /** The `content_item_id` of this book's passages in that index. */
  contentItemId: string;
  /** Book Buddy's own passages carry `tenant_id`; a search also locks on it. */
  tenantLock: boolean;
  /**
   * Conditions EVERY read of this index must include. For the shared index that is public-only:
   * nothing in it can hide a restricted passage from an app that is handed its id, so each reader
   * has to ask for public explicitly.
   */
  guard: Array<{ key: string; match: { value: string } }>;
}

/**
 * Points of a book that may be read from its index. Reads by point id carry no filter, so for the
 * shared index each point is checked to be public here; Book Buddy's own points are always readable.
 */
export function readablePoints<T extends { payload?: any }>(index: BookIndex, points: T[]): T[] {
  if (index.guard.length === 0) return points;
  return points.filter((p) => p.payload?.visibility === 'public');
}

/** The book needs the shared index and it cannot be used. Fails closed: never answers from nothing. */
export class SharedIndexUnavailableError extends Error {
  constructor(reason: string) {
    super(
      `This book is held in the shared library, which is not available right now (${reason}). ` +
        `It was not answered from anywhere else.`,
    );
    this.name = 'SharedIndexUnavailableError';
  }
}

/**
 * Which index a book lives in, and which work it is there.
 *
 * Every book is in exactly one of Book Buddy's own index or the shared index, and that is a fact
 * recorded on the book (`Book.spineContentItemId`: set = shared). It is written by the server
 * only after DigiClassroom has confirmed the work, so reading it needs no connection to any
 * other app's database.
 *
 * Fails closed throughout. A book that cannot be resolved is refused, not searched across the
 * library; a book that needs the shared index while it is down is refused, not answered from
 * Book Buddy's own (empty) index.
 */
@Injectable()
export class ContentSpineService {
  private readonly logger = new Logger(ContentSpineService.name);

  /**
   * Short-lived cache of each book's shared work id (null = Book Buddy's own index). A chat turn
   * resolves it on every message, and the value only changes when a book is indexed or linked,
   * which also calls `invalidate`.
   */
  private readonly cache = new Map<string, { work: string | null; at: number }>();
  private static readonly TTL_MS = 60 * 1000;

  constructor(
    private readonly qdrantInit: QdrantInitService,
    private readonly prisma: PrismaService,
  ) {}

  /** Book Buddy's own index, where a book's work id is the book id itself. */
  localIndex(bookId: string): BookIndex {
    return {
      kind: 'local',
      client: this.qdrantInit.getClient(),
      collection: qdrantCollectionName(),
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1024', 10),
      contentItemId: bookId,
      tenantLock: true,
      guard: [],
    };
  }

  /** The shared index, for one work in it. Throws SharedIndexUnavailableError if it cannot be used. */
  sharedIndex(contentItemId: string): BookIndex {
    const cfg = sharedIndexConfig();
    const client = this.qdrantInit.getSharedClient();
    if (!cfg || !client) {
      throw new SharedIndexUnavailableError('SHARED_QDRANT_URL is not configured');
    }
    const problem = this.qdrantInit.sharedProblem();
    if (problem) throw new SharedIndexUnavailableError(problem);
    return {
      kind: 'shared',
      client,
      collection: cfg.collection,
      dimensions: cfg.dimensions,
      contentItemId,
      tenantLock: false,
      guard: [{ key: 'visibility', match: { value: 'public' } }],
    };
  }

  /** Reads which work the book is, from the book's own record. Throws if that cannot be read. */
  private async lookup(bookId: string): Promise<{ found: boolean; work: string | null }> {
    const hit = this.cache.get(bookId);
    if (hit && Date.now() - hit.at < ContentSpineService.TTL_MS) {
      return { found: true, work: hit.work };
    }
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { spineContentItemId: true },
    });
    if (!book) return { found: false, work: null };
    this.cache.set(bookId, { work: book.spineContentItemId ?? null, at: Date.now() });
    return { found: true, work: book.spineContentItemId ?? null };
  }

  /**
   * The index this book lives in. Throws for a book that does not exist, for a record that cannot
   * be read, and (SharedIndexUnavailableError) for a shared book while the shared index is down.
   */
  async resolveIndex(bookId: string): Promise<BookIndex> {
    let found: { found: boolean; work: string | null };
    try {
      found = await this.lookup(bookId);
    } catch (err: any) {
      this.logger.error(`Could not read which index book ${bookId} lives in: ${err.message}`);
      throw new Error(`Could not tell which index book ${bookId} lives in; refusing to guess.`);
    }
    if (!found.found) throw new Error(`Book ${bookId} not found.`);
    return found.work ? this.sharedIndex(found.work) : this.localIndex(bookId);
  }

  /**
   * The id this book's passages carry in the index it lives in: the shared work id, or the book id
   * for Book Buddy's own index. Null when the book does not exist or the record cannot be read, so
   * a caller treats it as "cannot scope" rather than searching without a book.
   */
  async resolveContentItemId(bookId: string): Promise<string | null> {
    if (!bookId) return null;
    try {
      const { found, work } = await this.lookup(bookId);
      if (!found) return null;
      return work ?? bookId;
    } catch (err: any) {
      this.logger.error(`Could not resolve the work for book ${bookId}: ${err.message}`);
      return null;
    }
  }

  /**
   * The printed page extent of a book, from its own passages: the lowest and highest page any
   * passage covers. Null when the book has none, or the index cannot be read, so a caller refuses
   * to map pages rather than mapping them wrongly.
   *
   * Practice passages are included, as they are real pages of the book.
   */
  async getPrintedPageSpan(
    bookId: string,
  ): Promise<{ minPrinted: number; maxPrinted: number; span: number } | null> {
    let index: BookIndex;
    try {
      index = await this.resolveIndex(bookId);
    } catch (err: any) {
      this.logger.error(`Could not read printed page span for book ${bookId}: ${err.message}`);
      return null;
    }

    try {
      let min = Infinity;
      let max = -Infinity;
      let offset: any = undefined;
      do {
        const page: any = await index.client.scroll(index.collection, {
          filter: {
            must: [{ key: 'content_item_id', match: { value: index.contentItemId } }, ...index.guard],
          },
          with_payload: { include: ['page_start', 'page_end'] },
          with_vector: false,
          limit: 512,
          offset,
        });
        for (const pt of page.points ?? []) {
          const start = pt.payload?.page_start;
          const end = pt.payload?.page_end ?? start;
          if (Number.isFinite(start)) min = Math.min(min, start);
          if (Number.isFinite(end)) max = Math.max(max, end);
        }
        offset = page.next_page_offset ?? undefined;
      } while (offset);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
      return { minPrinted: min, maxPrinted: max, span: max - min + 1 };
    } catch (err: any) {
      this.logger.error(`Could not read printed page span for book ${bookId}: ${err.message}`);
      return null;
    }
  }

  /** Drop a cached answer. Call after a book is (re-)indexed or linked so the next turn sees it. */
  invalidate(bookId: string): void {
    this.cache.delete(bookId);
  }
}
