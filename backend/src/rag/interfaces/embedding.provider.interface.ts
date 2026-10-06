export interface IEmbeddingProvider {
  /**
   * `options.dimensions` overrides the default vector width for this call only. The same model
   * serves indexes of different widths (Book Buddy's own and the shared one), and a question has to be
   * embedded to the width of the index it is searched in.
   */
  embedBatch(texts: string[], options?: { dimensions?: number }): Promise<number[][]>;
  readonly dimensions: number;
  readonly modelId: string;
}

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
