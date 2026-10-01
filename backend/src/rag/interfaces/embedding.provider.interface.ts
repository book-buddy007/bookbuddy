export interface IEmbeddingProvider {
  embedBatch(texts: string[]): Promise<number[][]>;
  readonly dimensions: number;
  readonly modelId: string;
}

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
