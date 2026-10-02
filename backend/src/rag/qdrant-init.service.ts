import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

interface CollectionInspection {
  exists: boolean;
  /** Only meaningful when `exists` is true. */
  matches: boolean;
  /** Human-readable reason, for the boot log. */
  detail: string;
}

/**
 * Boot-time Qdrant check.
 *
 * This service used to delete-and-recreate a collection whenever its config
 * "mismatched". That was unsafe twice over: the check itself could not read a
 * named-vector collection (it looked for a top-level `params.vectors.size`,
 * which is `undefined` when vectors are named), so it reported mismatch
 * unconditionally — and the response to a mismatch was a destructive
 * `deleteCollection`. Pointed at the shared `trio_content_v1_openai3072`
 * collection, that combination would have silently destroyed every vector in it
 * on the next boot.
 *
 * The delete path is gone entirely. Now:
 *   - a confirmed config mismatch LOGS and REFUSES TO START (never deletes),
 *   - collection creation only happens when QDRANT_ALLOW_COLLECTION_CREATE=true
 *     (default off — Book Buddy is a reader of shared content, not its owner),
 *   - payload indexes are only written on a collection this service created,
 *     so it never mutates a collection another app owns,
 *   - an unreachable Qdrant is a warning, not a crash-loop: retrieval surfaces
 *     that at query time, where it fails per-request instead of per-process.
 */
@Injectable()
export class QdrantInitService implements OnModuleInit {
  private readonly logger = new Logger(QdrantInitService.name);
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {
    const urlToUse = process.env.QDRANT_URL || 'http://localhost:6333';
    this.client = new QdrantClient({
      url: urlToUse,
      // Coolify's Qdrant service requires an API key. Optional locally.
      apiKey: process.env.QDRANT_API_KEY,
      checkCompatibility: false,
    });
  }

  async onModuleInit() {
    const qdrantUrl =
      this.configService.get('QDRANT_URL') || 'http://localhost:6333';
    const collectionName =
      this.configService.get('QDRANT_COLLECTION_NAME') || 'book_buddy_books_v1';
    const dimensions = parseInt(
      this.configService.get('EMBEDDING_DIMENSIONS') || '768',
      10,
    );

    const allowCreate =
      String(
        this.configService.get('QDRANT_ALLOW_COLLECTION_CREATE') ?? 'false',
      ).toLowerCase() === 'true';

    // Inspection is separated from the decision so a transport failure (Qdrant
    // briefly unreachable) can never be mistaken for "the config is wrong".
    let inspection: CollectionInspection;
    try {
      inspection = await this.inspectCollection(collectionName, dimensions);
    } catch (err: any) {
      this.logger.error(
        `Qdrant init could not inspect "${collectionName}" at ${qdrantUrl}: ` +
          `${err?.response?.data?.status?.error || err?.message}. ` +
          `Continuing boot — retrieval will surface this per-request at query time.`,
      );
      return;
    }

    if (inspection.exists && !inspection.matches) {
      // NEVER delete. A collection whose config does not match this app's
      // expectations belongs to someone else, or this app is misconfigured —
      // either way the safe action is to refuse to start, loudly.
      const message =
        `Qdrant collection "${collectionName}" exists but does not match this ` +
        `app's expected config (${inspection.detail}). Refusing to start. ` +
        `This service will NOT delete or recreate it — fix QDRANT_COLLECTION_NAME / ` +
        `EMBEDDING_DIMENSIONS, or point at the correct Qdrant instance.`;
      this.logger.error(message);
      throw new Error(message);
    }

    if (inspection.exists) {
      this.logger.log(
        `✅ Qdrant collection "${collectionName}" present and compatible (${inspection.detail}).`,
      );
      return;
    }

    if (!allowCreate) {
      this.logger.warn(
        `Qdrant collection "${collectionName}" does not exist and ` +
          `QDRANT_ALLOW_COLLECTION_CREATE is not 'true' — not creating it. ` +
          `Retrieval against this collection will fail until it is provisioned deliberately.`,
      );
      return;
    }

    try {
      await this.createCollection(collectionName, dimensions);
    } catch (err: any) {
      this.logger.error(
        `Qdrant collection creation failed for "${collectionName}": ` +
          `${err?.response?.data?.status?.error || err?.message}`,
        err.stack,
      );
    }
  }

  /**
   * Reads the collection's real config and reports whether it is usable.
   *
   * Handles BOTH vector shapes. The old implementation only understood the
   * unnamed shape (`params.vectors.size`); against a named-vector collection
   * — which is exactly what the shared trio collection is (`dense`) — `size`
   * came back `undefined` and every boot concluded "mismatch". That wrong
   * answer used to feed a delete. It no longer does, but the check is fixed
   * regardless so a correct config is not reported as broken.
   *
   * Throws on transport failure; a 404 is a clean `exists: false`.
   */
  private async inspectCollection(
    collectionName: string,
    dimensions: number,
  ): Promise<CollectionInspection> {
    this.logger.log(`Inspecting Qdrant collection "${collectionName}"...`);

    let info: any;
    try {
      info = await this.client.getCollection(collectionName);
    } catch (err: any) {
      if (
        err.message?.includes('Not Found') ||
        err.status === 404 ||
        err.response?.status === 404
      ) {
        return {
          exists: false,
          matches: false,
          detail: 'collection not found',
        };
      }
      throw err;
    }

    const vectorsConfig = info?.config?.params?.vectors;
    if (
      !vectorsConfig ||
      Array.isArray(vectorsConfig) ||
      typeof vectorsConfig !== 'object'
    ) {
      return {
        exists: true,
        matches: false,
        detail: 'vector config missing or unreadable',
      };
    }

    // Unnamed shape: { size, distance }. Named shape: { <name>: { size, distance }, ... }
    const isUnnamed = typeof vectorsConfig.size === 'number';
    const configuredName = this.configService.get('QDRANT_VECTOR_NAME');
    let vectorName: string | null = null;
    let entry: any;

    if (isUnnamed) {
      entry = vectorsConfig;
    } else {
      const names = Object.keys(vectorsConfig);
      vectorName =
        (configuredName && names.includes(configuredName)
          ? configuredName
          : null) ?? (names.length === 1 ? names[0] : null);
      if (!vectorName) {
        return {
          exists: true,
          matches: false,
          detail: `named vectors [${names.join(', ')}] — set QDRANT_VECTOR_NAME to pick one`,
        };
      }
      entry = vectorsConfig[vectorName];
    }

    const size = entry?.size;
    const distance = entry?.distance;
    const label = vectorName ? `vector '${vectorName}'` : 'unnamed vector';
    const matches = size === dimensions && distance === 'Cosine';

    return {
      exists: true,
      matches,
      detail: matches
        ? `${label}: ${size}d ${distance}`
        : `${label}: ${size}d ${distance}, expected ${dimensions}d Cosine`,
    };
  }

  private async createCollection(
    collectionName: string,
    dimensions: number,
  ): Promise<void> {
    this.logger.log(
      `Creating collection "${collectionName}" with ${dimensions} dimensions...`,
    );

    await this.client.createCollection(collectionName, {
      vectors: { size: dimensions, distance: 'Cosine' },
      optimizers_config: { default_segment_number: 2 },
    });

    await this.ensurePayloadIndexes(collectionName);

    this.logger.log(
      `✅ Initialized Qdrant: "${collectionName}" (${dimensions}d) with payload indexes.`,
    );
  }

  /**
   * Only called from createCollection — i.e. only on a collection this service
   * just created itself. It is deliberately NOT run against a pre-existing
   * collection any more: creating payload indexes is a write, and Book Buddy must
   * not mutate the schema of a collection another app owns (nor could it, once
   * it holds a read-only API key). A new payload field on a shared collection
   * gets its index from that collection's owner, not from here.
   */
  private async ensurePayloadIndexes(collectionName: string): Promise<void> {
    this.logger.log(
      `Ensuring payload indexes for tenant isolation, queries, and taxonomy scoping on "${collectionName}"...`,
    );

    await this.client.createPayloadIndex(collectionName, {
      field_name: 'tenant_id',
      field_schema: 'keyword',
    });

    await this.client.createPayloadIndex(collectionName, {
      field_name: 'book_id',
      field_schema: 'keyword',
    });

    await this.client.createPayloadIndex(collectionName, {
      field_name: 'page_number',
      field_schema: 'integer',
    });

    // Shared cross-repo curriculum taxonomy — every node a chunk's book is tagged
    // onto (primary + cross-listed), so retrieval can filter by institute scope
    // without weakening the must-have tenant_id filter. See rag-search.service.ts.
    await this.client.createPayloadIndex(collectionName, {
      field_name: 'taxonomy_node_ids',
      field_schema: 'keyword',
    });
  }

  getClient(): QdrantClient {
    return this.client;
  }
}
