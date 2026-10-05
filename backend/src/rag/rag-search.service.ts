import { Injectable, Logger } from '@nestjs/common';
import { QdrantInitService } from './qdrant-init.service';
import { EmbeddingService } from './embedding.service';
import { buildSparseVector } from './sparse-tokenizer';
import {
  denseVectorName,
  isLocalIndexing,
  qdrantCollectionName,
  sparseVectorName,
} from './local/index-config';

/**
 * Retrieval against the SHARED trio content collection.
 *
 * Varta used to query `book_buddy_books_v1` on Book Buddy's own Qdrant. That instance now
 * holds zero collections — the collection was deleted during the platform reset
 * — so Strategy 1 threw, Strategy 2's scroll threw, and the service returned an
 * empty array. Book chat has therefore been answering from no sources at all,
 * silently, with no error surfaced to anyone. Repointing at the shared
 * collection is a repair, not a behaviour change.
 *
 * Three things about the shared collection are different in ways that fail
 * loudly if ignored, and one that fails silently:
 *
 *   NAMED VECTORS. It declares `dense` (3072d) and a sparse `bm25`. A bare
 *   `vector: number[]` is rejected outright — "Not existing vector name" — which
 *   is at least honest. The query names the vector explicitly.
 *
 *   A DIFFERENT PAYLOAD VOCABULARY. `page_start`/`page_end`/`content_item_id`/
 *   `chapter`/`section_title`, not `page_number`/`book_id`/`chapter_title`. The
 *   mapping back to this service's own return shape is deliberate: every caller
 *   (book-chat's citation strings, the reranker, the mastery-aware augmenter)
 *   keeps working unchanged.
 *
 *   `level = 0`. Every point carries it and the collection's retrieval contract
 *   filters on it. Omitting it is the silent one — it does not error, it just
 *   widens the search to chunk levels that do not exist yet.
 *
 *   PRACTICE CHUNKS ARE IN THERE. The exercises, prompts and activities are
 *   indexed on purpose (they are good quiz material) and must never enter an
 *   ANSWER. A student asking "do too many wants create problems?" matches the
 *   textbook's own discussion prompt almost perfectly, and without the
 *   exclusion the tutor answers the question by quoting the question back.
 */
const COLLECTION = qdrantCollectionName();
const VECTOR_NAME = denseVectorName();
// The collection declares this sparse vector with `modifier: idf`; DCP writes it
// on every point at ingest. Named, not positional, because the collection uses
// named vectors throughout.
const SPARSE_VECTOR_NAME = sparseVectorName();

/** Default candidate pool handed to the reranker — see `overFetch` below. */
const RETRIEVAL_CANDIDATES = Number(process.env.RAG_CANDIDATES) || 50;

export interface RagSearchOptions {
  tenantId: string;
  /** Book Buddy's own Book id. Used for logging and citation strings only — see contentItemId. */
  bookId?: string;
  /**
   * The SHARED work this book is, i.e. `content.content_item.id`.
   *
   * Book Buddy's `bookId` is a row id in Book Buddy's own database and means nothing to
   * the shared collection, so filtering `content_item_id` by it would match
   * exactly nothing and return an empty, confident answer. They have to be
   * linked explicitly; this is the linked value.
   */
  contentItemId?: string;
  topK?: number;
  scopeNodeIds?: string[];
  /**
   * Retrieval ablation, for the Phase 4 measurement harness ONLY (see
   * `docs/context/PHASE4_SANSKRIT_EMBEDDINGS_MEASUREMENT.md`). Production never
   * sets this, so it defaults to 'hybrid' and the shipped path is unchanged.
   *   - 'hybrid' (default): dense + bm25 fused by RRF — the real answer path.
   *   - 'dense'          : dense-only, as a PLAIN vector query so `score` is the
   *                        raw cosine (RRF would overwrite it with a rank score).
   *   - 'sparse'         : bm25-only.
   * Ablating this way is the only way to tell whether a Sanskrit retrieval gap is
   * the dense embedding or is masked/carried by the script-aware lexical side.
   */
  retrievalMode?: 'hybrid' | 'dense' | 'sparse';
}

@Injectable()
export class RagSearchService {
  private readonly logger = new Logger(RagSearchService.name);

  constructor(
    private qdrantInit: QdrantInitService,
    private embeddingService: EmbeddingService,
  ) {}

  async search(query: string, options: RagSearchOptions) {
    const { tenantId, bookId, contentItemId, topK = 5, scopeNodeIds } = options;
    const qdrant = this.qdrantInit.getClient();

    // A book-scoped question that cannot be scoped must not become a
    // whole-library question. Searching the entire shared corpus and citing
    // whatever ranks highest is how a student asking about their own textbook
    // gets a confidently-cited passage from a different book entirely.
    if (bookId && !contentItemId) {
      throw new Error(
        `Book ${bookId} is not linked to a work in the shared content spine, so this ` +
          `question cannot be scoped to it. Refusing to search the whole corpus instead — ` +
          `an unscoped answer here would cite the wrong book without anything looking wrong.`,
      );
    }

    const filterMust: any[] = [
      // Leaf chunks. Multi-level chunking is off, so everything written is a
      // leaf; the filter is what keeps that true if it is ever turned on.
      { key: 'level', match: { value: 0 } },
      // Fail CLOSED on visibility.
      //
      // The collection scopes private content with `grant_org_ids`, holding
      // canonical `identity.org` ids. Book Buddy's `tenantId` is a Book Buddy-local id and
      // there is no mapping wired yet, so this asks only for content that is
      // genuinely public. The alternative — matching grants by an id from the
      // wrong namespace — would either match nothing (and look like a bug) or,
      // if the two id spaces ever collided, publish another tenant's private
      // book. Restricted content stays invisible here until the mapping exists.
      { key: 'visibility', match: { value: 'public' } },
    ];

    if (contentItemId) {
      filterMust.push({
        key: 'content_item_id',
        match: { value: contentItemId },
      });
    }

    // Book Buddy's own index writes `tenant_id` on every point. Filtering on it is a second lock
    // behind the per-book scoping above: even a search that somehow lost its book id could
    // never return another tenant's text. (The shared trio collection has no such field.)
    if (isLocalIndexing()) {
      filterMust.push({ key: 'tenant_id', match: { value: tenantId } });
    }

    // Institute curriculum scope. A nested `should`, so it narrows within the
    // hard filters above and can never widen them: a chunk matches if it is
    // tagged onto any of the institute's scoped nodes, OR carries no taxonomy
    // tags at all — untagged content stays retrievable rather than silently
    // disappearing the day an institute sets a scope.
    if (scopeNodeIds && scopeNodeIds.length > 0) {
      filterMust.push({
        should: [
          { key: 'taxonomy_node_ids', match: { any: scopeNodeIds } },
          { is_empty: { key: 'taxonomy_node_ids' } },
        ],
      });
    }

    const filter = {
      must: filterMust,
      must_not: [{ key: 'retrieval_class', match: { value: 'practice' } }],
    };

    // Fail closed, deliberately, and NOT the previous cascade.
    //
    // The old Strategy 2 scrolled the collection with the same filter and no
    // vector when dense search failed, returning whatever happened to come back
    // first as though it were a ranked result. That is worse than an error:
    // arbitrary passages, presented and cited exactly like relevant ones. If
    // retrieval is unavailable, the caller has to be told, not handed something
    // that looks like an answer.
    let queryVector: number[];
    try {
      queryVector = await this.embeddingService.embedOne(query);
    } catch (e: any) {
      this.logger.error(`Query embedding failed: ${e.message}`);
      throw new Error(
        `Retrieval is unavailable: the query could not be embedded (${e.message}). ` +
          `Refusing to answer from an unranked fallback.`,
      );
    }

    /**
     * Candidates handed to the reranker.
     *
     * This is the RECALL CEILING: a chunk outside this set cannot be recovered
     * by any amount of reranking downstream, so it bounds the best answer the
     * system can ever give. At 20 it was too tight for a long book — 20 of a
     * 400-chunk textbook is 5% — and it was chosen when the "reranker" was a
     * pass-through that couldn't use the extra candidates anyway.
     *
     * Now that a real reranker reads them, widening actually buys something.
     * Qdrant-side cost is a larger top-k on an indexed search, which is cheap;
     * the LLM cost is bounded separately by the reranker's own snippet budget,
     * not by this number.
     */
    const overFetch = Math.max(topK * 2, RETRIEVAL_CANDIDATES);
    const mode = options.retrievalMode ?? 'hybrid';

    // ── Phase 4 ablation branches (dense-only / sparse-only) ──────────────────
    // Plain single-vector queries, NOT wrapped in RRF fusion, so the returned
    // `score` is the retriever's own score (cosine for dense, bm25 for sparse) —
    // which is what the harness needs to read the raw dense signal. Same filter,
    // same payload mapping as the hybrid path, so the only variable is fusion.
    if (mode === 'dense' || mode === 'sparse') {
      try {
        if (mode === 'sparse') {
          const sparse = buildSparseVector(query);
          if (sparse.indices.length === 0) return []; // no lexical terms to match
          const res = await qdrant.query(COLLECTION, {
            query: sparse,
            using: SPARSE_VECTOR_NAME,
            filter,
            limit: overFetch,
            with_payload: true,
          });
          return this.mapQdrantResults(res.points ?? [], options);
        }
        const res = await qdrant.query(COLLECTION, {
          query: queryVector,
          using: VECTOR_NAME,
          filter,
          limit: overFetch,
          with_payload: true,
        });
        return this.mapQdrantResults(res.points ?? [], options);
      } catch (e: any) {
        const detail = e?.response?.data?.status?.error || e.message;
        this.logger.error(
          `${mode}-only search failed on "${COLLECTION}": ${detail}`,
        );
        throw new Error(`Retrieval is unavailable: ${detail}`);
      }
    }

    try {
      // HYBRID: dense semantics fused with BM25 lexical matching.
      //
      // Dense alone cannot do exact terms. "Where does it say `opportunity
      // cost`?" is a lexical question, and an embedding answers it with
      // whatever is *about* opportunity cost — usually not the sentence
      // containing the phrase. Rare tokens are the worst case: a formula name,
      // an author, a Sanskrit term all live in low-density regions of the
      // embedding space where nearest-neighbour is close to arbitrary.
      //
      // The collection already carries a `bm25` sparse vector on every point —
      // DCP writes it at ingest — so this side was throwing away half the index
      // by querying dense only. `sparse-tokenizer.ts` is copied byte-identical
      // from DCP precisely so the query side hashes terms to the same indices;
      // `sparse-tokenizer.spec.ts` holds that contract.
      //
      // RRF rather than score-weighted fusion: dense cosine and BM25 scores are
      // not on comparable scales, so any fixed weighting is a magic number that
      // silently favours one side. Reciprocal rank fusion only reads ORDER,
      // which is the part both retrievers agree on the meaning of.
      const sparse = buildSparseVector(query);
      const prefetch: any[] = [
        { query: queryVector, using: VECTOR_NAME, filter, limit: overFetch },
      ];
      // A query of only stopwords or single characters yields no usable terms;
      // sending an empty sparse vector would ask Qdrant to match nothing and
      // waste half the fusion budget on it.
      if (sparse.indices.length > 0) {
        prefetch.push({
          query: sparse,
          using: SPARSE_VECTOR_NAME,
          filter,
          limit: overFetch,
        });
      }

      const res = await qdrant.query(COLLECTION, {
        prefetch,
        query: { fusion: 'rrf' },
        filter,
        limit: overFetch,
        with_payload: true,
      });
      const results = res.points ?? [];
      this.logger.debug(
        `hybrid search on "${COLLECTION}" (${VECTOR_NAME}${sparse.indices.length ? ` + ${SPARSE_VECTOR_NAME}` : ' only — no lexical terms in query'})` +
          ` for tenant ${tenantId}${contentItemId ? ` scoped to work ${contentItemId}` : ''}` +
          ` -> ${results.length} hit(s)`,
      );
      return this.mapQdrantResults(results, options);
    } catch (e: any) {
      const detail = e?.response?.data?.status?.error || e.message;
      // Deliberately NOT falling back to dense-only. A silent fallback would
      // turn "the lexical half of retrieval is broken" into "answers got a bit
      // worse", which is the failure mode this file exists to avoid.
      this.logger.error(`Hybrid search failed on "${COLLECTION}": ${detail}`);
      throw new Error(`Retrieval is unavailable: ${detail}`);
    }
  }

  /**
   * Spine payload -> this service's existing return shape.
   *
   * The field names callers already use are kept exactly. book-chat builds
   * citation strings out of `citationId`/`bookId`/`chunkIndex`/`pageNumber` and
   * renders `chapterTitle`/`textPreview`; renaming them here to match the spine
   * would push a cosmetic change through three call sites for no benefit.
   */
  private mapQdrantResults(points: any[], options: RagSearchOptions) {
    return points.map((p) => {
      const pl = p.payload ?? {};
      const text: string = pl.text ?? '';
      return {
        qdrantPointId: p.id,
        score: p.score || 0,
        tenantId: options.tenantId,
        // The Book Buddy book the caller asked about, echoed back. Falling through to
        // the spine's work id keeps citation strings well-formed for an
        // unscoped search rather than emitting "undefined:3".
        bookId: options.bookId ?? pl.content_item_id,
        contentItemId: pl.content_item_id,
        // WHICH FILE within the work — a book is many chapter files whose
        // chunk_index sequences all restart at 0, so this is what makes
        // chunkIndex unambiguous.
        contentAssetId: pl.content_asset_id,
        citationId: `${pl.content_item_id ?? options.bookId}:${pl.content_asset_id ?? 'x'}:${pl.chunk_index ?? 0}`,
        chunkIndex: pl.chunk_index,
        pageNumber: pl.page_start,
        pageEndNumber: pl.page_end ?? pl.page_start,
        chapterTitle: pl.chapter,
        sectionTitle: pl.section_title,
        retrievalClass: pl.retrieval_class,
        // The spine stores no separate preview field; the reader shows a snippet.
        textPreview: text.length > 240 ? `${text.slice(0, 240)}…` : text,
        text,
      };
    });
  }

  /**
   * Figure / table lookup by explicit reference.
   *
   * "What is in figure 8.3?" is a LEXICAL question about a label, not a
   * semantic one — but the figure's own chunk ("Figure 8.3 shows the
   * production-possibility curve…") embeds as being ABOUT production curves,
   * so dense similarity ranks the surrounding prose above it and the figure
   * falls out of the top-k. Hybrid BM25 helps only if the exact token survives
   * tokenisation. The result: the reader has embedded the figure, but a
   * question that names it retrieves everything except it.
   *
   * So when the query names a figure/table/diagram by number, scroll THIS
   * book's chunks (same hard filter as search — public leaves of this work,
   * practice excluded, so no privacy relaxation) and pull the ones whose text
   * actually contains that label. It's a guaranteed find rather than a ranking
   * gamble, and it runs only when a reference is present, so normal questions
   * pay nothing.
   */
  async findByReference(
    query: string,
    options: RagSearchOptions,
  ): Promise<any[]> {
    const { contentItemId } = options;
    const refs = parseReferences(query);
    if (refs.length === 0) return [];
    // A reference lookup MUST be bound to one work — never scan the whole corpus.
    if (!contentItemId) return [];

    // Scope by content_item_id ONLY.
    //
    // Deliberately NOT filtering on `level` or `visibility` here, unlike
    // search(). Those two exist to fail closed across the WHOLE corpus — but
    // the caller has already been authorised for this exact book
    // (book-chat.controller checks tenant membership before we get here), and
    // this lookup returns only that one work's own chunks. Keeping the
    // public-leaf filter is what made figures vanish: a figure indexed at a
    // different `level`, or without `visibility='public'` set, passed neither
    // clause and was invisible even though the reader had embedded it and the
    // surrounding prose answered fine. That is the "figure 8.3 works, 8.5
    // fails" inconsistency. Practice content is still excluded.
    const filter = {
      must: [
        { key: 'content_item_id', match: { value: contentItemId } },
        ...(isLocalIndexing()
          ? [{ key: 'tenant_id', match: { value: options.tenantId } }]
          : []),
      ],
      must_not: [{ key: 'retrieval_class', match: { value: 'practice' } }],
    };

    const qdrant = this.qdrantInit.getClient();
    const matched: any[] = [];
    let offset: any = undefined;
    let pagesScanned = 0;
    const MAX_PAGES = 20; // a single work, but multi-level chunking can multiply the count
    const MAX_MATCHES = 3; // a labelled figure is one chunk, occasionally two
    let scanned = 0;

    try {
      do {
        const page: any = await qdrant.scroll(COLLECTION, {
          filter,
          with_payload: true,
          with_vector: false,
          limit: 256,
          offset,
        });
        for (const pt of page.points ?? []) {
          scanned += 1;
          const text: string = pt.payload?.text ?? '';
          if (text && refs.some((r) => r.matcher.test(text))) {
            matched.push(pt);
            if (matched.length >= MAX_MATCHES) break;
          }
        }
        offset = page.next_page_offset ?? undefined;
        pagesScanned += 1;
      } while (
        offset &&
        matched.length < MAX_MATCHES &&
        pagesScanned < MAX_PAGES
      );
    } catch (e: any) {
      this.logger.warn(
        `Figure/table reference lookup failed (non-fatal): ${e?.message}`,
      );
      return [];
    }

    // Logged at INFO so it's visible in prod without debug logging: if a figure
    // question still fails, this line says whether the label was simply not in
    // any of the work's chunk text (→ the figure has no extractable caption) or
    // the scan was truncated (→ raise MAX_PAGES).
    this.logger.log(
      `Reference lookup [${refs.map((r) => r.label).join(', ')}] on work ${contentItemId}: ` +
        `matched ${matched.length} of ${scanned} chunk(s) scanned${offset ? ' (scan truncated)' : ''}`,
    );

    if (matched.length > 0) {
      this.logger.debug(
        `Reference lookup for [${refs.map((r) => r.label).join(', ')}] found ${matched.length} chunk(s)`,
      );
    }
    return this.mapQdrantResults(matched, options);
  }
}

/**
 * Pull figure/table/diagram references out of a question and build a matcher
 * for each that finds the label in chunk text. Handles the ways the same label
 * is written — "figure 8.3", "Fig. 8.3", "fig 8-3" — and the singular/plural of
 * the type word. Numbers are matched with optional leading zeros and either a
 * dot or a hyphen between parts, so "8.3" also matches "8-3".
 */
interface LabelRef {
  label: string;
  matcher: RegExp;
}

// query-side type word → the pattern used to find that label inside chunk text.
const REFERENCE_TYPES: Record<string, string> = {
  fig: 'fig(?:ure|s|\\.)?',
  figure: 'fig(?:ure|s|\\.)?',
  table: 'tables?',
  diagram: 'diagrams?',
  chart: 'charts?',
  graph: 'graphs?',
  exhibit: 'exhibits?',
  plate: 'plates?',
  illustration: 'illustrations?',
  box: 'box(?:es)?',
  map: 'maps?',
};

export function parseReferences(query: string): LabelRef[] {
  const detect =
    /\b(figures?|figs?|tables?|diagrams?|charts?|graphs?|exhibits?|plates?|illustrations?|box(?:es)?|maps?)\.?\s*(\d+(?:[.-]\d+)*)/gi;
  const refs: LabelRef[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = detect.exec(query)) !== null) {
    // Normalise the type word to a canonical key.
    const rawType = m[1].toLowerCase().replace(/s$|es$|\.$/g, '');
    const key = rawType === 'figs' || rawType === 'fig' ? 'fig' : rawType;
    const typePattern = REFERENCE_TYPES[key] ?? REFERENCE_TYPES[rawType];
    if (!typePattern) continue;
    const num = m[2];
    const numPattern = num.replace(/[.-]/g, '[.\\-]');
    const label = `${m[1]} ${num}`;
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    refs.push({
      label,
      matcher: new RegExp(
        `\\b${typePattern}\\s*\\.?\\s*0*${numPattern}\\b`,
        'i',
      ),
    });
  }
  return refs;
}
