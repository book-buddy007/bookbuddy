import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryService } from '../quiz/mastery.service';
import { QdrantInitService } from '../rag/qdrant-init.service';
import {
  ILlmProvider,
  LLM_PROVIDER,
} from '../rag/interfaces/llm.provider.interface';
import {
  bookAnswerLanguage,
  contentLanguageDirective,
} from '../common/language/answer-language';

// Shared trio collection — same as Varta (rag-search.service.ts). Adaptation
// retrieves a paragraph's text by its trio point id (from BookChunkMapping), so
// it must read from this collection; `book_buddy_books_v1` was deleted in the reset.
const COLLECTION =
  process.env.QDRANT_COLLECTION_NAME || 'trio_content_v1_openai3072';

// Same bar §2/§7 use for "not yet mastered" — kept as one constant per
// service rather than importing across modules, since each already documents
// it as the intentional shared threshold (see mastery-retrieval.service.ts).
const WEAK_MASTERY_THRESHOLD = 0.6;

export interface AdaptiveFlag {
  paragraphId: string; // qdrantPointId
  pageNumber: number | null;
  chunkIndex: number;
  textPreview: string;
  needsSimplification: boolean;
  weakConceptLabels: string[];
}

/**
 * WHY there is nothing to simplify, which is not one state but four.
 *
 * This used to return a bare `AdaptiveFlag[]`, so every empty result looked
 * identical to the reader and the UI reported the most flattering explanation
 * for all of them: "this chapter only touches concepts you've already
 * mastered." In production that sentence was false — there is no concept graph
 * for any book (GraphNode is empty), so the true reason was that the analysis
 * has never run. Telling a student they have mastered something they have not
 * even been assessed on is worse than saying nothing.
 */
export type AdaptiveCoverage =
  /** The chapter has no ingested chunks — nothing to analyse at all. */
  | 'chapter_not_ingested'
  /** Chunks exist but no concepts were ever extracted from them (§3 never ran). */
  | 'no_concept_graph'
  /** Concepts exist, but this reader has no mastery record yet — they have not
      attempted a quiz, so there is no evidence of what they do or don't know. */
  | 'no_mastery_data'
  /** Fully analysed against this reader; `flags` is the real answer, and an
      empty `flags` here genuinely does mean nothing needs simplifying. */
  | 'ready';

export interface AdaptiveFlagsResult {
  coverage: AdaptiveCoverage;
  flags: AdaptiveFlag[];
}

/**
 * Reading Intelligence Layer §10 — concept-aware adaptive text rewriting.
 * Unlike a blanket "simplify to grade N" toggle that flattens the author's
 * voice across the whole book, this flags — and rewrites — only the specific
 * paragraphs whose §3 graph concepts the *individual* reader hasn't mastered
 * yet (§2/§4's ConceptMastery). A paragraph touching only mastered concepts,
 * or no graph concept at all, is never touched.
 */
@Injectable()
export class TextAdaptationService {
  constructor(
    private prisma: PrismaService,
    private masteryService: MasteryService,
    private qdrantInit: QdrantInitService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
  ) {}

  /**
   * One flag per ingested chunk ("paragraph") in the chapter, so the reader
   * UI can render a "simplify" affordance only where it's actually relevant.
   */
  async getAdaptiveFlags(
    bookId: string,
    chapterTitle: string,
    userId: string,
  ): Promise<AdaptiveFlagsResult> {
    const chunks = await this.prisma.bookChunkMapping.findMany({
      where: { bookId, chapterTitle },
      orderBy: { chunkIndex: 'asc' },
      select: {
        qdrantPointId: true,
        pageNumber: true,
        chunkIndex: true,
        textPreview: true,
      },
    });
    if (chunks.length === 0)
      return { coverage: 'chapter_not_ingested', flags: [] };

    const pointIds = chunks.map((c) => c.qdrantPointId);

    // Which concepts does each chunk touch? Reverse of §2's concept→chunk
    // lookup (mastery-retrieval.service.ts) — here it's chunk→concepts, via
    // the same GraphEdge.qdrantPointId provenance link.
    const edges = await this.prisma.graphEdge.findMany({
      where: { bookId, qdrantPointId: { in: pointIds } },
      select: {
        qdrantPointId: true,
        sourceId: true,
        targetId: true,
        source: { select: { label: true } },
        target: { select: { label: true } },
      },
    });
    const conceptsByChunk = new Map<string, Map<string, string>>(); // qdrantPointId -> (conceptId -> label)
    for (const e of edges) {
      if (!e.qdrantPointId) continue;
      const map = conceptsByChunk.get(e.qdrantPointId) ?? new Map();
      map.set(e.sourceId, e.source.label);
      map.set(e.targetId, e.target.label);
      conceptsByChunk.set(e.qdrantPointId, map);
    }

    // No concept was ever extracted from any chunk in this chapter, so there is
    // nothing to measure the reader against. Reporting this as "you've mastered
    // it" is the lie this type exists to prevent.
    if (conceptsByChunk.size === 0) {
      return { coverage: 'no_concept_graph', flags: [] };
    }

    const masteryVector = await this.masteryService.getMasteryVector(
      userId,
      bookId,
    );

    // A reader with no ConceptMastery rows has never been assessed on this
    // book. Every concept is unproven rather than mastered — but BKT has no
    // evidence either way, so the honest answer is "not enough information",
    // not an empty flag list dressed up as success.
    if (masteryVector.length === 0) {
      return { coverage: 'no_mastery_data', flags: [] };
    }

    const weakConceptIds = new Set(
      masteryVector
        .filter((m) => m.mastery < WEAK_MASTERY_THRESHOLD)
        .map((m) => m.conceptId),
    );

    const flags = chunks.map((c) => {
      const concepts = conceptsByChunk.get(c.qdrantPointId);
      const weakLabels: string[] = [];
      if (concepts) {
        for (const [conceptId, label] of concepts) {
          if (weakConceptIds.has(conceptId)) weakLabels.push(label);
        }
      }
      return {
        paragraphId: c.qdrantPointId,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        textPreview: c.textPreview,
        needsSimplification: weakLabels.length > 0,
        weakConceptLabels: weakLabels,
      };
    });

    return { coverage: 'ready', flags };
  }

  /**
   * On-demand rewrite of a single paragraph, cached per (paragraph,
   * targetLevel) — the rewrite doesn't depend on which specific student
   * requested it, so a second student hitting the same paragraph/level pair
   * gets the cached version instead of a second LLM call.
   */
  async simplify(
    bookId: string,
    paragraphId: string,
    targetLevel: string,
  ): Promise<{ content: string; cached: boolean }> {
    // Ownership check MUST happen before the cache lookup, not after — the
    // cache is keyed on (paragraphId, targetLevel) alone (deliberately, so
    // every student sharing a paragraph+level reuses one rewrite), so a
    // cache hit here would otherwise skip the check entirely and leak a
    // paragraph's simplified content to a caller who supplied a *different*
    // book's id than the one the paragraph actually belongs to. The
    // controller has already verified the caller has access to `bookId`
    // itself — this verifies `paragraphId` actually belongs to it.
    const mapping = await this.prisma.bookChunkMapping.findUnique({
      where: { qdrantPointId: paragraphId },
    });
    if (!mapping || mapping.bookId !== bookId) {
      throw new NotFoundException('Paragraph not found for this book');
    }

    const existing = await this.prisma.simplifiedParagraph.findUnique({
      where: { paragraphId_targetLevel: { paragraphId, targetLevel } },
    });
    if (existing) {
      return { content: existing.content, cached: true };
    }

    const qdrant = this.qdrantInit.getClient();
    const points = await qdrant.retrieve(COLLECTION, {
      ids: [paragraphId],
      with_payload: true,
    });
    const originalText = (points[0]?.payload as any)?.text as
      | string
      | undefined;
    if (!originalText) {
      throw new NotFoundException(
        'Original passage text not found in the vector store',
      );
    }

    // The rewrite is cached per (paragraph, level) and served to every reader,
    // so it follows the BOOK's language rather than any one student's. This
    // used to say "the SAME language as the passage" — an unnamed target the
    // model has to infer, which is the instruction that produced an Italian
    // quiz elsewhere in this codebase.
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { language: true },
    });
    const language = bookAnswerLanguage(book?.language);

    const prompt =
      `Rewrite the following passage in simpler language appropriate for a ${targetLevel} reader. ` +
      `Preserve the factual meaning exactly — do not add, remove, or change any facts, only the ` +
      `vocabulary and sentence complexity. ${contentLanguageDirective(language)} ` +
      `Keep any mathematical or chemical notation unchanged. Return ONLY the rewritten passage, no preamble.\n\n` +
      `Passage:\n${originalText}`;

    let rewritten = '';
    await this.llmProvider.chatStream(
      [{ role: 'user', content: prompt }],
      (token) => {
        rewritten += token;
      },
    );
    rewritten = rewritten.trim();

    await this.prisma.simplifiedParagraph.upsert({
      where: { paragraphId_targetLevel: { paragraphId, targetLevel } },
      create: { paragraphId, targetLevel, content: rewritten },
      // Another request may have raced this one to the same cache key —
      // upsert rather than create so the second caller doesn't 500.
      update: {},
    });

    return { content: rewritten, cached: false };
  }
}
