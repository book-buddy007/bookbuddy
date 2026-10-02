import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IEmbeddingProvider,
  EMBEDDING_PROVIDER,
} from '../rag/interfaces/embedding.provider.interface';

export interface SemanticHit {
  nodeId: string;
  label: string;
  type: string;
  description: string;
  firstPage: number | null;
  score: number; // cosine similarity to the query, 0..1-ish
}

/**
 * Semantic search over a book's graph nodes (Reading Intelligence Layer §2,
 * applied to the entity graph rather than the chunk store).
 *
 * Each node is embedded once — "label (type): description" — with the SAME
 * provider that embeds book chunks, so a query and a node live in one vector
 * space. Vectors are stored in Postgres (GraphNodeEmbedding), and ranking is a
 * brute-force cosine over the book's few-hundred vectors done here in the
 * service. At that scale a dot-product loop is microseconds; pgvector or a
 * dedicated Qdrant collection would be operational weight with no measurable
 * payoff, and Book Buddy deliberately avoids provisioning new Qdrant collections
 * (see qdrant-init.service.ts).
 *
 * Substring graph traversal still exists (graph.service.ts queryGraph) and
 * answers a different question — "what is literally connected to X". This
 * answers "what in this book is ABOUT what I typed", which is what a student
 * searching in prose actually means.
 */
@Injectable()
export class GraphEmbeddingService {
  private readonly logger = new Logger(GraphEmbeddingService.name);

  // Drop clearly-unrelated hits, but keep the floor low: these providers score
  // genuine matches well below 1 (see dcp-ai-tutor-rag-threshold — a 0.55 floor
  // silently rejected everything for text-embedding-3-large). Ranking, not the
  // threshold, is what surfaces the best answer; the floor only trims noise.
  private static readonly SCORE_FLOOR = 0.15;

  constructor(
    private prisma: PrismaService,
    @Inject(EMBEDDING_PROVIDER) private readonly provider: IEmbeddingProvider,
  ) {}

  private nodeText(n: {
    label: string;
    type: string;
    description: string;
  }): string {
    return `${n.label} (${n.type}): ${n.description}`;
  }

  /**
   * Embed every node of a book, replacing any stored vectors. Called after
   * extraction; safe to re-run. Failure here is non-fatal to extraction — the
   * lazy backfill in ensureEmbedded() covers a book whose embed step was
   * skipped or errored.
   */
  async embedBook(bookId: string): Promise<number> {
    const nodes = await this.prisma.graphNode.findMany({
      where: { bookId },
      select: { id: true, label: true, type: true, description: true },
    });
    return this.embedNodes(bookId, nodes);
  }

  /**
   * Embed only the nodes that have no current vector — the backfill path for
   * books extracted before embeddings existed, or whose embed step failed.
   * Runs at most once per book in practice (subsequent searches find every
   * node already embedded and do nothing).
   */
  async ensureEmbedded(bookId: string): Promise<void> {
    const missing = await this.prisma.graphNode.findMany({
      where: { bookId, embedding: null },
      select: { id: true, label: true, type: true, description: true },
    });
    if (missing.length === 0) return;
    this.logger.log(
      `Backfilling ${missing.length} node embedding(s) for book ${bookId}`,
    );
    await this.embedNodes(bookId, missing);
  }

  private async embedNodes(
    bookId: string,
    nodes: { id: string; label: string; type: string; description: string }[],
  ): Promise<number> {
    if (nodes.length === 0) return 0;
    // The provider batches internally (see cloudflare.embedding.provider), so
    // one call is fine even for hundreds of nodes.
    const vectors = await this.provider.embedBatch(
      nodes.map((n) => this.nodeText(n)),
    );
    const model = this.provider.modelId;
    const dims = this.provider.dimensions;

    await this.prisma.$transaction(
      nodes.map((n, i) =>
        this.prisma.graphNodeEmbedding.upsert({
          where: { nodeId: n.id },
          create: { nodeId: n.id, bookId, vector: vectors[i], model, dims },
          update: { vector: vectors[i], model, dims, bookId },
        }),
      ),
    );
    return nodes.length;
  }

  async search(
    bookId: string,
    query: string,
    limit = 20,
  ): Promise<SemanticHit[]> {
    await this.ensureEmbedded(bookId);

    // Only compare within the current model's vectors — a model change makes
    // old vectors incomparable (different space, maybe different dims).
    const rows = await this.prisma.graphNodeEmbedding.findMany({
      where: { bookId, model: this.provider.modelId },
      select: { nodeId: true, vector: true },
    });
    if (rows.length === 0) return [];

    const [queryVec] = await this.provider.embedBatch([query]);
    if (!queryVec) return [];
    const qNorm = norm(queryVec);
    if (qNorm === 0) return [];

    const scored = rows
      .map((r) => ({
        nodeId: r.nodeId,
        score: cosine(queryVec, r.vector, qNorm),
      }))
      .filter(
        (s) =>
          Number.isFinite(s.score) &&
          s.score >= GraphEmbeddingService.SCORE_FLOOR,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    if (scored.length === 0) return [];

    const nodes = await this.prisma.graphNode.findMany({
      where: { id: { in: scored.map((s) => s.nodeId) } },
      select: {
        id: true,
        label: true,
        type: true,
        description: true,
        firstPage: true,
      },
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));

    // Preserve the score ordering; drop any hit whose node vanished mid-flight.
    return scored
      .map((s): SemanticHit | null => {
        const n = byId.get(s.nodeId);
        return n
          ? {
              nodeId: n.id,
              label: n.label,
              type: n.type,
              description: n.description,
              firstPage: n.firstPage,
              score: s.score,
            }
          : null;
      })
      .filter((h): h is SemanticHit => h !== null);
  }
}

/** Euclidean length of a vector. */
function norm(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

/**
 * Cosine similarity. The query's norm is passed in so it isn't recomputed once
 * per candidate. Guards against a length mismatch (a stale-dimension vector
 * from an earlier model) and a zero-length node vector.
 */
function cosine(q: number[], v: number[], qNorm: number): number {
  if (v.length !== q.length) return NaN;
  let dot = 0;
  let vSum = 0;
  for (let i = 0; i < q.length; i++) {
    dot += q[i] * v[i];
    vSum += v[i] * v[i];
  }
  const vNorm = Math.sqrt(vSum);
  if (vNorm === 0) return NaN;
  return dot / (qNorm * vNorm);
}
