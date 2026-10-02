import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TaxonomyClientService,
  TaxonomyNodeDTO,
} from './taxonomy-client.service';

/**
 * Book tagging against the shared cross-repo taxonomy — the curriculum
 * classification (board/class/subject/degree/exam) used to scope retrieval, distinct
 * from `BookCategory` (general reading genre, unaffected by this).
 *
 * Writes go to the Taxonomy Service first (source of truth), then mirror the
 * resolved set onto `Book.taxonomyNodeIds`/`taxonomyPrimaryNodeId` locally so
 * ingestion and retrieval never need a live call to Vidyaverse on their hot path —
 * same write-through-cache shape as the taxonomy service's own tree cache.
 */
@Injectable()
export class BookTaxonomyService {
  private readonly logger = new Logger(BookTaxonomyService.name);

  constructor(
    private prisma: PrismaService,
    private taxonomyClient: TaxonomyClientService,
  ) {}

  async getTree(domain: string): Promise<TaxonomyNodeDTO[]> {
    return this.taxonomyClient.getTree(domain);
  }

  async getBookTaxonomy(bookId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, taxonomyNodeIds: true, taxonomyPrimaryNodeId: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    // Read from the LOCAL columns, not the hub.
    //
    // The hub's per-book link table (`taxonomy.book_taxonomy_links`, keyed on
    // (app, bookId)) was deliberately dropped when the shared content spine
    // replaced it with `content_taxonomy_link`, keyed on the canonical work.
    // The endpoint still exists and now fails against a table that is gone, so
    // asking it "what is this book tagged with" reliably answered "nothing".
    // These columns are the tags this app actually stores and filters on.
    const links = book.taxonomyNodeIds.map((nodeId) => ({
      nodeId,
      isPrimary: nodeId === book.taxonomyPrimaryNodeId,
    }));
    return { bookId, links };
  }

  async setBookTaxonomy(
    bookId: string,
    links: Array<{ nodeId: string; isPrimary?: boolean }>,
  ) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    // Write LOCALLY, and treat the hub as a best-effort mirror.
    //
    // This used to call the hub FIRST and throw on failure, so when the hub's
    // per-book link table was dropped by the spine migration, every save threw
    // before the local columns were written — tagging a book failed completely,
    // and the only visible trace was "Error: [object Object]". The tags the
    // catalogue and retrieval filter actually read live here, so this is what
    // has to succeed.
    const primary = links.find((l) => l.isPrimary) ?? links[0];
    await this.prisma.book.update({
      where: { id: bookId },
      data: {
        taxonomyNodeIds: links.map((l) => l.nodeId),
        taxonomyPrimaryNodeId: primary?.nodeId ?? null,
      },
    });

    // Best-effort, and loudly logged. Kept rather than deleted because the hub
    // endpoint is the intended home for cross-app tagging once it is repointed
    // at the canonical work — but a book must not fail to tag because a mirror
    // is unavailable.
    if (this.taxonomyClient.isConfigured()) {
      try {
        await this.taxonomyClient.setBookLinks(bookId, links);
      } catch (err) {
        this.logger.warn(
          `Book ${bookId} tagged locally, but the taxonomy hub mirror failed: ${(err as Error).message}`,
        );
      }
    }

    return {
      bookId,
      links: links.map((l) => ({
        nodeId: l.nodeId,
        isPrimary: l.nodeId === (primary?.nodeId ?? null),
      })),
    };
  }
}
