/**
 * One place that says how the book indexes are shaped, so ingestion, search, graph, purge and the
 * collection bootstrap cannot drift apart.
 *
 * There are two indexes, and each BOOK lives in exactly one of them:
 *
 *   local   Book Buddy's own Qdrant (QDRANT_URL / QDRANT_COLLECTION_NAME). Book Buddy chunks,
 *           embeds and writes it. Holds every book that is private to an institution, and any
 *           book nobody has shared. Passages carry `tenant_id`, and search locks on it.
 *   shared  The index shared with DigiClassroom and PDLMS (SHARED_QDRANT_URL ...). DigiClassroom
 *           writes it; Book Buddy only reads it, with a read-only key. Holds public works.
 *
 * Which one a book uses is recorded on the book itself (`Book.spineContentItemId` set = shared),
 * see ContentSpineService.resolveIndex. Nothing here decides per request from an environment flag.
 *
 * INGESTION_MODE only decides where NEW books go when someone presses Embed:
 *   local (default)  always into Book Buddy's own index.
 *   trio             books meant for everyone (global catalogue, AI-licensed) are handed to
 *                    DigiClassroom to embed once for all apps; every other book still goes into
 *                    Book Buddy's own index.
 */
export type IngestionMode = 'local' | 'trio';

export const ingestionMode = (): IngestionMode =>
  (process.env.INGESTION_MODE ?? '').trim().toLowerCase() === 'trio'
    ? 'trio'
    : 'local';

/** Whether eligible new books are handed to DigiClassroom instead of embedded here. */
export const handsNewBooksToShared = (): boolean => ingestionMode() === 'trio';

/** Book Buddy's own collection. Set QDRANT_COLLECTION_NAME to override the default. */
export const qdrantCollectionName = (): string =>
  process.env.QDRANT_COLLECTION_NAME || 'book_buddy_chunks_v1';

export interface SharedIndexConfig {
  url: string;
  /** Use a READ-ONLY key: Book Buddy never writes to this index. */
  apiKey?: string;
  collection: string;
  /** Width of the vectors in the shared collection; questions are embedded to match. */
  dimensions: number;
}

/**
 * The shared index, or null when this deployment does not use it. Its own variables on purpose,
 * so it can never be confused with Book Buddy's own Qdrant (a wrong QDRANT_URL must not be able to
 * point writes at the shared one).
 */
export const sharedIndexConfig = (): SharedIndexConfig | null => {
  const url = process.env.SHARED_QDRANT_URL?.trim();
  if (!url) return null;
  return {
    url,
    apiKey: process.env.SHARED_QDRANT_API_KEY?.trim() || undefined,
    collection:
      process.env.SHARED_QDRANT_COLLECTION?.trim() || 'trio_content_v1_openai3072',
    dimensions: parseInt(process.env.SHARED_EMBEDDING_DIMENSIONS || '3072', 10),
  };
};

/** Named dense vector. */
export const denseVectorName = (): string =>
  process.env.QDRANT_VECTOR_NAME || 'dense';

/** Named sparse (keyword) vector, written with `modifier: idf`. */
export const sparseVectorName = (): string =>
  process.env.QDRANT_SPARSE_VECTOR_NAME || 'bm25';

/** Fields every search filters on, so each is indexed when the collection is created. */
export const KEYWORD_PAYLOAD_FIELDS = [
  'content_item_id',
  'content_asset_id',
  'tenant_id',
  'visibility',
  'retrieval_class',
  'run_id',
  'taxonomy_node_ids',
] as const;

export const INTEGER_PAYLOAD_FIELDS = ['level', 'page_start', 'chunk_index'] as const;
