/**
 * IRerankerProvider — Abstraction for chunk reranking.
 *
 * The default implementation is a pass-through that sorts by Qdrant
 * similarity score.  Swap `useClass` in rag.module.ts to upgrade to
 * a cross-encoder (e.g. bge-reranker) later with zero controller changes.
 */

export interface RankedChunk {
  qdrantPointId: string;
  score: number;
  bookId: string;
  pageNumber?: number;
  chapterTitle?: string;
  textPreview?: string;
  text?: string;
  [key: string]: any; // allow extra payload fields
}

export interface IRerankerProvider {
  /**
   * Rerank retrieved chunks for a given query.
   * @param query  The user's natural-language question.
   * @param chunks Raw chunks from Qdrant (with .score from vector search).
   * @param topK   Maximum number of chunks to return.
   * @returns Reranked (and trimmed) chunk list, best-first.
   */
  rerank(
    query: string,
    chunks: RankedChunk[],
    topK?: number,
  ): Promise<RankedChunk[]>;
}

export const RERANKER_PROVIDER = Symbol('RERANKER_PROVIDER');
