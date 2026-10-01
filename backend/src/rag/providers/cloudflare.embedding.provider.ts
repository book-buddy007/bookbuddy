import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IEmbeddingProvider } from '../interfaces/embedding.provider.interface';

@Injectable()
export class CloudflareEmbeddingProvider implements IEmbeddingProvider {
  readonly dimensions = 768;
  readonly modelId: string;

  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(private config: ConfigService) {
    this.modelId = this.config.get<string>('CF_EMBED_MODEL', '@cf/google/embeddinggemma-300m');
    // .get, not .getOrThrow — never stop the API from booting over an optional provider.
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID') ?? '';
    const token = this.config.get<string>('CLOUDFLARE_AI_TOKEN') ?? '';
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const vectors = await this.embedWithRetry(batch);
      results.push(...vectors);
    }
    return results;
  }

  private async embedWithRetry(texts: string[], attempt = 0): Promise<number[][]> {
    try {
      const res = await fetch(`${this.baseUrl}/${this.modelId}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ text: texts }),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      if (res.status === 429) {
        if (attempt >= 3) throw new Error('Cloudflare rate limit exceeded after 3 retries');
        const delay = Math.pow(2, attempt) * 1000; // exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delay));
        return this.embedWithRetry(texts, attempt + 1);
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Cloudflare embedding failed: ${res.status} ${body}`);
      }

      const json = await res.json();
      return json.result.data as number[][];
    } catch (err) {
      if (attempt < 3 && !(err instanceof Error && err.message.includes('rate limit'))) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        return this.embedWithRetry(texts, attempt + 1);
      }
      throw err;
    }
  }
}
