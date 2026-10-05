import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../aws/s3.service';
import { QdrantInitService } from '../../rag/qdrant-init.service';
import { ContentSpineService } from '../../rag/content-spine.service';
import { UpdateBookDto } from '../dto/update-book.dto';
import {
  CreateChapterDto,
  UpdateChapterDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderStructureDto,
} from '../dto/audiobook-builder.dto';
import {
  AccessTier,
  CatalogScope,
  GlobalPublishStatus,
  BookFormatType,
  Prisma,
} from '@prisma/client';
import { isLocalIndexing, qdrantCollectionName } from '../../rag/local/index-config';

// ── Constants ──────────────────────────────────────────────────────────────────
const SYSTEM_TENANT_ID = '__SYSTEM__';
const TIER_HIERARCHY: Record<string, number> = {
  free: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
  diamond: 4,
};

// ── Helper ─────────────────────────────────────────────────────────────────────
export function canAccessTier(
  userTier: string | null,
  bookTier: string,
): boolean {
  const userLevel = TIER_HIERARCHY[(userTier || 'free').toLowerCase()] ?? 0;
  const bookLevel = TIER_HIERARCHY[bookTier.toLowerCase()] ?? 0;
  return userLevel >= bookLevel;
}

// ── Interfaces ─────────────────────────────────────────────────────────────────
export interface CatalogQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  accessTier?: string;
  catalogScope?: string;
  tenantId?: string;
  globalPublishStatus?: string;
}

export interface CatalogStatsResult {
  totalBooks: number;
  globalBooks: number;
  institutionalBooks: number;
  byTier: Record<string, number>;
  pendingApprovals: number;
  globalPublishers: number;
}

@Injectable()
export class SuperAdminCatalogService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private qdrantInit: QdrantInitService,
    private contentSpine: ContentSpineService,
  ) {}

  // ── LIST ALL BOOKS (cross-tenant) ──────────────────────────────────────────
  async findAllBooks(query: CatalogQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    // The live catalogue only — binned books live in the Bin (getBin) until they
    // are restored or purged, and must not appear in any normal listing.
    const where: Prisma.BookWhereInput = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { author: { contains: query.search } },
        { isbn: { contains: query.search } },
      ];
    }
    if (query.accessTier) {
      where.accessTier = query.accessTier.toUpperCase() as AccessTier;
    }
    if (query.catalogScope) {
      where.catalogScope = query.catalogScope.toUpperCase() as CatalogScope;
    }
    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }
    if (query.globalPublishStatus) {
      where.globalPublishStatus =
        query.globalPublishStatus.toUpperCase() as GlobalPublishStatus;
    }

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, domain: true } },
          bookFormats: {
            // partIndex so the catalogue can show WHICH chapters are attached.
            // Without it every markdown row looks identical and there is no way
            // to tell that chapter 9 is missing.
            select: {
              type: true,
              partIndex: true,
              fileSize: true,
              fileUrl: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: [{ type: 'asc' }, { partIndex: 'asc' }],
          },
          categories: {
            include: {
              category: { select: { id: true, name: true, type: true } },
            },
          },
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data: books,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── RECYCLE BIN: LIST BINNED BOOKS ───────────────────────────────────────────
  // The mirror of findAllBooks for soft-deleted books, newest-binned first, so
  // the super-admin can review, restore, or permanently purge them.
  async findBinnedBooks(query: CatalogQueryDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.BookWhereInput = { deletedAt: { not: null } };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { author: { contains: query.search } },
        { isbn: { contains: query.search } },
      ];
    }

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, domain: true } },
          bookFormats: {
            select: {
              type: true,
              partIndex: true,
              fileSize: true,
              fileUrl: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: [{ type: 'asc' }, { partIndex: 'asc' }],
          },
          categories: {
            include: {
              category: { select: { id: true, name: true, type: true } },
            },
          },
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data: books,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── GET SINGLE BOOK ────────────────────────────────────────────────────────
  async findBookById(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, domain: true } },
        bookFormats: {
          // partIndex, or the drawer cannot tell two enriched-markdown rows
          // apart — and a delete button next to two identical-looking rows is
          // worse than no delete button at all.
          select: {
            id: true,
            type: true,
            partIndex: true,
            fileUrl: true,
            fileSize: true,
            mimeType: true,
            metadata: true,
            createdAt: true,
          },
          orderBy: [{ type: 'asc' }, { partIndex: 'asc' }],
        },
        categories: {
          include: {
            category: { select: { id: true, name: true, type: true } },
          },
        },
        mediaFile: true,
      },
    });
    if (!book) throw new NotFoundException('Book not found');
    return book;
  }

  // ── CREATE GLOBAL BOOK ─────────────────────────────────────────────────────
  async createGlobalBook(data: any, userId: string) {
    const { categoryIds, ...bookData } = data;

    // Ensure the system tenant exists (idempotent — needed for first book in existing DBs)
    await this.prisma.tenant.upsert({
      where: { domain: '__system__.internal' },
      update: {},
      create: {
        id: SYSTEM_TENANT_ID,
        name: 'Book Buddy System (Global Catalog)',
        domain: '__system__.internal',
        type: 'UNIVERSITY',
        description: 'Internal system tenant for global catalog books.',
        allowJoinRequests: false,
        isActive: true,
        isGlobalPublisher: true,
      },
    });

    return this.prisma.book.create({
      data: {
        ...bookData,
        tenantId: SYSTEM_TENANT_ID,
        catalogScope: 'GLOBAL' as CatalogScope,
        globalPublishStatus: 'APPROVED' as GlobalPublishStatus,
        globalPublishReviewedBy: userId,
        globalPublishReviewedAt: new Date(),
        // Defaults
        format: bookData.format || 'pdf',
        genre: bookData.genre || 'General',
        accessTier:
          (bookData.accessTier?.toUpperCase() as AccessTier) || 'FREE',

        // Relational categories mapping
        ...(categoryIds?.length > 0 && {
          categories: {
            create: categoryIds.map((id: string) => ({
              category: { connect: { id } },
            })),
          },
        }),
      },
      include: {
        categories: { include: { category: true } },
      },
    });
  }

  // ── UPDATE BOOK ────────────────────────────────────────────────────────────
  async updateBook(id: string, data: UpdateBookDto) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: { coverKey: true, backCoverKey: true, sampleFileKey: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    // S3 Cleanup for replaced files
    if (data.coverKey && book.coverKey && book.coverKey !== data.coverKey) {
      await this.s3Service.deleteFile(book.coverKey);
    }
    if (
      data.backCoverKey &&
      book.backCoverKey &&
      book.backCoverKey !== data.backCoverKey
    ) {
      await this.s3Service.deleteFile(book.backCoverKey);
    }
    if (
      data.sampleFileKey &&
      book.sampleFileKey &&
      book.sampleFileKey !== data.sampleFileKey
    ) {
      await this.s3Service.deleteFile(book.sampleFileKey);
    }

    // Separate categoryIds from scalar fields
    const { categoryIds, ...scalarFields } = data;

    // Build Prisma-compatible update payload
    const prismaData: Prisma.BookUpdateInput = {};

    // Copy scalar fields, normalizing enums to uppercase
    if (scalarFields.title !== undefined) prismaData.title = scalarFields.title;
    if (scalarFields.author !== undefined)
      prismaData.author = scalarFields.author;
    if (scalarFields.publisher !== undefined)
      prismaData.publisher = scalarFields.publisher;
    if (scalarFields.publishYear !== undefined)
      prismaData.publishYear = scalarFields.publishYear;
    if (scalarFields.isbn !== undefined) prismaData.isbn = scalarFields.isbn;
    if (scalarFields.pages !== undefined) prismaData.pages = scalarFields.pages;
    if (scalarFields.language !== undefined)
      prismaData.language = scalarFields.language;
    if (scalarFields.description !== undefined)
      prismaData.description = scalarFields.description;
    if (scalarFields.genre !== undefined) prismaData.genre = scalarFields.genre;
    if (scalarFields.format !== undefined)
      prismaData.format = scalarFields.format;
    if (scalarFields.accessTier !== undefined)
      prismaData.accessTier =
        scalarFields.accessTier.toUpperCase() as AccessTier;
    if (scalarFields.licenseType !== undefined)
      prismaData.licenseType = scalarFields.licenseType;
    if (scalarFields.catalogScope !== undefined)
      prismaData.catalogScope =
        scalarFields.catalogScope.toUpperCase() as CatalogScope;
    if (scalarFields.aiEmbedEnabled !== undefined)
      prismaData.aiEmbedEnabled = scalarFields.aiEmbedEnabled;
    if (scalarFields.available !== undefined)
      prismaData.available = scalarFields.available;
    if (scalarFields.drmProtected !== undefined)
      prismaData.drmProtected = scalarFields.drmProtected;
    if (scalarFields.streamable !== undefined)
      prismaData.streamable = scalarFields.streamable;

    // Cover & media fields
    if (scalarFields.coverUrl !== undefined)
      prismaData.coverUrl = scalarFields.coverUrl;
    if (scalarFields.coverKey !== undefined)
      prismaData.coverKey = scalarFields.coverKey;
    if (scalarFields.backCoverUrl !== undefined)
      prismaData.backCoverUrl = scalarFields.backCoverUrl;
    if (scalarFields.backCoverKey !== undefined)
      prismaData.backCoverKey = scalarFields.backCoverKey;
    if (scalarFields.sampleFileUrl !== undefined)
      prismaData.sampleFileUrl = scalarFields.sampleFileUrl;
    if (scalarFields.sampleFileKey !== undefined)
      prismaData.sampleFileKey = scalarFields.sampleFileKey;

    // Handle relational categories update
    if (categoryIds !== undefined) {
      // First delete existing junctions
      await this.prisma.bookCategoryOnBook.deleteMany({
        where: { bookId: id },
      });
      // Then re-create
      if (categoryIds.length > 0) {
        prismaData.categories = {
          create: categoryIds.map((catId: string) => ({
            category: { connect: { id: catId } },
          })),
        };
      }
    }

    return this.prisma.book.update({
      where: { id },
      data: prismaData,
      include: { categories: { include: { category: true } } },
    });
  }

  // ── DELETE BOOK → RECYCLE BIN (soft delete) ──────────────────────────────────
  // A "delete" no longer destroys anything: it moves the book to the Bin, where
  // it is hidden from every catalogue but fully recoverable. Nothing in storage,
  // the shared index or the graph is touched here — that only happens on an
  // explicit purge (purgeBook). Idempotent: re-binning an already-binned book is
  // a no-op that refreshes who/when.
  async deleteBook(id: string, deletedBy?: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    return this.prisma.book.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: deletedBy ?? null },
    });
  }

  // ── RESTORE FROM BIN ─────────────────────────────────────────────────────────
  async restoreBook(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });
    if (!book) throw new NotFoundException('Book not found');
    if (!book.deletedAt)
      throw new BadRequestException('This book is not in the Bin.');

    return this.prisma.book.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
  }

  // ── PURGE (permanent delete) ─────────────────────────────────────────────────
  /**
   * Permanently and completely removes ONE book — and only that book. A purge is
   * only allowed from the Bin (the book must already be soft-deleted), so it is
   * always a deliberate two-step action, never a single mis-click.
   *
   * What it flushes, scoped strictly to this book:
   *  1. Cloudflare R2 objects: front/back cover, sample, and every format file
   *     (PDF/EPUB/audio/markdown) — by their exact storage keys.
   *  2. The shared trio index (embeddings): the book's canonical work is resolved
   *     to a content_item_id and only that work's vectors are removed. Preferred
   *     path is DCP's purge endpoint (TRIO_PURGE_URL, symmetric to ingestion),
   *     which also clears the spine's Postgres rows DCP owns; if unconfigured we
   *     fall back to deleting the Qdrant points directly by content_item_id.
   *  3. All Book Buddy-owned rows: the Book row and everything that cascades from it —
   *     formats, chunk mappings, quizzes, digests, annotations, chat, and the
   *     WHOLE graph (nodes, edges, communities, embeddings) via onDelete: Cascade.
   *
   * Nothing here is keyed by anything but this book's id / content_item_id, so no
   * other book is affected. Storage and index flushes run before the DB delete
   * and are reported (not silently swallowed) so an operator sees any residue.
   */
  async purgeBook(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { bookFormats: { select: { metadata: true, fileUrl: true } } },
    });
    if (!book) throw new NotFoundException('Book not found');
    if (!book.deletedAt) {
      throw new BadRequestException(
        'A book must be in the Bin before it can be permanently deleted. Delete it first, then purge from the Bin.',
      );
    }

    // 1. Collect every R2 key this book owns, then delete them.
    const keys = new Set<string>();
    if (book.coverKey) keys.add(book.coverKey);
    if (book.backCoverKey) keys.add(book.backCoverKey);
    if (book.sampleFileKey) keys.add(book.sampleFileKey);
    for (const fmt of book.bookFormats) {
      const key =
        (fmt.metadata as any)?.s3Key ?? this.storageKeyFromUrl(fmt.fileUrl);
      if (key) keys.add(key);
    }
    const storage = await this.flushStorage([...keys]);

    // 2. Flush the shared index (embeddings) for this book's work only.
    const embeddings = await this.flushSharedIndex(id);

    // 3. Delete the book row; cascades take the rest (graph included).
    await this.prisma.book.delete({ where: { id } });
    this.contentSpine.invalidate(id);

    return {
      purged: { id: book.id, title: book.title },
      storage,
      embeddings,
      dbDeleted: true,
    };
  }

  /** Delete a set of R2 objects, reporting which succeeded and which did not. */
  private async flushStorage(keys: string[]): Promise<{
    attempted: number;
    deleted: number;
    failed: string[];
  }> {
    const results = await Promise.allSettled(
      keys.map((k) => this.s3Service.deleteFileOrThrow(k)),
    );
    const failed = keys.filter((_, i) => results[i].status === 'rejected');
    return {
      attempted: keys.length,
      deleted: keys.length - failed.length,
      failed,
    };
  }

  /**
   * Remove this book's embeddings from the shared trio index. See purgeBook for
   * why the two paths exist. Non-fatal: a failure here is reported, never thrown,
   * so a storage/index hiccup cannot strand a book half-deleted in the Bin — the
   * DB delete still proceeds and the operator sees exactly what was left behind.
   */
  private async flushSharedIndex(bookId: string): Promise<{
    method: 'dcp' | 'qdrant' | 'none';
    contentItemId: string | null;
    ok: boolean;
    detail: string;
  }> {
    const contentItemId = await this.contentSpine.resolveContentItemId(bookId);
    if (!contentItemId) {
      return {
        method: 'none',
        contentItemId: null,
        ok: true,
        detail:
          'Book was never indexed — no embeddings to remove.',
      };
    }

    // Preferred: ask DCP (the spine's owner) to fully purge the work, mirroring
    // how ingestion proxies to DCP. This also clears the spine's Postgres rows,
    // which Book Buddy's read-only connection cannot touch.
    // Not in self-contained mode: the index is Book Buddy's own, so there is no one to ask.
    const purgeUrl = isLocalIndexing() ? undefined : process.env.TRIO_PURGE_URL;
    const secret = process.env.TRIO_SERVICE_SECRET;
    if (purgeUrl && secret) {
      try {
        const res = await fetch(purgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Secret': secret,
          },
          body: JSON.stringify({
            app: 'bookbuddy',
            localId: bookId,
            contentItemId,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(
            `DCP purge returned ${res.status}: ${body.slice(0, 200)}`,
          );
        }
        return {
          method: 'dcp',
          contentItemId,
          ok: true,
          detail:
            'Requested full purge from DCP (vectors + spine rows removed).',
        };
      } catch (err: any) {
        return {
          method: 'dcp',
          contentItemId,
          ok: false,
          detail: `DCP purge failed (${err?.message ?? 'unknown'}). Vectors may remain in the shared index; ask DCP to purge content_item ${contentItemId}.`,
        };
      }
    }

    // Fallback: delete this work's Qdrant points directly by content_item_id.
    // Only this content_item is matched, so no other book is affected. The
    // spine's Postgres rows (content_item/content_chunk) remain — only DCP can
    // remove those — so this is reported as partial.
    try {
      const collection =
        qdrantCollectionName();
      const client = this.qdrantInit.getClient();
      await client.delete(collection, {
        filter: {
          must: [{ key: 'content_item_id', match: { value: contentItemId } }],
        },
        wait: true,
      });
      return {
        method: 'qdrant',
        contentItemId,
        ok: true,
        detail: isLocalIndexing()
          ? "Deleted this book's passages from Book Buddy's search index."
          : "Deleted this book's vectors directly from the shared collection. " +
            'Spine metadata rows (owned by DCP) were left intact; set TRIO_PURGE_URL for a full flush.',
      };
    } catch (err: any) {
      return {
        method: 'qdrant',
        contentItemId,
        ok: false,
        detail: `Direct Qdrant delete failed (${err?.message ?? 'unknown'}). Vectors for content_item ${contentItemId} may remain.`,
      };
    }
  }

  // ── GRAPH BACKFILL ───────────────────────────────────────────────────────────
  /**
   * Book ids that should have a pre-generated entity graph but don't yet. New
   * books build theirs at ingest (Stage 2); this finds the pre-Stage-2 catalogue
   * — ingested (READY, or with local chunk mappings) but with zero graph nodes —
   * so an admin can backfill them in one shot. `force` re-lists every ingested
   * book to rebuild all of them. Binned books are never included.
   */
  async listBookIdsNeedingGraph(force = false): Promise<string[]> {
    const books = await this.prisma.book.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        embeddingStatus: true,
        _count: { select: { graphNodes: true, bookChunkMappings: true } },
      },
    });
    return books
      .filter((b) => {
        const ingested =
          b.embeddingStatus === 'READY' || b._count.bookChunkMappings > 0;
        return ingested && (force || b._count.graphNodes === 0);
      })
      .map((b) => b.id);
  }

  // ── CHANGE TIER ────────────────────────────────────────────────────────────
  async changeTier(id: string, tier: string) {
    const normalized = tier.toUpperCase();
    if (!Object.keys(TIER_HIERARCHY).includes(normalized.toLowerCase())) {
      throw new BadRequestException(
        `Invalid tier: ${tier}. Must be one of: FREE, BRONZE, SILVER, GOLD, DIAMOND`,
      );
    }
    return this.prisma.book.update({
      where: { id },
      data: { accessTier: normalized as AccessTier },
    });
  }

  // ── TOGGLE SCOPE ───────────────────────────────────────────────────────────
  async toggleScope(id: string, scope: string) {
    const normalized = scope.toUpperCase();
    if (!['GLOBAL', 'INSTITUTIONAL'].includes(normalized)) {
      throw new BadRequestException('Scope must be GLOBAL or INSTITUTIONAL');
    }
    return this.prisma.book.update({
      where: { id },
      data: { catalogScope: normalized as CatalogScope },
    });
  }

  // ── APPROVAL QUEUE ─────────────────────────────────────────────────────────
  async getApprovalQueue(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { globalPublishStatus: 'PENDING' as GlobalPublishStatus };

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { globalPublishRequestedAt: 'desc' },
        include: {
          tenant: { select: { id: true, name: true, domain: true } },
        },
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data: books,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveBook(id: string, tier: string, reviewerId: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.globalPublishStatus !== 'PENDING') {
      throw new BadRequestException('Book is not pending approval');
    }

    const normalizedTier = tier.toUpperCase();
    if (!Object.keys(TIER_HIERARCHY).includes(normalizedTier.toLowerCase())) {
      throw new BadRequestException(`Invalid tier: ${tier}`);
    }

    return this.prisma.book.update({
      where: { id },
      data: {
        catalogScope: 'GLOBAL' as CatalogScope,
        globalPublishStatus: 'APPROVED' as GlobalPublishStatus,
        accessTier: normalizedTier as AccessTier,
        globalPublishReviewedAt: new Date(),
        globalPublishReviewedBy: reviewerId,
      },
    });
  }

  async rejectBook(id: string, note: string, reviewerId: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.globalPublishStatus !== 'PENDING') {
      throw new BadRequestException('Book is not pending approval');
    }

    return this.prisma.book.update({
      where: { id },
      data: {
        globalPublishStatus: 'REJECTED' as GlobalPublishStatus,
        globalPublishReviewedAt: new Date(),
        globalPublishReviewedBy: reviewerId,
        globalPublishRejectionNote: note,
      },
    });
  }

  // ── PUBLISHER MANAGEMENT ───────────────────────────────────────────────────
  async togglePublisher(tenantId: string) {
    if (tenantId === SYSTEM_TENANT_ID) {
      throw new BadRequestException('Cannot modify the system tenant');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isGlobalPublisher: !tenant.isGlobalPublisher },
    });
  }

  async getPublisherTenants() {
    return this.prisma.tenant.findMany({
      where: { id: { not: SYSTEM_TENANT_ID }, deletedAt: null },
      select: {
        id: true,
        name: true,
        domain: true,
        type: true,
        isGlobalPublisher: true,
        isActive: true,
        _count: {
          select: {
            books: { where: { catalogScope: 'GLOBAL' as CatalogScope } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── CATALOG STATS ──────────────────────────────────────────────────────────
  async getCatalogStats(): Promise<CatalogStatsResult> {
    const [
      totalBooks,
      globalBooks,
      institutionalBooks,
      freeTier,
      bronzeTier,
      silverTier,
      goldTier,
      diamondTier,
      pendingApprovals,
      globalPublishers,
    ] = await Promise.all([
      // Counts describe the LIVE catalogue only — binned books are excluded
      // everywhere they are excluded from listings.
      this.prisma.book.count({ where: { deletedAt: null } }),
      this.prisma.book.count({
        where: { deletedAt: null, catalogScope: 'GLOBAL' },
      }),
      this.prisma.book.count({
        where: { deletedAt: null, catalogScope: 'INSTITUTIONAL' },
      }),
      this.prisma.book.count({
        where: { deletedAt: null, accessTier: 'FREE' },
      }),
      this.prisma.book.count({
        where: { deletedAt: null, accessTier: 'BRONZE' },
      }),
      this.prisma.book.count({
        where: { deletedAt: null, accessTier: 'SILVER' },
      }),
      this.prisma.book.count({
        where: { deletedAt: null, accessTier: 'GOLD' },
      }),
      this.prisma.book.count({
        where: { deletedAt: null, accessTier: 'DIAMOND' },
      }),
      this.prisma.book.count({
        where: { deletedAt: null, globalPublishStatus: 'PENDING' },
      }),
      this.prisma.tenant.count({
        where: { isGlobalPublisher: true, id: { not: SYSTEM_TENANT_ID } },
      }),
    ]);

    return {
      totalBooks,
      globalBooks,
      institutionalBooks,
      byTier: {
        free: freeTier,
        bronze: bronzeTier,
        silver: silverTier,
        gold: goldTier,
        diamond: diamondTier,
      },
      pendingApprovals,
      globalPublishers,
    };
  }

  // ── INSTITUTION SUBMIT TO GLOBAL ───────────────────────────────────────────
  async submitToGlobal(bookId: string, userId: string, tenantId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');
    if (book.tenantId !== tenantId) {
      throw new ForbiddenException(
        'You can only submit books from your own institution',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant?.isGlobalPublisher) {
      throw new ForbiddenException(
        'Your institution is not authorized to submit to the global catalog',
      );
    }

    if (book.globalPublishStatus === 'PENDING') {
      throw new BadRequestException('This book is already pending approval');
    }
    if (book.globalPublishStatus === 'APPROVED') {
      throw new BadRequestException(
        'This book is already in the global catalog',
      );
    }

    return this.prisma.book.update({
      where: { id: bookId },
      data: {
        globalPublishStatus: 'PENDING' as GlobalPublishStatus,
        globalPublishRequestedAt: new Date(),
        globalPublishRequestedBy: userId,
        globalPublishRejectionNote: null,
      },
    });
  }

  // ── PRESIGNED UPLOAD URL FOR BOOK FORMATS ─────────────────────────────────
  async getBookUploadUrl(
    bookId: string,
    format: string,
    filename: string,
    mimeType: string,
  ) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    const key = this.s3Service.buildBookFileKey({
      tenantId: null, // global catalog books use null (maps to "global/" prefix)
      bookId,
      format,
      filename,
    });

    const result = await this.s3Service.getPresignedUploadUrl({
      key,
      mimeType,
      format,
    });

    return { ...result, key };
  }

  // ── PRESIGNED UPLOAD URLs FOR COVERS AND SAMPLES ────────────────────────
  async getCoverUploadUrl(
    bookId: string,
    side: 'front' | 'back',
    filename: string,
    mimeType: string,
  ) {
    const key = this.s3Service.buildCoverKey({ bookId, side, filename });
    const result = await this.s3Service.getPresignedUploadUrl({
      key,
      mimeType,
      format: 'cover',
    });
    return { ...result, key };
  }

  async getSampleUploadUrl(bookId: string, filename: string, mimeType: string) {
    const key = this.s3Service.buildSampleKey({ bookId, filename });
    const result = await this.s3Service.getPresignedUploadUrl({
      key,
      mimeType,
      format: 'sample',
    });
    return { ...result, key };
  }

  // ── CATEGORIES ────────────────────────────────────────────────────────────
  async getCategories(type?: string) {
    const where = type ? { type: type.toUpperCase() } : {};
    return this.prisma.bookCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(data: {
    name: string;
    type?: string;
    parentId?: string;
  }) {
    return this.prisma.bookCategory.create({
      data: {
        name: data.name,
        type: data.type ? data.type.toUpperCase() : 'GENRE',
        parentId: data.parentId,
      },
    });
  }

  // ── CONFIRM UPLOAD (create BookFormat record) ─────────────────────────────
  async confirmBookUpload(
    bookId: string,
    data: {
      format: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      s3Key: string;
      /**
       * Which chapter this file is. Only meaningful for AI_EMBED; whole-book
       * renditions (PDF, EPUB, audiobook) stay at part 0.
       */
      partIndex?: number;
    },
  ) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    const formatType = data.format.toUpperCase() as BookFormatType;

    // Only enriched markdown is per-chapter. A PDF or an audiobook is the whole
    // work, and letting those carry a part index would quietly permit several
    // "the PDF" rows per book.
    const partIndex =
      formatType === 'AI_EMBED' ? Math.trunc(Number(data.partIndex ?? 0)) : 0;

    if (
      formatType === 'AI_EMBED' &&
      (!Number.isFinite(partIndex) || partIndex < 1)
    ) {
      throw new BadRequestException(
        'Enriched markdown needs the chapter number it belongs to. It is read from the ' +
          "file's own chapter_number frontmatter, and part 0 is reserved for whole-book " +
          'renditions — without it, uploading chapter 9 would overwrite chapter 8.',
      );
    }

    // Which object this slot held before, so replacing a file does not abandon
    // it in the bucket. Upload keys are timestamp-prefixed, so re-uploading the
    // same chapter writes a NEW key and the update below overwrites the only
    // reference to the old one — after which nothing in the system knows the
    // object exists, and it is billed forever. Best-effort on purpose: a
    // storage hiccup should not fail an upload that otherwise succeeded.
    const superseded = await this.prisma.bookFormat.findUnique({
      where: { bookId_type_partIndex: { bookId, type: formatType, partIndex } },
      select: { metadata: true },
    });

    // Upsert per (book, format, part): one PDF, and one markdown per chapter.
    const saved = await this.prisma.bookFormat.upsert({
      where: { bookId_type_partIndex: { bookId, type: formatType, partIndex } },
      create: {
        bookId,
        type: formatType,
        partIndex,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        metadata: { s3Key: data.s3Key },
      },
      update: {
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        metadata: { s3Key: data.s3Key },
      },
    });

    const oldKey = (superseded?.metadata as any)?.s3Key;
    if (oldKey && oldKey !== data.s3Key) {
      await this.s3Service.deleteFile(oldKey);
    }

    return saved;
  }

  /**
   * Delete ONE format file — this PDF, this audiobook, this chapter's enriched
   * markdown — removing both the catalogue row and the object in storage.
   *
   * Storage first, and awaited. The two deletions cannot be made atomic across
   * a database and a bucket, so the order decides which way a half-failure
   * lands: delete the row first and a storage error leaves an object nothing
   * references (invisible, unrecoverable, still billed), while deleting the
   * object first leaves a row the operator can see and retry. A visible failure
   * beats a silent orphan, so the row is the last thing to go.
   */
  async deleteBookFormat(bookId: string, formatId: string) {
    const format = await this.prisma.bookFormat.findUnique({
      where: { id: formatId },
      select: {
        id: true,
        bookId: true,
        type: true,
        partIndex: true,
        fileUrl: true,
        metadata: true,
      },
    });

    // Checked against the book in the path, not just found by id: without this
    // a format id from any book would delete through whichever book the caller
    // happened to name.
    if (!format || format.bookId !== bookId) {
      throw new NotFoundException('Format file not found on this book');
    }

    // metadata.s3Key is what every upload records, but rows written by earlier
    // versions may not have it. The public URL contains the key, so derive it
    // rather than refusing to delete — and refuse only if neither is available,
    // because deleting the row without the key is precisely the orphan case.
    const key =
      (format.metadata as any)?.s3Key ?? this.storageKeyFromUrl(format.fileUrl);
    if (!key) {
      throw new BadRequestException(
        'This format has no storage key and none could be read from its URL, so the ' +
          'file cannot be removed from the server. Deleting the row alone would leave the ' +
          'file behind with nothing pointing at it.',
      );
    }

    try {
      await this.s3Service.deleteFileOrThrow(key);
    } catch (err: any) {
      throw new BadRequestException(
        `The file could not be deleted from storage (${err?.message ?? 'unknown error'}). ` +
          'Nothing was removed from the catalogue — try again.',
      );
    }

    await this.prisma.bookFormat.delete({ where: { id: formatId } });

    // Enriched markdown has a second life outside this row: its text is chunked
    // and embedded in the shared trio spine, which DCP owns and Book Buddy has no
    // delete path into. So the file is gone but the tutor can still answer from
    // it. Say so instead of implying a clean removal — an operator who thinks a
    // chapter is fully gone will not think to re-ingest.
    const spineResidue = format.type === 'AI_EMBED';
    if (spineResidue) {
      await this.prisma.book.update({
        where: { id: bookId },
        data: { embeddingStatus: 'NONE' },
      });
      await this.prisma.bookEmbeddingStatus
        .update({
          where: { bookId },
          data: {
            status: 'NONE',
            errorMessage:
              `Chapter ${format.partIndex} markdown was deleted on ${new Date().toISOString()}. ` +
              'Its embedded chunks remain in the shared index until the book is re-ingested.',
          },
        })
        .catch(() => {
          /* no status row yet — nothing to invalidate */
        });
    }

    return {
      deleted: {
        id: format.id,
        type: format.type,
        partIndex: format.partIndex,
      },
      storageKey: key,
      spineResidue,
    };
  }

  /** Recover the bucket key from a public file URL (`https://host/<key>`). */
  private storageKeyFromUrl(fileUrl: string | null): string | null {
    if (!fileUrl) return null;
    try {
      const path = new URL(fileUrl).pathname.replace(/^\/+/, '');
      return path ? decodeURIComponent(path) : null;
    } catch {
      return null;
    }
  }

  // ── AUDIOBOOK BUILDER ──────────────────────────────────────────────────────
  async getAudiobookStructure(bookId: string) {
    const chapters = await this.prisma.audioChapter.findMany({
      where: { bookId },
      orderBy: { sortOrder: 'asc' },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { tracks: true },
        },
      },
    });

    return {
      chapters: chapters.map((c) => {
        let derivedType = 'CHAPTER';
        const lowerTitle = c.title.toLowerCase();
        if (
          lowerTitle.includes('intro') ||
          lowerTitle.includes('foreword') ||
          lowerTitle.includes('preface')
        ) {
          derivedType = 'INTRO';
        } else if (lowerTitle.includes('appendix')) {
          derivedType = 'APPENDIX';
        }
        return {
          id: c.id,
          title: c.title,
          type: derivedType,
          sortOrder: c.sortOrder,
        };
      }),
      sections: chapters.flatMap((c) =>
        c.sections.map((s) => ({
          id: s.id,
          chapterId: c.id,
          title: s.title,
          sortOrder: s.sortOrder,
          durationMs: s.durationSeconds ? s.durationSeconds * 1000 : null,
          tracks: s.tracks.map((t) => ({
            id: t.id,
            gender: t.gender,
            fileUrl: t.fileUrl,
            durationMs: t.durationSeconds * 1000,
          })),
        })),
      ),
    };
  }

  async createChapter(bookId: string, dto: CreateChapterDto) {
    const maxOrder = await this.prisma.audioChapter.aggregate({
      where: { bookId },
      _max: { sortOrder: true },
    });
    return this.prisma.audioChapter.create({
      data: {
        bookId,
        title: dto.title ?? 'New Chapter',
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateChapter(
    bookId: string,
    chapterId: string,
    dto: UpdateChapterDto,
  ) {
    const chapter = await this.prisma.audioChapter.findFirst({
      where: { id: chapterId, bookId },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');

    return this.prisma.audioChapter.update({
      where: { id: chapterId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
      },
    });
  }

  async deleteChapter(bookId: string, chapterId: string) {
    const chapter = await this.prisma.audioChapter.findFirst({
      where: { id: chapterId, bookId },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');
    await this.prisma.audioChapter.delete({ where: { id: chapterId } });
    return { success: true };
  }

  async createSection(
    bookId: string,
    chapterId: string,
    dto: CreateSectionDto,
  ) {
    const chapter = await this.prisma.audioChapter.findFirst({
      where: { id: chapterId, bookId },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');

    const maxOrder = await this.prisma.audioSection.aggregate({
      where: { chapterId },
      _max: { sortOrder: true },
    });
    return this.prisma.audioSection.create({
      data: {
        chapterId,
        title: dto.title ?? 'New Section',
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateSection(
    bookId: string,
    chapterId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ) {
    const section = await this.prisma.audioSection.findFirst({
      where: { id: sectionId, chapterId, chapter: { bookId } },
    });
    if (!section) throw new NotFoundException('Section not found');
    return this.prisma.audioSection.update({
      where: { id: sectionId },
      data: { ...(dto.title !== undefined && { title: dto.title }) },
    });
  }

  async deleteSection(bookId: string, chapterId: string, sectionId: string) {
    const section = await this.prisma.audioSection.findFirst({
      where: { id: sectionId, chapterId, chapter: { bookId } },
    });
    if (!section) throw new NotFoundException('Section not found');
    await this.prisma.audioSection.delete({ where: { id: sectionId } });
    return { success: true };
  }

  async getAudioUploadUrl(
    bookId: string,
    sectionId: string,
    gender: 'MALE' | 'FEMALE',
    filename: string,
    mimeType: string,
  ) {
    // Validate book and section exist
    const section = await this.prisma.audioSection.findFirst({
      where: { id: sectionId, chapter: { bookId } },
    });
    if (!section) throw new NotFoundException('Section not found');

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const key = `global/books/${bookId}/audio/${sectionId}/${gender}/${Date.now()}-${sanitizedFilename}`;

    return this.s3Service.getPresignedUploadUrl({
      key,
      mimeType,
      format: 'audiobook',
    });
  }

  async saveAudioTracks(
    bookId: string,
    sectionId: string,
    params: {
      gender: 'MALE' | 'FEMALE';
      fileUrl: string;
      durationSeconds: number;
      fileSizeBytes?: number;
    },
  ) {
    const section = await this.prisma.audioSection.findFirst({
      where: { id: sectionId, chapter: { bookId } },
    });
    if (!section) throw new NotFoundException('Section not found');

    // Extract the relative path if the fileUrl is a full URL from CDN
    let relativeUrl = params.fileUrl;
    try {
      const parsedUrl = new URL(params.fileUrl);
      // CDN urls typcally end with /bucket/... or we just store relative.
      // The old save tracks expected relative path for the key. S3Service returned publicUrl and uploadUrl.
      // Let's just trust what the frontend sends if it's the raw string, or clean it.
      // Generally we want to store the key.
      const urlConfigBase = process.env.CDN_BASE_URL || '';
      if (urlConfigBase && relativeUrl.startsWith(urlConfigBase)) {
        relativeUrl = relativeUrl.substring(urlConfigBase.length);
        if (relativeUrl.startsWith('/')) relativeUrl = relativeUrl.substring(1);
      } else {
        relativeUrl = parsedUrl.pathname.substring(1); // fallback
      }
    } catch {
      // It's already a relative key
    }

    const existing = await this.prisma.audioTrack.findFirst({
      where: { sectionId, gender: params.gender },
    });

    const fileSizeBytesBigInt = params.fileSizeBytes
      ? BigInt(params.fileSizeBytes)
      : null;

    let track;
    if (existing) {
      track = await this.prisma.audioTrack.update({
        where: { id: existing.id },
        data: {
          fileUrl: relativeUrl,
          durationSeconds: params.durationSeconds,
          fileSizeBytes: fileSizeBytesBigInt,
        },
      });
    } else {
      track = await this.prisma.audioTrack.create({
        data: {
          sectionId,
          gender: params.gender,
          fileUrl: relativeUrl,
          durationSeconds: params.durationSeconds,
          fileSizeBytes: fileSizeBytesBigInt,
        },
      });
    }

    return {
      ...track,
      fileSizeBytes: track.fileSizeBytes
        ? track.fileSizeBytes.toString()
        : null,
    };
  }

  async reorderStructure(bookId: string, dto: ReorderStructureDto) {
    await this.prisma.$transaction([
      ...dto.chapters.map((item) =>
        this.prisma.audioChapter.updateMany({
          where: { id: item.id, bookId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
      ...dto.sections.map((item) =>
        this.prisma.audioSection.updateMany({
          where: { id: item.id, chapter: { bookId } },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    ]);
    return { success: true };
  }
}
