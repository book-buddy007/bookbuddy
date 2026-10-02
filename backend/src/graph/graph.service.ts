import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GraphQueryHit {
  nodeId: string;
  label: string;
  type: string;
  hops: number;
  viaEdgeId: string | null;
  viaRelation: string | null;
}

@Injectable()
export class GraphService {
  constructor(private prisma: PrismaService) {}

  async listEntities(bookId: string, type?: string, chapter?: string) {
    return this.prisma.graphNode.findMany({
      where: {
        bookId,
        ...(type ? { type } : {}),
        ...(chapter ? { firstChapter: chapter } : {}),
      },
      select: {
        id: true,
        type: true,
        label: true,
        description: true,
        firstPage: true,
      },
      orderBy: { label: 'asc' },
    });
  }

  /**
   * The chapters that actually HAVE a pre-generated graph, in reading order —
   * the spine of the Map tab's chapter picker. Graphs are built chapter by
   * chapter (extractAllChapters), tagging every node with its chapter, so the
   * distinct `firstChapter` values ARE the available maps; a chapter whose
   * extraction found nothing simply never appears. Ordered by the earliest page
   * any of the chapter's nodes was found on, so "Chapter 1" leads regardless of
   * how the titles sort alphabetically. Node counts ride along so the UI can
   * show how dense each chapter's map is without a second call.
   */
  async listGraphChapters(bookId: string) {
    const groups = await this.prisma.graphNode.groupBy({
      by: ['firstChapter'],
      where: { bookId },
      _count: { _all: true },
      _min: { firstPage: true },
    });
    return groups
      .map((g) => ({
        chapter: g.firstChapter ?? '(unattributed)',
        nodeCount: g._count._all,
        firstPage: g._min.firstPage,
      }))
      .sort((a, b) => {
        const pa = a.firstPage ?? Number.MAX_SAFE_INTEGER;
        const pb = b.firstPage ?? Number.MAX_SAFE_INTEGER;
        return pa - pb || a.chapter.localeCompare(b.chapter);
      });
  }

  async getEntity(bookId: string, entityId: string) {
    const node = await this.prisma.graphNode.findUnique({
      where: { id: entityId },
      include: {
        outgoingEdges: {
          include: {
            target: { select: { id: true, label: true, type: true } },
          },
        },
        incomingEdges: {
          include: {
            source: { select: { id: true, label: true, type: true } },
          },
        },
      },
    });

    if (!node || node.bookId !== bookId) {
      throw new NotFoundException('Entity not found for this book');
    }

    return {
      id: node.id,
      type: node.type,
      label: node.label,
      description: node.description,
      firstPage: node.firstPage,
      relations: [
        ...node.outgoingEdges.map((e) => ({
          edgeId: e.id,
          direction: 'outgoing' as const,
          relation: e.relation,
          node: e.target,
          citedPage: e.citedPage,
          spanStart: e.spanStart,
          spanEnd: e.spanEnd,
          qdrantPointId: e.qdrantPointId,
        })),
        ...node.incomingEdges.map((e) => ({
          edgeId: e.id,
          direction: 'incoming' as const,
          relation: e.relation,
          node: e.source,
          citedPage: e.citedPage,
          spanStart: e.spanStart,
          spanEnd: e.spanEnd,
          qdrantPointId: e.qdrantPointId,
        })),
      ],
    };
  }

  /**
   * The whole book's graph in one payload, for the node-link visualization.
   * listEntities returns nodes but no edges, and getEntity returns one
   * node's neighbourhood — a force layout needs both halves at once, so
   * this is its own endpoint rather than N+1 calls to getEntity.
   *
   * `degree` (how many edges touch a node) ships pre-computed so the client
   * can size nodes by connectedness without walking the edge list itself.
   * Descriptions are deliberately omitted here — the canvas shows labels,
   * and the detail panel (getEntity) is what fetches the prose on click.
   * Keeping this payload lean matters: it is the one call that scales with
   * the whole graph rather than a single neighbourhood.
   */
  async getNetwork(bookId: string, type?: string, chapter?: string) {
    const [nodes, edges] = await Promise.all([
      this.prisma.graphNode.findMany({
        where: {
          bookId,
          ...(type ? { type } : {}),
          ...(chapter ? { firstChapter: chapter } : {}),
        },
        select: { id: true, type: true, label: true, firstPage: true },
      }),
      this.prisma.graphEdge.findMany({
        where: { bookId, ...(chapter ? { chapterTitle: chapter } : {}) },
        select: { id: true, sourceId: true, targetId: true, relation: true },
      }),
    ]);

    // Either filter (type or chapter) narrows the visible nodes; drop any edge
    // whose endpoint was filtered out, so the client never references a node it
    // wasn't given. (A chapter's edges are already scoped by chapterTitle, but
    // a type filter can still remove one of their endpoints.)
    const nodeIds = new Set(nodes.map((n) => n.id));
    const visibleEdges =
      type || chapter
        ? edges.filter(
            (e) => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId),
          )
        : edges;

    const degree = new Map<string, number>();
    for (const e of visibleEdges) {
      degree.set(e.sourceId, (degree.get(e.sourceId) ?? 0) + 1);
      degree.set(e.targetId, (degree.get(e.targetId) ?? 0) + 1);
    }

    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        firstPage: n.firstPage,
        degree: degree.get(n.id) ?? 0,
      })),
      edges: visibleEdges.map((e) => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        relation: e.relation,
      })),
    };
  }

  async getCommunitySummary(bookId: string, level: 'chapter' | 'book') {
    const communities = await this.prisma.graphCommunity.findMany({
      where: { bookId, level },
      include: {
        members: {
          include: { node: { select: { id: true, label: true, type: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return communities.map((c) => ({
      id: c.id,
      level: c.level,
      summary: c.summary,
      algorithm: c.algorithm,
      members: c.members.map((m) => m.node),
    }));
  }

  /**
   * Multi-hop traversal from every node whose label matches the query
   * (simple substring match — this is a graph lookup, not semantic search;
   * §2's mastery-aware retrieval is the semantic layer that sits on top of
   * this). A recursive CTE is the right tool at single-book scale (hundreds,
   * not millions, of nodes) rather than a dedicated graph database.
   */
  async queryGraph(
    bookId: string,
    query: string,
    maxHops: number = 2,
  ): Promise<GraphQueryHit[]> {
    const hops = Math.min(Math.max(maxHops, 1), 4); // clamp — an unbounded hop count on a
    // recursive CTE is an easy way to accidentally walk the whole graph.

    const rows = await this.prisma.$queryRaw<
      Array<{
        nodeId: string;
        label: string;
        type: string;
        hops: number;
        viaEdgeId: string | null;
        viaRelation: string | null;
      }>
    >`
      WITH RECURSIVE traversal AS (
        SELECT
          n.id AS "nodeId",
          n.label,
          n.type,
          0 AS hops,
          NULL::text AS "viaEdgeId",
          NULL::text AS "viaRelation"
        FROM "GraphNode" n
        WHERE n."bookId" = ${bookId}
          AND n.label ILIKE ${'%' + query + '%'}

        UNION

        -- Both directions. This followed sourceId -> targetId only, so every
        -- inbound edge was invisible: with "Ashoka -promoted-> Buddhism" in the
        -- graph, searching "Buddhism" found nothing, because Ashoka is upstream.
        -- For a feature presented to students as "explore what's connected",
        -- silently hiding half the connections is a correctness failure, not a
        -- ranking one. The CASE picks whichever end of the edge is NOT the node
        -- we arrived from.
        SELECT
          CASE WHEN e."sourceId" = t."nodeId" THEN e."targetId" ELSE e."sourceId" END AS "nodeId",
          n2.label,
          n2.type,
          t.hops + 1 AS hops,
          e.id AS "viaEdgeId",
          e.relation AS "viaRelation"
        FROM traversal t
        JOIN "GraphEdge" e
          ON (e."sourceId" = t."nodeId" OR e."targetId" = t."nodeId")
         AND e."bookId" = ${bookId}
        JOIN "GraphNode" n2
          ON n2.id = CASE WHEN e."sourceId" = t."nodeId" THEN e."targetId" ELSE e."sourceId" END
        WHERE t.hops < ${hops}
      )
      SELECT DISTINCT ON ("nodeId") "nodeId", label, type, hops, "viaEdgeId", "viaRelation"
      FROM traversal
      ORDER BY "nodeId", hops ASC
      LIMIT 100;
    `;

    return rows;
  }
}
