import { Injectable, Inject, Logger } from '@nestjs/common';
import { IEmbeddingProvider, EMBEDDING_PROVIDER } from './interfaces/embedding.provider.interface';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    @Inject(EMBEDDING_PROVIDER) private readonly provider: IEmbeddingProvider
  ) {}

  /**
   * Batch embed via the configured provider
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.provider.embedBatch(texts);
      this.logger.log(
        `✅ Embedded ${texts.length} texts with ${this.provider.modelId} (${this.provider.dimensions}d)`
      );
      return embeddings;
    } catch (err) {
      this.logger.error(`Embedding failed: ${err.message}`, err.stack);
      throw err;
    }
  }

  /** Embed a single text (convenience wrapper) */
  async embedOne(text: string): Promise<number[]> {
    const [embedding] = await this.embedBatch([text]);
    return embedding;
  }
}
