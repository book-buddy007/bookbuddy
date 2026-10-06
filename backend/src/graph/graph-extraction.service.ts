import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentSpineService } from '../rag/content-spine.service';
import {
  ILlmProvider,
  LLM_PROVIDER,
} from '../rag/interfaces/llm.provider.interface';
import { CommunityDetectionService } from './community-detection.service';
import { GraphEmbeddingService } from './graph-embedding.service';

// The book's chunks live in the SHARED trio collection that DigiClassroom
// writes and Varta reads (rag-search.service.ts) — not Book Buddy's old
// `book_buddy_books_v1`, which was deleted in the platform reset and holds nothing.
// Extraction pointed at the dead collection found zero chunks for every book
// and silently produced no graph ("Nothing to map yet"). This matches the
// collection every other live reader feature uses.

/** A page-range scope for extraction. Absent/empty ⇒ the whole book. */
export interface ExtractScope {
  pageStart?: number;
  pageEnd?: number;
}

interface RawChunk {
  qdrantPointId: string;
  chunkIndex: number;
  pageNumber: number | null;
  chapterTitle: string | null;
  text: string;
}

interface ExtractedEntity {
  label: string;
  type: string; // person | place | term | event | concept
  description: string;
  quote: string; // verbatim span the model claims supports this — best-effort provenance
}

interface ExtractedRelation {
  source: string;
  target: string;
  relation: string;
  quote: string;
}

interface WindowResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
}

// Drafts accumulated in memory before persistence — shared by the whole-book
// (extractForBook) and per-chapter (extractAllChapters) extraction paths.
type GraphNodeDraft = {
  label: string;
  type: string;
  description: string;
  firstPage: number | null;
  firstChapter: string | null;
};
type GraphRelationDraft = {
  sourceKey: string;
  targetKey: string;
  relation: string;
  citedPage: number | null;
  chapterTitle: string | null;
  spanStart: number | null;
  spanEnd: number | null;
  qdrantPointId: string | null;
};

const VALID_TYPES = new Set(['person', 'place', 'term', 'event', 'concept']);
const WINDOW_CHAR_BUDGET = 6000; // ~1500 tokens of source text per LLM call

// ADAPTIVE per-chapter node budget. nano over-extracts (one intro chapter
// yielded 111 nodes, over half unconnected — an unreadable hairball), so a
// chapter map is pruned to its most significant nodes. But chapters vary in
// length, so the budget is NOT a flat number: it scales with how much material
// the chapter contains — measured in extraction windows (~6k chars of source
// each), the truest proxy for content volume — then clamped so a tiny chapter
// still gets a usable map and a huge one stays legible. Graphs are regenerable,
// so these are safe to tune.
const NODES_PER_WINDOW = 8; // target meaningful nodes per ~6k chars of source
const MIN_CHAPTER_NODES = 12;
const MAX_CHAPTER_NODES = 60;

// Fraction of a chapter's (adaptive) cap reserved for the best person/place/
// event nodes, so key named entities a student should recognise (the founders,
// key places, landmark events) survive without crowding out concepts. Scales
// with the cap, and is itself clamped so tiny and huge chapters both behave.
const NON_CONCEPT_FRACTION = 0.18;

@Injectable()
export class GraphExtractionService {
  private readonly logger = new Logger(GraphExtractionService.name);

  constructor(
    private prisma: PrismaService,
    private contentSpine: ContentSpineService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
    private communityDetection: CommunityDetectionService,
    private graphEmbedding: GraphEmbeddingService,
  ) {}

  /**
   * Builds the book's graph. With a `scope`, only chunks overlapping that page
   * range are read — the reader asks for a section, not the whole book, so a
   * 400-page book doesn't turn into hundreds of LLM windows. Persist replaces,
   * so the stored graph is always the last range the reader asked for, and
   * Map/Entities/Throughlines all reflect it without a per-request filter.
   */
  async extractForBook(bookId: string, scope?: ExtractScope): Promise<void> {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      this.logger.warn(`Book ${bookId} not found — skipping graph extraction.`);
      return;
    }

    const scopeLabel =
      scope?.pageStart != null
        ? ` (pages ${scope.pageStart}–${scope.pageEnd ?? scope.pageStart})`
        : '';
    const chunks = await this.fetchOrderedChunks(bookId, scope);
    if (chunks.length === 0) {
      this.logger.warn(
        `No chunks for book ${bookId}${scopeLabel} — skipping graph extraction.`,
      );
      return;
    }

    const { nodeByKey, rawRelations } = await this.extractFromChunks(
      chunks,
      book.title,
      scopeLabel,
    );
    if (nodeByKey.size === 0) {
      this.logger.warn(
        `No entities extracted for book ${bookId}${scopeLabel} — nothing to persist.`,
      );
      return;
    }

    await this.persist(bookId, nodeByKey, rawRelations);
    await this.communityDetection.buildCommunities(bookId);

    // Embed the freshly persisted nodes for semantic search. Non-fatal, like
    // the whole extraction step is to ingestion: if embedding fails (provider
    // down, rate-limited), the graph is still fully usable and the lazy
    // backfill in GraphEmbeddingService.ensureEmbedded retries on first search.
    try {
      const embedded = await this.graphEmbedding.embedBook(bookId);
      this.logger.log(`Embedded ${embedded} node(s) for semantic search`);
    } catch (err: any) {
      this.logger.warn(
        `Node embedding failed (non-fatal, will backfill on search): ${err.message}`,
      );
    }

    this.logger.log(
      `✅ Graph extraction complete for "${book.title}": ${nodeByKey.size} nodes, ${rawRelations.length} edges`,
    );
  }

  /**
   * Pre-generate the book's graph CHAPTER BY CHAPTER, accumulating rather than
   * replacing. Each chapter is extracted from its own chunks and stored tagged
   * to that chapter, so the Graph tab shows a self-contained map per chapter
   * (hierarchy from Chapter 1) with no whole-book combine. This is the
   * publish-time / admin path; readers no longer trigger extraction.
   *
   * It is a full rebuild: the book's existing graph is cleared once up front so
   * no stale nodes from an earlier whole-book (replace) build survive, then each
   * chapter is built independently. Communities and node embeddings are rebuilt
   * once at the end, over the whole accumulated graph. An empty chapter (a bad
   * LLM run, or genuinely thin content) is left empty rather than aborting the
   * rest — the other chapters still get their graphs.
   */
  async extractAllChapters(bookId: string): Promise<void> {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      this.logger.warn(
        `Book ${bookId} not found — skipping chapter graph extraction.`,
      );
      return;
    }

    const chunks = await this.fetchOrderedChunks(bookId); // whole book, no scope
    if (chunks.length === 0) {
      this.logger.warn(
        `No chunks for book ${bookId} — skipping chapter graph extraction.`,
      );
      return;
    }

    // Group chunks by chapter, ordered by first appearance (page, then chunk index).
    const byChapter = new Map<string, RawChunk[]>();
    for (const c of chunks) {
      const key = (c.chapterTitle ?? '').trim() || '(unattributed)';
      const arr = byChapter.get(key);
      if (arr) arr.push(c);
      else byChapter.set(key, [c]);
    }
    const firstPage = (cs: RawChunk[]) =>
      Math.min(
        ...cs.map((c) =>
          c.pageNumber != null ? c.pageNumber : Number.MAX_SAFE_INTEGER,
        ),
      );
    const chapters = [...byChapter.entries()].sort(
      (a, b) =>
        firstPage(a[1]) - firstPage(b[1]) ||
        a[1][0].chunkIndex - b[1][0].chunkIndex,
    );

    this.logger.log(
      `Chapter-wise graph build for "${book.title}": ${chapters.length} chapter(s)`,
    );

    // Clean slate — clear any prior whole-book graph so no orphan nodes remain
    // from a build made before this path existed.
    await this.prisma.graphCommunity.deleteMany({ where: { bookId } });
    await this.prisma.graphNode.deleteMany({ where: { bookId } });

    let totalNodes = 0;
    let totalEdges = 0;
    let built = 0;
    for (const [chapterTitle, chapterChunks] of chapters) {
      const { nodeByKey, rawRelations } = await this.extractFromChunks(
        chapterChunks,
        book.title,
        ` [${chapterTitle}]`,
      );
      if (nodeByKey.size === 0) {
        this.logger.warn(
          `No entities for chapter "${chapterTitle}" of ${bookId} — leaving it empty.`,
        );
        continue;
      }
      const cap = this.chapterCap(chapterChunks);
      const capped = this.capChapterGraph(nodeByKey, rawRelations, cap);
      if (capped.nodeByKey.size < nodeByKey.size) {
        this.logger.log(
          `Pruned "${chapterTitle}": ${nodeByKey.size} → ${capped.nodeByKey.size} nodes (adaptive cap ${cap})`,
        );
      }
      await this.persistChapter(
        bookId,
        chapterTitle,
        capped.nodeByKey,
        capped.rawRelations,
      );
      totalNodes += capped.nodeByKey.size;
      totalEdges += capped.rawRelations.length;
      built += 1;
    }

    if (built === 0) {
      this.logger.warn(`No chapter produced a graph for book ${bookId}.`);
      return;
    }

    await this.communityDetection.buildCommunities(bookId);
    try {
      const embedded = await this.graphEmbedding.embedBook(bookId);
      this.logger.log(`Embedded ${embedded} node(s) for semantic search`);
    } catch (err: any) {
      this.logger.warn(
        `Node embedding failed (non-fatal, will backfill on search): ${err.message}`,
      );
    }

    this.logger.log(
      `✅ Chapter-wise graph complete for "${book.title}": ${built} chapter(s), ${totalNodes} nodes, ${totalEdges} edges`,
    );
  }

  /**
   * Adaptive node budget for one chapter. Chapters vary in length, so the budget
   * scales with content volume — measured in extraction windows (≈ source text /
   * WINDOW_CHAR_BUDGET), the truest proxy for how much a chapter teaches — then
   * clamped to [MIN,MAX] so a 2-page chapter still gets a usable map and a
   * 20-page one stays legible. Never a flat number.
   */
  private chapterCap(chunks: RawChunk[]): number {
    const chars = chunks.reduce((n, c) => n + c.text.length, 0);
    const windows = Math.max(1, Math.ceil(chars / WINDOW_CHAR_BUDGET));
    const target = Math.round(NODES_PER_WINDOW * windows);
    return Math.min(MAX_CHAPTER_NODES, Math.max(MIN_CHAPTER_NODES, target));
  }

  /**
   * Prune a chapter's draft graph to its most significant nodes, so a chapter
   * map is a legible concept map rather than a hairball (nano over-extracts —
   * over half the raw nodes are typically isolated one-offs).
   *
   * Two-part selection, for the best student-facing quality:
   *  1. Reserve a fraction of the cap (NON_CONCEPT_FRACTION) for the best
   *     person/place/event nodes (ranked by connectivity, then description
   *     richness), so the key named entities a student should recognise always
   *     survive and are not crowded out by concepts. The quota scales with cap.
   *  2. Fill the remaining slots with the highest-scoring nodes of any type —
   *     score is edge degree plus a bonus for concept/term (the learnable ideas
   *     quiz/mastery link to), so well-connected concepts win and isolated
   *     trivia is dropped.
   * Edges to a pruned node are dropped with it. A no-op when already under cap.
   */
  private capChapterGraph(
    nodeByKey: Map<string, GraphNodeDraft>,
    rawRelations: GraphRelationDraft[],
    cap: number,
  ): {
    nodeByKey: Map<string, GraphNodeDraft>;
    rawRelations: GraphRelationDraft[];
  } {
    if (nodeByKey.size <= cap) return { nodeByKey, rawRelations };

    const degree = new Map<string, number>();
    for (const r of rawRelations) {
      degree.set(r.sourceKey, (degree.get(r.sourceKey) ?? 0) + 1);
      degree.set(r.targetKey, (degree.get(r.targetKey) ?? 0) + 1);
    }
    const deg = (k: string) => degree.get(k) ?? 0;
    const descLen = (k: string) => nodeByKey.get(k)!.description.length;
    const isConcept = (k: string) => {
      const t = nodeByKey.get(k)!.type;
      return t === 'concept' || t === 'term';
    };

    // 1. Reserve the best person/place/event nodes — a fraction of the cap, so
    //    the quota scales with the chapter's size too (min 2, max 10).
    const quota = Math.min(
      10,
      Math.max(2, Math.round(cap * NON_CONCEPT_FRACTION)),
    );
    const kept = new Set(
      [...nodeByKey.keys()]
        .filter((k) => !isConcept(k))
        .sort((a, b) => deg(b) - deg(a) || descLen(b) - descLen(a))
        .slice(0, Math.min(quota, cap)),
    );

    // 2. Fill the rest by score (concept/term bonus), skipping the reserved.
    const score = (k: string) => deg(k) + (isConcept(k) ? 2 : 0);
    for (const k of [...nodeByKey.keys()]
      .filter((k) => !kept.has(k))
      .sort((a, b) => score(b) - score(a) || descLen(b) - descLen(a))) {
      if (kept.size >= cap) break;
      kept.add(k);
    }

    const prunedNodes = new Map([...nodeByKey].filter(([k]) => kept.has(k)));
    const prunedRels = rawRelations.filter(
      (r) => kept.has(r.sourceKey) && kept.has(r.targetKey),
    );
    return { nodeByKey: prunedNodes, rawRelations: prunedRels };
  }

  /**
   * Run the LLM extraction over a set of chunks and accumulate a merged
   * node/relation draft. Shared by the whole-book/scoped path (extractForBook)
   * and the per-chapter path (extractAllChapters). Nodes are merged on
   * (label, type); a bad window is skipped rather than failing the batch.
   */
  private async extractFromChunks(
    chunks: RawChunk[],
    bookTitle: string,
    scopeLabel = '',
  ): Promise<{
    nodeByKey: Map<string, GraphNodeDraft>;
    rawRelations: GraphRelationDraft[];
  }> {
    const windows = this.buildWindows(chunks);
    this.logger.log(
      `Extracting entity graph for "${bookTitle}"${scopeLabel} — ${windows.length} window(s)`,
    );

    const nodeByKey = new Map<string, GraphNodeDraft>();
    const rawRelations: GraphRelationDraft[] = [];

    for (const window of windows) {
      let result: WindowResult;
      try {
        result = await this.extractWindow(window.text, bookTitle);
      } catch (err: any) {
        // One bad window shouldn't fail the whole batch — skip and keep going.
        this.logger.warn(`Window extraction failed, skipping: ${err.message}`);
        continue;
      }

      for (const entity of result.entities) {
        if (!VALID_TYPES.has(entity.type)) continue;
        // LLM output can omit label/description; skip a label-less entity rather
        // than crash on `.trim()` or index the graph with an empty-key node.
        if (typeof entity.label !== 'string' || !entity.label.trim()) continue;
        const description =
          typeof entity.description === 'string' ? entity.description : '';
        const key = this.entityKey(entity.label, entity.type);
        const provenance = this.resolveSpan(window, entity.quote);
        const existing = nodeByKey.get(key);
        if (existing) {
          // Keep the earliest page as firstPage (and that page's chapter);
          // keep the longer description.
          if (
            provenance.pageNumber != null &&
            (existing.firstPage == null ||
              provenance.pageNumber < existing.firstPage)
          ) {
            existing.firstPage = provenance.pageNumber;
            existing.firstChapter = provenance.chapterTitle;
          }
          if (description.length > existing.description.length) {
            existing.description = description;
          }
        } else {
          nodeByKey.set(key, {
            label: entity.label.trim(),
            type: entity.type,
            description: description.trim(),
            firstPage: provenance.pageNumber,
            firstChapter: provenance.chapterTitle,
          });
        }
      }

      for (const rel of result.relations) {
        // LLM output can omit an endpoint or the relation verb; skip rather than
        // crash on `.trim()` (entityKey → canonicalLabel, and rel.relation below).
        if (
          typeof rel.source !== 'string' ||
          typeof rel.target !== 'string' ||
          typeof rel.relation !== 'string'
        )
          continue;
        const sourceKey = this.entityKey(rel.source, undefined, nodeByKey);
        const targetKey = this.entityKey(rel.target, undefined, nodeByKey);
        if (!sourceKey || !targetKey || sourceKey === targetKey) continue; // dangling or self-referential
        const provenance = this.resolveSpan(window, rel.quote);
        rawRelations.push({
          sourceKey,
          targetKey,
          relation: rel.relation.trim(),
          citedPage: provenance.pageNumber,
          chapterTitle: provenance.chapterTitle,
          spanStart: provenance.spanStart,
          spanEnd: provenance.spanEnd,
          qdrantPointId: provenance.qdrantPointId,
        });
      }
    }

    return { nodeByKey, rawRelations };
  }

  // ── Chunk fetching ──────────────────────────────────────────────────

  /**
   * Fetches the book's chunks from the shared trio collection, keyed by the
   * spine's `content_item_id` — Book Buddy's own `bookId` means nothing to that
   * collection, so filtering on it (as this used to) matched exactly nothing.
   * Mirrors ingestion.processor.rebuildChunkMapping: scroll every point of the
   * work, read the shared payload vocabulary (`text`, `page_start`, `chapter`/
   * `section_title`, `chunk_index`) rather than the old `page_number`/`book_id`
   * names. `with_vector: false` — extraction needs the text, not the vector, so
   * the named-vector shape of the collection is irrelevant here.
   *
   * Practice chunks are left in: they are real positions in the book and good
   * entity material. (rag-search excludes them from ANSWERS, a different concern.)
   */
  private async fetchOrderedChunks(
    bookId: string,
    scope?: ExtractScope,
  ): Promise<RawChunk[]> {
    let index;
    try {
      index = await this.contentSpine.resolveIndex(bookId);
    } catch (err: any) {
      this.logger.warn(`Cannot locate the passages of book ${bookId} (${err.message}). Skipping graph extraction.`);
      return [];
    }
    const contentItemId = index.contentItemId;
    if (!contentItemId) {
      this.logger.warn(
        `No content_item_id for book ${bookId} — it is not linked to the shared spine, so its ` +
          `chunks cannot be located. Skipping graph extraction.`,
      );
      return [];
    }

    const qdrant = index.client;
    const points: any[] = [];
    let offset: string | number | undefined = undefined;

    do {
      const page: any = await qdrant.scroll(index.collection, {
        filter: {
          must: [{ key: 'content_item_id', match: { value: contentItemId } }, ...index.guard],
        },
        limit: 256,
        offset,
        with_payload: true,
        with_vector: false,
      });
      points.push(...(page.points ?? []));
      offset = page.next_page_offset ?? undefined;
    } while (offset !== undefined && offset !== null);

    // Page-range scoping. Every point carries page_start / page_end; a chunk is
    // in scope if its page span overlaps the requested range. A chunk with no
    // page metadata can't be placed, so it's excluded from a scoped build (but
    // kept for a whole-book build, where there's no range to fail).
    const pageStart = scope?.pageStart;
    const pageEnd = scope?.pageEnd ?? scope?.pageStart;
    const inScope = (p: any): boolean => {
      if (pageStart == null) return true;
      const ps = Number.isFinite(p.payload?.page_start)
        ? p.payload.page_start
        : null;
      if (ps == null) return false;
      const pe = Number.isFinite(p.payload?.page_end) ? p.payload.page_end : ps;
      return ps <= (pageEnd as number) && pe >= pageStart;
    };

    return points
      .filter(inScope)
      .map((p) => ({
        qdrantPointId: String(p.id),
        chunkIndex: Number.isFinite(p.payload?.chunk_index)
          ? p.payload.chunk_index
          : 0,
        pageNumber: Number.isFinite(p.payload?.page_start)
          ? p.payload.page_start
          : null,
        chapterTitle: p.payload?.chapter ?? p.payload?.section_title ?? null,
        text: typeof p.payload?.text === 'string' ? p.payload.text : '',
      }))
      .filter((c) => c.text.length > 0)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  // ── Windowing ────────────────────────────────────────────────────────

  private buildWindows(
    chunks: RawChunk[],
  ): { text: string; chunks: RawChunk[] }[] {
    const windows: { text: string; chunks: RawChunk[] }[] = [];
    let current: RawChunk[] = [];
    let currentLen = 0;

    for (const chunk of chunks) {
      if (
        currentLen + chunk.text.length > WINDOW_CHAR_BUDGET &&
        current.length > 0
      ) {
        windows.push({
          text: current.map((c) => c.text).join('\n\n'),
          chunks: current,
        });
        current = [];
        currentLen = 0;
      }
      current.push(chunk);
      currentLen += chunk.text.length;
    }
    if (current.length > 0) {
      windows.push({
        text: current.map((c) => c.text).join('\n\n'),
        chunks: current,
      });
    }
    return windows;
  }

  // ── LLM extraction ───────────────────────────────────────────────────

  private async chatComplete(
    messages: { role: string; content: string }[],
  ): Promise<string> {
    let full = '';
    await this.llmProvider.chatStream(messages, (token) => {
      full += token;
    });
    return full;
  }

  private async extractWindow(
    text: string,
    bookTitle: string,
  ): Promise<WindowResult> {
    const systemPrompt =
      `You extract a compact concept map from a passage of the textbook "${bookTitle}", for a student studying this chapter. ` +
      `Return ONLY a JSON object, no prose, matching exactly this shape:\n` +
      `{"entities":[{"label":"...","type":"person|place|term|event|concept","description":"one sentence","quote":"a short verbatim phrase from the passage that supports this"}],` +
      `"relations":[{"source":"entity label","target":"entity label","relation":"short verb phrase","quote":"a short verbatim phrase from the passage that supports this"}]}\n` +
      `Extract ONLY the significant ideas a student must understand — the key concepts, terms, people, places and events this chapter actually teaches. Be selective, not exhaustive:\n` +
      `- EXCLUDE incidental mentions, single passing examples, section headings, and generic words (e.g. "distribution", "differences", "study").\n` +
      `- Prefer CONCEPTS and TERMS over one-off proper nouns.\n` +
      `- Use the shortest canonical name for each entity ("weathering", not "the process of weathering"), and never emit two entities for the same idea.\n` +
      `- Favour entities that connect to another via a relation; avoid isolated trivia.\n` +
      `"quote" MUST be copied verbatim from the passage — it locates the source, so paraphrasing breaks citation.`;

    const raw = await this.chatComplete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ]);

    return this.parseWindowResult(raw);
  }

  private parseWindowResult(raw: string): WindowResult {
    // Models occasionally wrap JSON in a code fence despite instructions — strip it.
    const cleaned = raw
      .trim()
      .replace(/^```json?\s*/i, '')
      .replace(/```\s*$/, '');
    try {
      const parsed = JSON.parse(cleaned);
      return {
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        relations: Array.isArray(parsed.relations) ? parsed.relations : [],
      };
    } catch {
      return { entities: [], relations: [] };
    }
  }

  // ── Provenance resolution ───────────────────────────────────────────

  /**
   * Best-effort: locate the model's quoted span inside the window text, then
   * map that offset back to the specific chunk (and its page/qdrant point) it
   * falls in. This depends on the model re-quoting text verbatim, which is
   * not guaranteed — on failure we degrade honestly to "no span, no page"
   * rather than fabricate a location.
   */
  private resolveSpan(
    window: { text: string; chunks: RawChunk[] },
    quote: string,
  ): {
    pageNumber: number | null;
    chapterTitle: string | null;
    spanStart: number | null;
    spanEnd: number | null;
    qdrantPointId: string | null;
  } {
    const fallback = {
      pageNumber: window.chunks[0]?.pageNumber ?? null,
      chapterTitle: window.chunks[0]?.chapterTitle ?? null,
      spanStart: null,
      spanEnd: null,
      qdrantPointId: null,
    };
    if (!quote || quote.length < 3) return fallback;

    const idx = window.text.indexOf(quote);
    if (idx === -1) return fallback;

    let cursor = 0;
    for (const chunk of window.chunks) {
      const chunkEnd = cursor + chunk.text.length;
      if (idx >= cursor && idx < chunkEnd + 2 /* joining "\n\n" */) {
        return {
          pageNumber: chunk.pageNumber,
          chapterTitle: chunk.chapterTitle,
          spanStart: idx - cursor,
          spanEnd: idx - cursor + quote.length,
          qdrantPointId: chunk.qdrantPointId,
        };
      }
      cursor = chunkEnd + 2;
    }
    return fallback;
  }

  /**
   * Canonical form of an entity label, used as the merge key. nano emits the
   * same idea under lexical variants — "the water cycle" / "water cycle",
   * "process of weathering" / "weathering", "Weathering." — which would
   * otherwise become separate nodes. Stripping articles, "X of" scaffolding,
   * punctuation and case collapses those onto one key. This is deliberately
   * lexical, not semantic: it does not merge different words for the same idea
   * (e.g. "weathering" vs "rock disintegration") — that needs the embedding pass.
   */
  private canonicalLabel(label: string): string {
    // Backstop: the label originates in LLM-extracted JSON, which occasionally
    // omits it (notably relation endpoints), and `.trim()` on undefined threw a
    // 500 in extraction. Callers below also skip empty labels; this makes the
    // helper safe regardless of caller.
    if (typeof label !== 'string') return '';
    return label
      .trim()
      .toLowerCase()
      .replace(/[‘’“”]/g, '') // curly quotes
      .replace(/^(the|a|an)\s+/, '') // leading article
      .replace(
        /\b(process|concept|study|theory|phenomenon|idea|notion|field)\s+of\s+/g,
        '',
      ) // "process of X" → "X"
      .replace(/[^a-z0-9/ ]+/g, ' ') // punctuation → space (keep "/" for "ecology/ecosystem")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private entityKey(label: string, type: string): string;
  private entityKey(
    label: string,
    type: undefined,
    known: Map<string, any>,
  ): string | null;
  private entityKey(
    label: string,
    type?: string,
    known?: Map<string, any>,
  ): string | null {
    const normalized = this.canonicalLabel(label);
    if (type) return `${type}::${normalized}`;
    if (!known) return null;
    // Relation endpoints only carry a label, not a type — resolve against
    // whatever type that label was already extracted under.
    for (const key of known.keys()) {
      if (key.endsWith(`::${normalized}`)) return key;
    }
    return null;
  }

  // ── Persistence ──────────────────────────────────────────────────────

  private async persist(
    bookId: string,
    nodeByKey: Map<
      string,
      {
        label: string;
        type: string;
        description: string;
        firstPage: number | null;
        firstChapter: string | null;
      }
    >,
    rawRelations: Array<{
      sourceKey: string;
      targetKey: string;
      relation: string;
      citedPage: number | null;
      chapterTitle: string | null;
      spanStart: number | null;
      spanEnd: number | null;
      qdrantPointId: string | null;
    }>,
  ) {
    // Re-extraction replaces rather than accumulates — cascades clear edges
    // and community memberships for this book automatically.
    await this.prisma.graphCommunity.deleteMany({ where: { bookId } });
    await this.prisma.graphNode.deleteMany({ where: { bookId } });

    const keyToId = new Map<string, string>();
    for (const [key, node] of nodeByKey) {
      const created = await this.prisma.graphNode.create({
        data: {
          bookId,
          type: node.type,
          label: node.label,
          description: node.description || node.label,
          firstPage: node.firstPage ?? undefined,
          firstChapter: node.firstChapter ?? undefined,
        },
        select: { id: true },
      });
      keyToId.set(key, created.id);
    }

    const edgeRows = rawRelations
      .map((r) => {
        const sourceId = keyToId.get(r.sourceKey);
        const targetId = keyToId.get(r.targetKey);
        if (!sourceId || !targetId) return null;
        return {
          bookId,
          sourceId,
          targetId,
          relation: r.relation,
          citedPage: r.citedPage ?? undefined,
          chapterTitle: r.chapterTitle ?? undefined,
          spanStart: r.spanStart ?? undefined,
          spanEnd: r.spanEnd ?? undefined,
          qdrantPointId: r.qdrantPointId ?? undefined,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (edgeRows.length > 0) {
      await this.prisma.graphEdge.createMany({ data: edgeRows });
    }
  }

  /**
   * Persist ONE chapter's nodes/edges, replacing only that chapter's prior rows
   * (not the whole book) so chapters accumulate. firstChapter/chapterTitle are
   * stamped with the chapter's canonical title, which makes the scoped delete on
   * the next rebuild exact and lets the Graph tab filter one chapter cleanly.
   *
   * Deleting a chapter's nodes cascades their edges and community memberships;
   * a chapter's edges are internal to its own nodes (both endpoints came from
   * the same chapter's chunks), so no other chapter is affected. Communities are
   * NOT rebuilt here — extractAllChapters does that once over the finished graph.
   */
  private async persistChapter(
    bookId: string,
    chapterTitle: string,
    nodeByKey: Map<string, GraphNodeDraft>,
    rawRelations: GraphRelationDraft[],
  ) {
    await this.prisma.graphNode.deleteMany({
      where: { bookId, firstChapter: chapterTitle },
    });

    const keyToId = new Map<string, string>();
    for (const [key, node] of nodeByKey) {
      const created = await this.prisma.graphNode.create({
        data: {
          bookId,
          type: node.type,
          label: node.label,
          description: node.description || node.label,
          firstPage: node.firstPage ?? undefined,
          firstChapter: chapterTitle, // canonical chapter tag for this scoped build
        },
        select: { id: true },
      });
      keyToId.set(key, created.id);
    }

    const edgeRows = rawRelations
      .map((r) => {
        const sourceId = keyToId.get(r.sourceKey);
        const targetId = keyToId.get(r.targetKey);
        if (!sourceId || !targetId) return null;
        return {
          bookId,
          sourceId,
          targetId,
          relation: r.relation,
          citedPage: r.citedPage ?? undefined,
          chapterTitle, // canonical chapter tag
          spanStart: r.spanStart ?? undefined,
          spanEnd: r.spanEnd ?? undefined,
          qdrantPointId: r.qdrantPointId ?? undefined,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (edgeRows.length > 0) {
      await this.prisma.graphEdge.createMany({ data: edgeRows });
    }
  }
}
