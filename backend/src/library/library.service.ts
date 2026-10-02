import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) {}

  /**
   * `tenantId` is `undefined` when the reader belongs to no institution.
   * Prisma drops an `undefined` field from `where`, so the query stays scoped
   * by `userId` alone — which is the correct behaviour for an independent
   * reader. Passing `null` instead would match no rows at all.
   */
  async getBorrowedBooks(tenantId: string | undefined, userId: string) {
    // Fetch books currently borrowed by the user (returnedAt is null)
    const borrowed = await this.prisma.borrowedBook.findMany({
      where: {
        tenantId,
        userId,
        returnedAt: null,
      },
      include: {
        book: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    if (borrowed.length === 0) return borrowed;

    // Attach real reading progress per book. There is no Prisma relation from
    // BorrowedBook → ReadingProgress, so fetch by (userId, bookId) and merge.
    // The dashboard uses this to show actual completion instead of fabricating it.
    const progressRecords = await this.prisma.readingProgress.findMany({
      where: { userId, bookId: { in: borrowed.map((b) => b.bookId) } },
      select: {
        bookId: true,
        percentComplete: true,
        currentPage: true,
        lastReadAt: true,
      },
    });
    const progressByBook = new Map(progressRecords.map((p) => [p.bookId, p]));

    return borrowed.map((b) => ({
      ...b,
      progress: progressByBook.get(b.bookId) ?? null,
    }));
  }

  async getBorrowHistory(tenantId: string | undefined, userId: string) {
    // Fetch books previously borrowed and returned
    return this.prisma.borrowedBook.findMany({
      where: {
        tenantId,
        userId,
        returnedAt: {
          not: null,
        },
      },
      include: {
        book: true,
      },
      orderBy: {
        returnedAt: 'desc',
      },
      take: 20,
    });
  }

  async getSavedBooks(tenantId: string | undefined, userId: string) {
    // Since reading list functionality is heavily tied to bookmarks/annotations in this schema,
    // we use a specialized "bookmark" Annotation type to represent saved books
    const savedAnnotations = await this.prisma.annotation.findMany({
      where: {
        tenantId,
        userId,
        type: 'bookmark',
      },
      include: {
        book: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return savedAnnotations.map((a) => ({
      ...a.book,
      savedAt: a.createdAt,
      annotationId: a.id,
    }));
  }
}
