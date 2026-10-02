import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingProvider } from '../interfaces/embedding.provider.interface';

@Injectable()
export class OpenAiEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions: number;
  readonly modelId: string;

  private readonly logger = new Logger(OpenAiEmbeddingProvider.name);
  private readonly apiKey: string;
  private readonly headers: Record<string, string>;

  constructor(private config: ConfigService) {
    this.modelId = this.config.get<string>(
      'OPENAI_EMBED_MODEL',
      'text-embedding-3-large',
    );
    this.dimensions = parseInt(
      this.config.get<string>('EMBEDDING_DIMENSIONS', '3072'),
      10,
    );
    // .get, not .getOrThrow — without a key, embedding requests fail with a
    // clear message instead of the whole API refusing to boot.
    this.apiKey = this.config.get<string>('OPENAI_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not set — book embedding / AI search disabled.',
      );
    }
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('Embeddings are not configured: set OPENAI_API_KEY.');
    }
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const vectors = await this.embedWithRetry(batch);
      results.push(...vectors);
    }
    return results;
  }

  private async embedWithRetry(
    texts: string[],
    attempt = 0,
  ): Promise<number[][]> {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: this.modelId,
          input: texts,
          dimensions: this.dimensions,
        }),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      if (res.status === 429) {
        if (attempt >= 3)
          throw new Error(
            'OpenAI embedding rate limit exceeded after 3 retries',
          );
        const delay = Math.pow(2, attempt) * 1000; // exponential backoff: 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
        return this.embedWithRetry(texts, attempt + 1);
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI embedding failed: ${res.status} ${body}`);
      }

      const json = await res.json();
      // OpenAI returns data items in the same order as input, but sorted by `index`
      // just in case — a shuffled batch would silently mis-pair chunks with vectors.
      const sorted = [...json.data].sort((a, b) => a.index - b.index);
      return sorted.map((d) => d.embedding as number[]);
    } catch (err) {
      if (
        attempt < 3 &&
        !(err instanceof Error && err.message.includes('rate limit'))
      ) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        return this.embedWithRetry(texts, attempt + 1);
      }
      throw err;
    }
  }
}
