import { Inject, Injectable, Logger } from '@nestjs/common';
import { IRerankerProvider, RankedChunk } from './interfaces/reranker.provider.interface';
import { ILlmProvider, LLM_PROVIDER } from './interfaces/llm.provider.interface';

/**
 * A REAL reranker: the model reads each candidate and judges whether it
 * answers the question, instead of trusting the order retrieval produced.
 *
 * WHY THIS EXISTS. The retrieval side over-fetches candidates explicitly "for
 * the reranker", but RerankService only ever re-sorted by the RRF score Qdrant
 * had already sorted by — a no-op dressed as a ranking step. So the ONLY
 * ranking signal reaching a student was fused dense+BM25 order, and that order
 * has a known blind spot: a chunk is embedded as a whole, so a single sentence
 * answering the question contributes almost nothing to its vector when the rest
 * of the chunk is about something else.
 *
 * The case that motivated this: "himalaya as great barrier" against a geography
 * textbook whose page 4 reads "In India, Himalayas have acted as great barriers
 * and provided protection". BM25 ranked that chunk 3rd — behind two coastal
 * chunks that repeat "barrier" as in *barrier bar* — and dense ranked it low
 * because the chunk is mostly about geography as a discipline. Nothing could
 * recover it, because nothing downstream ever read the text.
 *
 * WHY AN LLM AND NOT A CROSS-ENCODER. A hosted cross-encoder is the textbook
 * answer and stays the better long-term one. It is not what shipped here for two
 * reasons: it needs infrastructure that isn't provisioned, and the obvious
 * in-process alternative is a trap — DigiClassroom's @xenova ONNX cross-encoder
 * crashed the Node process with a native Ort::Exception (std::terminate, not a
 * catchable error) and had to be gated off entirely. This reuses the LLM
 * provider that is already configured, so it adds no new failure domain.
 *
 * FAIL-SAFE BY CONSTRUCTION. Every failure path — provider error, timeout,
 * unparseable output, indices out of range — falls back to the previous
 * behaviour (score order, trimmed to topK). Reranking can make retrieval
 * better; it must never be able to make it empty.
 */
@Injectable()
export class LlmRerankService implements IRerankerProvider {
  private readonly logger = new Logger(LlmRerankService.name);

  /**
   * Off by default. Reranking adds one model call to every question, and this
   * is a change to the answer path of a live product — it turns on deliberately
   * (RAG_LLM_RERANK=true), not by upgrading.
   */
  private readonly enabled = process.env.RAG_LLM_RERANK === 'true';

  /**
   * How much of each candidate the ranking pass sees.
   *
   * Not the whole chunk: candidates can be thousands of characters, and 50 of
   * them would be a ~35k-token prompt per question — slower and dearer than the
   * answer it is meant to improve. A few hundred characters is enough to judge
   * topical relevance, which is all this step decides.
   */
  private readonly SNIPPET_CHARS = 400;

  /** Beyond this the prompt stops paying for itself. */
  private readonly MAX_CANDIDATES = 50;

  /** A reranker that stalls must not hold up the answer. */
  private readonly TIMEOUT_MS = 8000;

  constructor(@Inject(LLM_PROVIDER) private llm: ILlmProvider) {}

  async rerank(query: string, chunks: RankedChunk[], topK = 8): Promise<RankedChunk[]> {
    if (!chunks?.length) return [];
    const byScore = [...chunks].sort((a, b) => (b.score || 0) - (a.score || 0));
    // Nothing to decide: the model would only re-order what we already keep.
    if (!this.enabled || byScore.length <= topK) return byScore.slice(0, topK);

    const candidates = byScore.slice(0, this.MAX_CANDIDATES);

    try {
      const picked = await this.pick(query, candidates, topK);
      if (!picked.length) return byScore.slice(0, topK);

      const chosen = picked.map((i) => candidates[i]);
      // Top up from score order if the model returned fewer than asked, so a
      // terse response can't shrink the context the answer is built from.
      if (chosen.length < topK) {
        const seen = new Set(chosen.map((c) => c.qdrantPointId));
        for (const c of byScore) {
          if (chosen.length >= topK) break;
          if (!seen.has(c.qdrantPointId)) chosen.push(c);
        }
      }
      this.logger.debug(
        `reranked ${candidates.length} -> ${chosen.length}; ` +
          `pages [${chosen.map((c) => c.pageNumber ?? '?').join(', ')}]`,
      );
      return chosen;
    } catch (e: any) {
      this.logger.warn(`LLM rerank failed (${e.message}) — falling back to score order`);
      return byScore.slice(0, topK);
    }
  }

  /** Ask for the best `topK` candidate indices, best first. */
  private async pick(query: string, candidates: RankedChunk[], topK: number): Promise<number[]> {
    const list = candidates
      .map((c, i) => {
        const body = (c.text || c.textPreview || '').replace(/\s+/g, ' ').trim();
        return `[${i}] (p.${c.pageNumber ?? '?'}) ${body.slice(0, this.SNIPPET_CHARS)}`;
      })
      .join('\n');

    const prompt =
      `A student asked: "${query}"\n\n` +
      `Below are numbered excerpts from their textbook. Choose the ${topK} most likely to ` +
      `contain the answer.\n\n` +
      // The whole point of the step: judge the sentence, not the topic. An
      // excerpt whose main subject is something else still wins if it states
      // the fact asked for.
      `Judge each excerpt on whether it CONTAINS THE ANSWER, not on whether its overall topic ` +
      `looks related. An excerpt mostly about another subject still counts if one sentence in ` +
      `it answers the question — that is exactly the case ranking by similarity gets wrong.\n\n` +
      `${list}\n\n` +
      `Return ONLY a JSON array of the chosen numbers, most relevant first, e.g. [4,0,11]. ` +
      `No prose, no explanation.`;

    let raw = '';
    await this.withTimeout(
      this.llm.chatStream([{ role: 'user', content: prompt }], (t) => {
        raw += t;
      }),
      this.TIMEOUT_MS,
    );

    const m = raw.match(/\[[\s\S]*?\]/);
    if (!m) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<number>();
    const out: number[] = [];
    for (const v of parsed) {
      const i = typeof v === 'number' ? v : parseInt(String(v), 10);
      // Out-of-range indices are dropped rather than clamped: clamping would
      // silently invent a citation the model never chose.
      if (!Number.isInteger(i) || i < 0 || i >= candidates.length || seen.has(i)) continue;
      seen.add(i);
      out.push(i);
      if (out.length >= topK) break;
    }
    return out;
  }

  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`rerank timed out after ${ms}ms`)), ms),
      ),
    ]);
  }
}
