import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingProvider } from '../interfaces/embedding.provider.interface';
import {
  OpenAiHttpError,
  isRetryable,
  openAiBaseUrl,
  toOpenAiHttpError,
} from './openai-http';

const MAX_RETRIES = 3;
/** OpenAI accepts up to 2048 inputs per request; smaller batches keep one failure cheap. */
const BATCH_SIZE = 100;

@Injectable()
export class OpenAiEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions: number;
  readonly modelId: string;

  private readonly logger = new Logger(OpenAiEmbeddingProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly retryBaseMs: number;
  /** Only the text-embedding-3 models accept a `dimensions` argument. */
  private readonly sendsDimensions: boolean;
  private readonly headers: Record<string, string>;

  constructor(private config: ConfigService) {
    this.modelId = this.config.get<string>(
      'OPENAI_EMBED_MODEL',
      'text-embedding-3-large',
    );
    this.dimensions = parseInt(
      this.config.get<string>('EMBEDDING_DIMENSIONS', '1024'),
      10,
    );
    this.sendsDimensions = /^text-embedding-3/.test(this.modelId);
    this.baseUrl = openAiBaseUrl(this.config);
    this.retryBaseMs = parseInt(
      this.config.get<string>('OPENAI_RETRY_BASE_MS', '1000'),
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
      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: this.modelId,
          input: texts,
          ...(this.sendsDimensions ? { dimensions: this.dimensions } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        throw await toOpenAiHttpError(res, 'OpenAI embedding', this.modelId);
      }

      const json = await res.json();
      if (!Array.isArray(json?.data) || json.data.length !== texts.length) {
        throw new Error(
          `OpenAI returned ${json?.data?.length ?? 0} embedding(s) for ${texts.length} input(s).`,
        );
      }
      // OpenAI returns data items in the same order as input, but sorted by `index`
      // just in case — a shuffled batch would silently mis-pair chunks with vectors.
      const sorted = [...json.data].sort((a, b) => a.index - b.index);
      const vectors = sorted.map((d) => d.embedding as number[]);

      // A wrong width would be rejected by Qdrant later with a far less helpful message, or
      // (for a model that ignores `dimensions`) silently stored in the wrong collection.
      const width = vectors[0]?.length ?? 0;
      if (width !== this.dimensions) {
        throw new Error(
          `${this.modelId} returned ${width}-dimension vectors but EMBEDDING_DIMENSIONS is ${this.dimensions}.`,
        );
      }
      return vectors;
    } catch (err) {
      if (attempt < MAX_RETRIES && isRetryable(err)) {
        const wait =
          (err instanceof OpenAiHttpError && err.retryAfterMs) ||
          this.retryBaseMs * 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait));
        return this.embedWithRetry(texts, attempt + 1);
      }
      throw err;
    }
  }
}
