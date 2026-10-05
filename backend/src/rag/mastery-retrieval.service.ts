import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GraphService } from '../graph/graph.service';
import { MasteryService } from '../quiz/mastery.service';
import { QdrantInitService } from './qdrant-init.service';
import { RankedChunk } from './interfaces/reranker.provider.interface';
import { qdrantCollectionName } from './local/index-config';

// The shared trio collection — same as Varta retrieval (rag-search.service.ts),
// graph extraction and digest. The anchor point ids come from
// GraphEdge.qdrantPointId, which extraction now captures against this
// collection, so anchors must be retrieved from here; `book_buddy_books_v1` was
// deleted in the platform reset and held nothing.
const COLLECTION =
  qdrantCollectionName();

// Below this, a concept counts as "weak" for scaffolding purposes — the BKT
// prior is 0.3, so anything that hasn't climbed meaningfully past it is
// still effectively unlearned.
const WEAK_MASTERY_THRESHOLD = 0.6;

// How many concept-anchored passages to splice into the context on top of
// the existing vector-similarity top-k. Kept small: this augments the
// prompt, it doesn't replace the similarity retrieval, and the existing
// per-query token quota (book-chat.service.ts) wasn't sized with this in mind.
const MAX_ANCHOR_PASSAGES = 2;

// Common English stopwords, kept short deliberately — this is a containment
// heuristic, not a real tokenizer/NLP pass. Excluding them keeps something
// like "what is the significance of X" from spuriously matching a concept
// node labeled "The" or "What".
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'is',
  'are',
  'was',
  'were',
  'what',
  'who',
  'why',
  'how',
  'when',
  'where',
  'does',
  'did',
  'this',
  'that',
  'and',
  'for',
  'with',
  'about',
  'from',
  'into',
  'their',
  'they',
  'them',
  'you',
  'your',
]);

export interface MasteryAwareAugmentation {
  chunks: RankedChunk[];
  weakConceptLabels: string[];
}

/**
 * Reading Intelligence Layer §2 — mastery-aware retrieval loop (flagship,
 * NOVEL per the spec). Sits in front of the existing Qdrant similarity
 * search + reranker as a re-ranking/augmentation layer, not a replacement:
 *
 *   1. Resolve which of the book's graph concepts (§3) the query touches.
 *   2. Intersect with the asking student's weakest-mastery concepts (§4).
 *   3. Splice in passages anchored to that intersection — via the
 *      GraphEdge.qdrantPointId provenance already captured at extraction
 *      time — even if they didn't rank highly on pure similarity.
 *   4. Surface the weak concept labels so the caller can tell the model to
 *      scaffold rather than assume prior knowledge (dialogue-policy.service.ts).
 *
 * Gated behind MASTERY_AWARE_RETRIEVAL_ENABLED so product can A/B it, per
 * the spec's own recommendation — this is the highest-execution-risk item
 * in the whole Reading Intelligence Layer (an unproven mechanic, not just
 * an unproven implementation).
 */
@Injectable()
export class MasteryAwareRetrievalService {
  private readonly logger = new Logger(MasteryAwareRetrievalService.name);

  constructor(
    private prisma: PrismaService,
    private graphService: GraphService,
    private masteryService: MasteryService,
    private qdrantInit: QdrantInitService,
  ) {}

  get enabled(): boolean {
    return process.env.MASTERY_AWARE_RETRIEVAL_ENABLED === 'true';
  }

  async augment(
    bookId: string,
    userId: string,
    query: string,
    baseChunks: RankedChunk[],
  ): Promise<MasteryAwareAugmentation> {
    try {
      const touchedConceptIds = await this.resolveQueryConcepts(bookId, query);
      if (touchedConceptIds.size === 0) {
        return { chunks: baseChunks, weakConceptLabels: [] };
      }

      const masteryVector = await this.masteryService.getMasteryVector(
        userId,
        bookId,
      );
      const weak = masteryVector.filter(
        (m) =>
          touchedConceptIds.has(m.conceptId) &&
          m.mastery < WEAK_MASTERY_THRESHOLD,
      );
      if (weak.length === 0) {
        return { chunks: baseChunks, weakConceptLabels: [] };
      }

      const alreadyIncluded = new Set(baseChunks.map((c) => c.qdrantPointId));
      const anchors = await this.getAnchorPassages(
        bookId,
        weak.map((w) => w.conceptId),
        alreadyIncluded,
      );

      return {
        chunks: [...baseChunks, ...anchors],
        weakConceptLabels: weak.map((w) => w.label),
      };
    } catch (e) {
      // Augmentation is best-effort — a failure here should degrade to
      // today's plain retrieval, never break the chat response.
      this.logger.warn(
        `Mastery-aware augmentation failed, falling back to plain retrieval: ${e.message}`,
      );
      return { chunks: baseChunks, weakConceptLabels: [] };
    }
  }

  /**
   * v1 heuristic, not a semantic match: a concept counts as "touched" if its
   * label is contained in the query, or a significant query word is
   * contained in its label. Cheap (one indexed query per chat turn at
   * single-book scale) and good enough to gate an augmentation layer that
   * already degrades safely on a miss.
   */
  private async resolveQueryConcepts(
    bookId: string,
    query: string,
  ): Promise<Set<string>> {
    const nodes = await this.prisma.graphNode.findMany({
      where: { bookId },
      select: { id: true, label: true },
    });
    if (nodes.length === 0) return new Set();

    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery
      .split(/[^a-z0-9]+/i)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

    const touched = new Set<string>();
    for (const node of nodes) {
      const lowerLabel = node.label.toLowerCase();
      if (lowerLabel.length >= 3 && lowerQuery.includes(lowerLabel)) {
        touched.add(node.id);
        continue;
      }
      if (queryWords.some((w) => lowerLabel.includes(w))) {
        touched.add(node.id);
      }
    }
    return touched;
  }

  /**
   * Passages anchored to a set of concepts, via the GraphEdge.qdrantPointId
   * provenance captured at extraction time (§3) — the same chunk an edge
   * touching this concept was extracted from.
   */
  private async getAnchorPassages(
    bookId: string,
    conceptIds: string[],
    exclude: Set<string>,
  ): Promise<RankedChunk[]> {
    const edges = await this.prisma.graphEdge.findMany({
      where: {
        bookId,
        qdrantPointId: { not: null },
        OR: [
          { sourceId: { in: conceptIds } },
          { targetId: { in: conceptIds } },
        ],
      },
      select: { qdrantPointId: true, citedPage: true, chapterTitle: true },
      take: 20, // small pool to pick MAX_ANCHOR_PASSAGES distinct points from
    });

    const candidateIds: string[] = [];
    for (const e of edges) {
      if (
        e.qdrantPointId &&
        !exclude.has(e.qdrantPointId) &&
        !candidateIds.includes(e.qdrantPointId)
      ) {
        candidateIds.push(e.qdrantPointId);
      }
      if (candidateIds.length >= MAX_ANCHOR_PASSAGES) break;
    }
    if (candidateIds.length === 0) return [];

    const qdrant = this.qdrantInit.getClient();
    const points = await qdrant.retrieve(COLLECTION, {
      ids: candidateIds,
      with_payload: true,
    });

    // Shared-collection payload vocabulary, matching rag-search.mapQdrantResults:
    // page_start / chapter|section_title / text, and a citation id built from
    // content_item_id:content_asset_id:chunk_index. The old page_number /
    // chapter_title / text_preview / citation_id keys don't exist on these
    // points, so reading them returned undefined for every anchor.
    return points.map((p) => {
      const pl = (p.payload as any) ?? {};
      const text: string = pl.text ?? '';
      return {
        qdrantPointId: String(p.id),
        score: 0, // not retrieved by similarity — anchored by concept instead
        bookId,
        pageNumber: pl.page_start,
        chapterTitle: pl.chapter ?? pl.section_title,
        textPreview: text.length > 240 ? `${text.slice(0, 240)}…` : text,
        text,
        citationId: `${pl.content_item_id ?? bookId}:${pl.content_asset_id ?? 'x'}:${pl.chunk_index ?? 0}`,
      };
    });
  }
}
