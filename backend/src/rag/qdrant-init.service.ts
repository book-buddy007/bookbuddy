import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  INTEGER_PAYLOAD_FIELDS,
  KEYWORD_PAYLOAD_FIELDS,
  denseVectorName,
  qdrantCollectionName,
  sharedIndexConfig,
  sparseVectorName,
} from './local/index-config';

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
  /** Read-only view of the index shared with DigiClassroom and PDLMS; null when not configured. */
  private sharedClient: QdrantClient | null = null;
  private sharedProblemText: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const urlToUse = process.env.QDRANT_URL || 'http://localhost:6333';
    this.client = new QdrantClient({
      url: urlToUse,
      // Coolify's Qdrant service requires an API key. Optional locally.
      apiKey: process.env.QDRANT_API_KEY,
      checkCompatibility: false,
    });

    const shared = sharedIndexConfig();
    if (shared) {
      this.sharedClient = new QdrantClient({
        url: shared.url,
        apiKey: shared.apiKey,
        checkCompatibility: false,
      });
    }
  }

  async onModuleInit() {
    await this.initLocal();
    await this.inspectShared();
  }

  /**
   * Book Buddy's own index: created when allowed, never deleted, refuses to start on a mismatch.
   */
  private async initLocal() {
    const qdrantUrl =
      this.configService.get('QDRANT_URL') || 'http://localhost:6333';
    const collectionName =
      this.configService.get('QDRANT_COLLECTION_NAME') ||
      qdrantCollectionName();
    const dimensions = parseInt(
      this.configService.get('EMBEDDING_DIMENSIONS') || '1024',
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
    let matches = size === dimensions && distance === 'Cosine';

    // When Book Buddy writes the index itself it also writes a keyword (sparse) vector on every
    // point, and Qdrant rejects a point carrying a vector name the collection does not declare.
    // Catch that here, at boot, rather than on the first book that is indexed.
    if (matches) {
      const sparseName = sparseVectorName();
      const sparseConfig = info?.config?.params?.sparse_vectors ?? {};
      if (!Object.prototype.hasOwnProperty.call(sparseConfig, sparseName)) {
        return {
          exists: true,
          matches: false,
          detail: `${label}: ${size}d ${distance}, but no sparse vector '${sparseName}' (the keyword half of search)`,
        };
      }
    }

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
      `Creating collection "${collectionName}" (${dimensions}d dense + sparse keyword vector)...`,
    );

    // Named dense vector plus a named sparse (keyword) vector with IDF weighting, which is the
    // shape rag-search queries: hybrid search fuses the two with reciprocal rank fusion.
    await this.client.createCollection(collectionName, {
      vectors: { [denseVectorName()]: { size: dimensions, distance: 'Cosine' } },
      sparse_vectors: { [sparseVectorName()]: { modifier: 'idf' } },
      optimizers_config: { default_segment_number: 2 },
    });

    await this.ensurePayloadIndexes(collectionName);

    this.logger.log(
      `✅ Initialized Qdrant: "${collectionName}" (${dimensions}d dense + keyword) with payload indexes.`,
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
      `Ensuring payload indexes on "${collectionName}" for the fields every search filters by...`,
    );

    for (const field of KEYWORD_PAYLOAD_FIELDS) {
      await this.client.createPayloadIndex(collectionName, {
        field_name: field,
        field_schema: 'keyword',
      });
    }
    for (const field of INTEGER_PAYLOAD_FIELDS) {
      await this.client.createPayloadIndex(collectionName, {
        field_name: field,
        field_schema: 'integer',
      });
    }
  }

  /** Book Buddy's own index. */
  getClient(): QdrantClient {
    return this.client;
  }

  /**
   * The shared index, READ ONLY by convention and, with a read-only key, by the server.
   * Null when this deployment does not use it. Nothing in this class ever creates, alters or
   * deletes anything through it.
   */
  getSharedClient(): QdrantClient | null {
    return this.sharedClient;
  }

  /** Why the shared index cannot be used right now, or null when it can (or is not configured). */
  sharedProblem(): string | null {
    return this.sharedProblemText;
  }

  /**
   * Checks the shared collection at boot, read-only, and NEVER fails the boot: books in Book
   * Buddy's own index must keep working when the shared index is down or misconfigured. A
   * problem is remembered, and a book that needs the shared index is then refused with this
   * reason instead of being answered from nothing.
   */
  private async inspectShared() {
    const cfg = sharedIndexConfig();
    if (!cfg || !this.sharedClient) return;
    try {
      const info: any = await this.sharedClient.getCollection(cfg.collection);
      const dense = info?.config?.params?.vectors?.[denseVectorName()];
      const sparse = info?.config?.params?.sparse_vectors ?? {};
      if (!dense || dense.size !== cfg.dimensions) {
        this.sharedProblemText =
          `the shared collection "${cfg.collection}" has ${dense?.size ?? 'no'}-dimension vectors but ` +
          `SHARED_EMBEDDING_DIMENSIONS is ${cfg.dimensions}`;
      } else if (!Object.prototype.hasOwnProperty.call(sparse, sparseVectorName())) {
        this.sharedProblemText = `the shared collection "${cfg.collection}" has no '${sparseVectorName()}' keyword vector`;
      } else {
        this.sharedProblemText = null;
        this.logger.log(
          `✅ Shared index "${cfg.collection}" reachable (${dense.size}d, read-only use).`,
        );
        return;
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      this.sharedProblemText =
        status === 404
          ? `the shared collection "${cfg.collection}" does not exist`
          : `the shared index could not be reached (${err?.response?.data?.status?.error || err?.message})`;
    }
    this.logger.error(
      `Shared index unusable: ${this.sharedProblemText}. Books that live in it will be refused ` +
        `until this is fixed; books in Book Buddy's own index are unaffected.`,
    );
  }
}
