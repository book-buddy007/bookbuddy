import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookAccessService } from '../common/book-access.service';
import { S3Service } from '../aws/s3.service';
import { SecureLinksService } from '../drm/secure-links.service';
import { Prisma } from '@prisma/client';

/**
 * Public (student-facing) book catalog service.
 *
 * Serves the shared catalog consumed by the web app, and the iOS/Android
 * apps. All heavy admin operations live in SuperAdminCatalogService — this
 * service only exposes read/consume flows plus borrow/return.
 */
@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly secureLinks: SecureLinksService,
    private readonly bookAccess: BookAccessService,
  ) {}

  /** Map incoming (frontend) format filters to the Prisma enum members. */
  private normalizeFormat(format?: string): string | undefined {
    if (!format) return undefined;
    const map: Record<string, string> = {
      PDF: 'PDF',
      E_BOOK: 'EPUB',
      EBOOK: 'EPUB',
      EPUB: 'EPUB',
      AUDIO_BOOK: 'AUDIOBOOK',
      AUDIOBOOK: 'AUDIOBOOK',
      AI_EMBED: 'AI_EMBED',
    };
    return map[format.toUpperCase()] ?? format.toUpperCase();
  }

  /** Shape a Book row (with relations) into the API response the clients expect. */
  private mapBook(b: any) {
    return {
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      coverUrl: b.coverUrl,
      backCoverUrl: b.backCoverUrl,
      description: b.description,
      publisher: b.publisher,
      publishYear: b.publishYear,
      pages: b.pages,
      language: b.language,
      accessTier: (b.accessTier ?? 'free').toUpperCase(),
      drmProtected: b.drmProtected,
      streamable: b.streamable,
      available: b.available,
      availableCopies: b.availableCopies,
      totalCopies: b.totalCopies,
      createdAt: b.createdAt,
      categories: (b.categories ?? []).map((c: any) => ({
        category: c.category
          ? { id: c.category.id, name: c.category.name, type: c.category.type }
          : null,
      })),
      bookFormats: (b.bookFormats ?? []).map((f: any) => ({
        id: f.id,
        type: String(f.type).toUpperCase(),
        fileSize: f.fileSize,
        totalDurationSeconds: f.totalDurationSeconds,
      })),
    };
  }

  async findAll(query: {
    search?: string;
    category?: string;
    format?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const dbFormat = this.normalizeFormat(query.format);

    const where: Prisma.BookWhereInput = {
      // Public catalog: globally published, approved books only.
      catalogScope: 'GLOBAL',
      globalPublishStatus: 'APPROVED',
      // Binned (soft-deleted) books never appear in the public catalogue.
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { author: { contains: query.search } },
        { isbn: { contains: query.search } },
      ];
    }
    if (query.category) {
      where.categories = {
        some: { category: { name: query.category } },
      };
    }
    if (dbFormat) {
      where.bookFormats = { some: { type: dbFormat as any } };
    }

    const sortableFields = ['createdAt', 'title', 'author', 'publishYear'];
    const sortBy = sortableFields.includes(query.sortBy ?? '')
      ? (query.sortBy as string)
      : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, books] = await this.prisma.$transaction([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        include: {
          categories: { include: { category: true } },
          bookFormats: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: books.map((b) => this.mapBook(b)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async getCategories(type?: string) {
    return this.prisma.bookCategory.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, parentId: true },
    });
  }

  /** The public-catalogue predicate every discovery query shares. */
  private get publicBookWhere() {
    return {
      catalogScope: 'GLOBAL' as const,
      globalPublishStatus: 'APPROVED' as const,
      deletedAt: null,
    };
  }

  /**
   * Most-borrowed books over a rolling window.
   *
   * `/books/trending` was called by the discovery page and existed in no
   * controller, so the request 404'd and the caller's `.catch(() => [])`
   * rendered an empty panel — a silent failure. One groupBy over BorrowedBook
   * is all it ever needed.
   */
  async getTrending(limit = 12, windowDays = 30) {
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const rows = await this.prisma.borrowedBook.groupBy({
      by: ['bookId'],
      where: { borrowedAt: { gte: since } },
      _count: { bookId: true },
      orderBy: { _count: { bookId: 'desc' } },
      take: limit,
    });
    if (rows.length === 0) return [];

    const books = await this.prisma.book.findMany({
      where: { id: { in: rows.map((r) => r.bookId) }, ...this.publicBookWhere },
      include: {
        categories: { include: { category: true } },
        bookFormats: true,
      },
    });

    // Re-apply the borrow ranking: findMany does not preserve `in` order, and
    // the ordering IS the feature here.
    const rank = new Map(rows.map((r, i) => [r.bookId, i]));
    return books
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
      .map((b) => this.mapBook(b));
  }

  /**
   * Books recommended for one reader.
   *
   * Content-based on the categories they have actually borrowed, which is the
   * signal this schema already carries. Falls back to trending for a reader
   * with no history, so the endpoint never returns an empty list to a new
   * account — an empty recommendations panel reads as breakage.
   */
  async getRecommendations(userId: string, limit = 12) {
    const history = await this.prisma.borrowedBook.findMany({
      where: { userId },
      select: { bookId: true },
      take: 50,
      orderBy: { borrowedAt: 'desc' },
    });
    const readIds = history.map((h) => h.bookId);
    if (readIds.length === 0) return this.getTrending(limit);

    const categoryLinks = await this.prisma.bookCategoryOnBook.findMany({
      where: { bookId: { in: readIds } },
      select: { categoryId: true },
    });
    const categoryIds = [...new Set(categoryLinks.map((c) => c.categoryId))];
    if (categoryIds.length === 0) return this.getTrending(limit);

    const books = await this.prisma.book.findMany({
      where: {
        ...this.publicBookWhere,
        id: { notIn: readIds }, // don't recommend what they've already borrowed
        categories: { some: { categoryId: { in: categoryIds } } },
      },
      include: {
        categories: { include: { category: true } },
        bookFormats: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // A reader whose whole history sits in one thin category can still come
    // back empty — fall through rather than render a dead panel.
    if (books.length === 0) return this.getTrending(limit);
    return books.map((b) => this.mapBook(b));
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findFirst({
      where: {
        id,
        catalogScope: 'GLOBAL',
        globalPublishStatus: 'APPROVED',
        deletedAt: null, // a binned book is not publicly reachable
      },
      include: {
        categories: { include: { category: true } },
        bookFormats: true,
      },
    });
    if (!book) throw new NotFoundException('Book not found');
    return this.mapBook(book);
  }

  /**
   * Generate a short-lived presigned read URL for a book format.
   * DRM-protected books get an AES-encrypted payload the client decrypts
   * just-in-time (see SecureLinksService).
   */
  async getReadUrl(userId: string, bookId: string, format: string) {
    const dbFormat = this.normalizeFormat(format);
    if (!dbFormat) throw new BadRequestException('format is required');

    // The `userId` this method has always accepted was never read: it looked
    // the book up by id alone and presigned the file. That made this — the
    // route serving the actual book — the one book-scoped surface with no
    // tenant check, no soft-delete check and no tier check, while five feature
    // controllers each carried all three.
    const book = await this.bookAccess.assertCanRead(userId, bookId);

    // findFirst, not findUnique: BookFormat is now keyed per PART, because a
    // book holds one markdown file per chapter. This is the READER's download
    // path — it wants the whole-book rendition (PDF/EPUB/audiobook), which
    // always occupies part 0. Ordering by partIndex keeps it deterministic even
    // if a per-part row ever appears for a type that is not expected to have one.
    const bookFormat = await this.prisma.bookFormat.findFirst({
      where: { bookId, type: dbFormat as any },
      orderBy: { partIndex: 'asc' },
    });
    if (!bookFormat || !bookFormat.fileUrl) {
      throw new NotFoundException(`No ${format} file available for this book`);
    }

    // Resolve the storage key: prefer explicit s3Key in metadata, else
    // strip the CDN/base origin from the stored public URL.
    const metadata = (bookFormat.metadata ?? {}) as Record<string, unknown>;
    let key = typeof metadata.s3Key === 'string' ? metadata.s3Key : undefined;
    if (!key) {
      try {
        key = new URL(bookFormat.fileUrl).pathname.replace(/^\//, '');
      } catch {
        key = bookFormat.fileUrl;
      }
    }

    // 5 minutes, not an hour. For a non-DRM book this URL is handed to the
    // client in plaintext and needs no auth to fetch, so its lifetime is
    // exactly how long a leaked link stays useful. The reader re-requests on
    // open and ReadingProgress restores the position, so a short window is
    // invisible to the reader and costs one extra round trip at most.
    const expiresInSeconds = 300;
    const url = await this.s3Service.getPresignedDownloadUrl({
      key,
      expiresInSeconds,
    });
    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();

    if (book.drmProtected) {
      return {
        encryptedUrl: this.secureLinks.encryptPayload({
          url,
          expiresAt,
          format,
        }),
        format,
      };
    }
    return { url, expiresAt, format };
  }

  async borrow(userId: string, bookId: string) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');
    if (!book.available || book.availableCopies < 1) {
      throw new BadRequestException('Book is not available for borrowing');
    }

    const existing = await this.prisma.borrowedBook.findFirst({
      where: { userId, bookId, returnedAt: null },
    });
    if (existing) {
      throw new ConflictException('You have already borrowed this book');
    }

    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [borrow] = await this.prisma.$transaction([
      this.prisma.borrowedBook.create({
        data: {
          tenantId: book.tenantId,
          userId,
          bookId,
          dueDate,
        },
      }),
      this.prisma.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } },
      }),
    ]);

    return {
      success: true,
      message: 'Borrow request submitted successfully',
      borrowId: borrow.id,
      dueDate: dueDate.toISOString(),
    };
  }

  async returnBook(userId: string, bookId: string) {
    const existing = await this.prisma.borrowedBook.findFirst({
      where: { userId, bookId, returnedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('No active borrow found for this book');
    }

    await this.prisma.$transaction([
      this.prisma.borrowedBook.update({
        where: { id: existing.id },
        data: { returnedAt: new Date() },
      }),
      this.prisma.book.update({
        where: { id: bookId },
        data: { availableCopies: { increment: 1 } },
      }),
    ]);

    return { success: true, message: 'Book returned successfully' };
  }
}
