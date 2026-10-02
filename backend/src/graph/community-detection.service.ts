import { Injectable, Inject, Logger } from '@nestjs/common';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { PrismaService } from '../prisma/prisma.service';
import {
  ILlmProvider,
  LLM_PROVIDER,
} from '../rag/interfaces/llm.provider.interface';

interface NodeRow {
  id: string;
  label: string;
  type: string;
  description: string;
  firstChapter: string | null;
}
interface EdgeRow {
  sourceId: string;
  targetId: string;
  relation: string;
}

@Injectable()
export class CommunityDetectionService {
  private readonly logger = new Logger(CommunityDetectionService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
  ) {}

  async buildCommunities(bookId: string): Promise<void> {
    const [nodes, edges] = await Promise.all([
      this.prisma.graphNode.findMany({
        where: { bookId },
        select: {
          id: true,
          label: true,
          type: true,
          description: true,
          firstChapter: true,
        },
      }),
      this.prisma.graphEdge.findMany({
        where: { bookId },
        select: { sourceId: true, targetId: true, relation: true },
      }),
    ]);

    if (nodes.length === 0) return;

    await this.buildBookLevel(bookId, nodes, edges);
    await this.buildChapterLevel(bookId, nodes);
  }

  // ── Book level: Louvain community detection over the whole graph ──────
  //
  // The spec calls for Leiden; no maintained Leiden implementation exists for
  // Node today, so this ships Louvain — the standard predecessor algorithm,
  // same goal (modularity-maximizing community detection), well-documented,
  // not tied to any vendor. GraphCommunity.algorithm records which one ran,
  // so a future Leiden port is a drop-in replacement, not a silent swap.

  private async buildBookLevel(
    bookId: string,
    nodes: NodeRow[],
    edges: EdgeRow[],
  ) {
    const graph = new Graph({
      type: 'undirected',
      multi: false,
      allowSelfLoops: false,
    });
    for (const n of nodes) graph.addNode(n.id);
    for (const e of edges) {
      if (e.sourceId === e.targetId) continue;
      if (!graph.hasNode(e.sourceId) || !graph.hasNode(e.targetId)) continue;
      if (graph.hasEdge(e.sourceId, e.targetId)) continue; // Louvain wants a simple graph
      graph.addEdge(e.sourceId, e.targetId);
    }

    if (graph.size === 0) {
      // Extraction found entities but no relations between them — Louvain on
      // an edgeless graph just gives every node its own community, which is
      // a degenerate, unhelpful result. One whole-book group is more honest.
      await this.summarizeAndPersist(bookId, 'book', nodes, 'none');
      return;
    }

    const assignment: Record<string, number> = louvain(graph);
    const grouped = new Map<number, NodeRow[]>();
    for (const node of nodes) {
      const communityIndex = assignment[node.id];
      if (communityIndex === undefined) continue; // isolated node, not in the edge-having subgraph
      const list = grouped.get(communityIndex) ?? [];
      list.push(node);
      grouped.set(communityIndex, list);
    }

    for (const members of grouped.values()) {
      if (members.length < 2) continue; // a singleton isn't a "throughline" worth summarizing
      await this.summarizeAndPersist(bookId, 'book', members, 'louvain');
    }
  }

  // ── Chapter level: grouped by real ingestion chapter metadata, not a
  // second clustering pass — grounded in the book's actual structure. ──

  private async buildChapterLevel(bookId: string, nodes: NodeRow[]) {
    const byChapter = new Map<string, NodeRow[]>();
    for (const node of nodes) {
      if (!node.firstChapter) continue; // no chapter metadata for this book — skip, don't fabricate one
      const list = byChapter.get(node.firstChapter) ?? [];
      list.push(node);
      byChapter.set(node.firstChapter, list);
    }

    for (const [chapterTitle, members] of byChapter) {
      if (members.length < 2) continue;
      await this.summarizeAndPersist(
        bookId,
        'chapter',
        members,
        'none',
        chapterTitle,
      );
    }
  }

  // ── Summarization + persistence ─────────────────────────────────────

  private async summarizeAndPersist(
    bookId: string,
    level: 'chapter' | 'book',
    members: NodeRow[],
    algorithm: string,
    chapterTitle?: string,
  ) {
    const summary = await this.summarize(members, level, chapterTitle);

    const community = await this.prisma.graphCommunity.create({
      data: { bookId, level, summary, algorithm },
      select: { id: true },
    });

    await this.prisma.graphCommunityMember.createMany({
      data: members.map((m) => ({ communityId: community.id, nodeId: m.id })),
    });
  }

  private async summarize(
    members: NodeRow[],
    level: 'chapter' | 'book',
    chapterTitle?: string,
  ): Promise<string> {
    const listing = members
      .slice(0, 40) // cap prompt size — a community rarely needs more than this to summarize well
      .map((m) => `- ${m.label} (${m.type}): ${m.description}`)
      .join('\n');

    const scope =
      level === 'chapter' ? `the chapter "${chapterTitle}"` : 'the whole book';
    const prompt =
      `These entities were grouped together by ${level === 'book' ? 'graph community detection' : 'appearing together in'} ${scope}:\n\n` +
      `${listing}\n\n` +
      `In 2-3 sentences, describe the throughline connecting them — what theme, plot thread, or ` +
      `relationship makes this a meaningful group. Plain prose, no headers, no restating the list.`;

    try {
      let full = '';
      await this.llmProvider.chatStream(
        [{ role: 'user', content: prompt }],
        (token) => {
          full += token;
        },
      );
      return full.trim() || this.fallbackSummary(members);
    } catch (err: any) {
      this.logger.warn(
        `Community summarization failed, using fallback: ${err.message}`,
      );
      return this.fallbackSummary(members);
    }
  }

  private fallbackSummary(members: NodeRow[]): string {
    return `A group of ${members.length} connected entities: ${members
      .slice(0, 8)
      .map((m) => m.label)
      .join(', ')}${members.length > 8 ? ', …' : ''}.`;
  }
}
