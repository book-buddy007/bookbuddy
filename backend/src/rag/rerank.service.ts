import { Injectable, Logger } from '@nestjs/common';
import {
  IRerankerProvider,
  RankedChunk,
} from './interfaces/reranker.provider.interface';

/**
 * Pass-through RerankerService — sorts by Qdrant similarity score.
 *
 * This is the default implementation. To upgrade to a cross-encoder
 * (e.g. bge-reranker on Cloudflare Workers AI), create a new class
 * implementing IRerankerProvider and swap `useClass` in rag.module.ts.
 *
 * Why pass-through for now:
 * - Workers AI free tier: a reranker call adds ~200-500 neurons per query
 * - Gemma 4 26B is intelligent enough to reason over 3-6 chunks
 * - This interface is all you need — zero changes to controllers on upgrade
 */
@Injectable()
export class RerankService implements IRerankerProvider {
  private readonly logger = new Logger(RerankService.name);

  rerank(
    query: string,
    chunks: RankedChunk[],
    topK: number = 3,
  ): Promise<RankedChunk[]> {
    if (!chunks || chunks.length === 0) return Promise.resolve([]);

    try {
      // Sort by score descending (Qdrant similarity score)
      const sorted = [...chunks].sort(
        (a, b) => (b.score || 0) - (a.score || 0),
      );
      return Promise.resolve(sorted.slice(0, topK));
    } catch (e) {
      this.logger.error(`Reranking failed: ${e.message}`);
      return Promise.resolve(chunks.slice(0, topK));
    }
  }
}
