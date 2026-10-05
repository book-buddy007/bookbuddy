/**
 * One place that says how the book index is shaped, so ingestion, search, graph extraction,
 * purge and the collection bootstrap cannot drift apart.
 *
 * INGESTION_MODE
 *   local (default)  Book Buddy chunks, embeds and indexes book text itself, into its own Qdrant.
 *   trio             The legacy path: hand chapters to the shared DCP ingestion service
 *                    (TRIO_INGEST_URL / TRIO_SERVICE_SECRET) and search ITS collection.
 */
export type IngestionMode = 'local' | 'trio';

export const ingestionMode = (): IngestionMode =>
  (process.env.INGESTION_MODE ?? '').trim().toLowerCase() === 'trio'
    ? 'trio'
    : 'local';

export const isLocalIndexing = (): boolean => ingestionMode() === 'local';

/** The collection holding book chunks. Set QDRANT_COLLECTION_NAME to override the default. */
export const qdrantCollectionName = (): string =>
  process.env.QDRANT_COLLECTION_NAME ||
  (isLocalIndexing() ? 'book_buddy_chunks_v1' : 'trio_content_v1_openai3072');

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
