import { Injectable, Logger } from '@nestjs/common';
import { ContentSpineService, type BookIndex } from '../rag/content-spine.service';
import { findInBookDefinition, normalizeTerm, type BookPassage, type InBookResult } from './in-book-definition';

const CACHE_TTL_MS = 10 * 60_000;
/** Books kept in memory at once: a textbook's text is about a megabyte, so this bounds it to a few. */
const CACHE_MAX_BOOKS = 12;

/**
 * Reads a book's own passages from the index it lives in (Book Buddy's own or the shared one) and finds
 * what the book says about a term (see in-book-definition.ts).
 *
 * The whole book is read once and kept in memory for ten minutes, so the second lookup, and every one
 * after it, is a scan of memory: no vector search and no model call, which is why it can answer while the
 * student is still looking at the word. Only public, non-practice passages are read: the same ones
 * Varta may quote, so a definition can never reveal what an answer would not.
 */
@Injectable()
export class InBookService {
  private readonly logger = new Logger(InBookService.name);
  private readonly cache = new Map<string, { at: number; passages: BookPassage[] }>();
  /** One load in flight per book, so a burst of lookups reads the index once. */
  private readonly loading = new Map<string, Promise<BookPassage[]>>();

  constructor(private readonly spine: ContentSpineService) {}

  /** What the book says about `term`, or null (not used, not a term, or the book has no index yet). */
  async find(bookId: string, term: string): Promise<InBookResult | null> {
    if (!normalizeTerm(term)) return null;
    let index: BookIndex;
    try {
      index = await this.spine.resolveIndex(bookId);
    } catch (err: any) {
      // A book that is not indexed, or a shared index that is down: nothing to look in. Not an error to the student.
      this.logger.warn(`In-book lookup skipped for ${bookId}: ${err?.message ?? err}`);
      return null;
    }
    const passages = await this.passagesOf(index);
    return findInBookDefinition(passages, term);
  }

  private async passagesOf(index: BookIndex): Promise<BookPassage[]> {
    const key = `${index.collection}:${index.contentItemId}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.passages;

    let pending = this.loading.get(key);
    if (!pending) {
      pending = this.load(index).finally(() => this.loading.delete(key));
      this.loading.set(key, pending);
    }
    const passages = await pending;
    this.cache.set(key, { at: Date.now(), passages });
    if (this.cache.size > CACHE_MAX_BOOKS) {
      const oldest = [...this.cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }
    return passages;
  }

  private async load(index: BookIndex): Promise<BookPassage[]> {
    const passages: (BookPassage & { chunk: number })[] = [];
    let offset: any = undefined;
    do {
      const page: any = await index.client.scroll(index.collection, {
        filter: {
          must: [{ key: 'content_item_id', match: { value: index.contentItemId } }, ...index.guard],
          // Exercises and prompts are indexed for quizzes and never quoted as an answer; not a definition either.
          must_not: [{ key: 'retrieval_class', match: { value: 'practice' } }],
        },
        with_payload: { include: ['text', 'page_start', 'chapter', 'section_title', 'chunk_index'] },
        with_vector: false,
        limit: 256,
        offset,
      });
      for (const pt of page.points ?? []) {
        const p: any = pt.payload ?? {};
        if (typeof p.text !== 'string' || !p.text) continue;
        passages.push({
          text: p.text,
          page: Number.isFinite(p.page_start) ? p.page_start : null,
          chapter: p.chapter ?? p.section_title ?? null,
          chunk: Number.isFinite(p.chunk_index) ? p.chunk_index : 0,
        });
      }
      offset = page.next_page_offset ?? undefined;
    } while (offset);

    // Book order: a term is defined before it is used, so earlier pages win ties.
    passages.sort((a, b) => (a.page ?? Infinity) - (b.page ?? Infinity) || a.chunk - b.chunk);
    return passages.map(({ text, page, chapter }) => ({ text, page, chapter }));
  }

  /** Forget a book, e.g. after it is re-embedded. */
  invalidate(index: Pick<BookIndex, 'collection' | 'contentItemId'>): void {
    this.cache.delete(`${index.collection}:${index.contentItemId}`);
  }
}
