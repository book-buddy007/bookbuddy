import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReaderService {
  constructor(private prisma: PrismaService) {}

  async syncProgress(
    userId: string,
    tenantId: string | null,
    bookId: string,
    syncData: any,
  ) {
    // Destructuring defaults only cover `undefined`, not `null` — and a
    // NaN percentComplete (e.g. computed before the reader has a page
    // count yet) silently becomes `null` over JSON. readingProgress.
    // percentComplete is a non-nullable Float, so a literal null crashes
    // the upsert with a confusing "Argument `user` is missing" error.
    // Use ?? so both undefined and null fall through to the default.
    const currentPage = syncData.currentPage ?? 0;
    const totalPagesRead = syncData.totalPagesRead ?? 0;
    const timeSpentSeconds = syncData.timeSpentSeconds ?? 0;
    const wordsRead = syncData.wordsRead ?? 0;
    const percentComplete = syncData.percentComplete ?? 0;
    const dailyProgress = syncData.dailyProgress ?? {};
    const bookmarks = syncData.bookmarks ?? [];
    const readerSettings = syncData.readerSettings ?? {};

    // We can merge the dailyProgress rather than overwriting
    // For simplicity, we just take the client's payload or merge logic if needed.

    const existingProgress = await this.prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });

    // Merge daily progress
    let mergedDailyProgress: Record<string, any> = {};
    if (existingProgress && existingProgress.dailyProgress) {
      mergedDailyProgress =
        typeof existingProgress.dailyProgress === 'string'
          ? JSON.parse(existingProgress.dailyProgress)
          : existingProgress.dailyProgress;
    }

    // Add today's new delta (assuming syncData sends the total for today so far, or sends the latest struct)
    // Actually, syncData.dailyProgress from client will just be the current state of today.
    // Let's just trust the client's state for dailyProgress for this session, or do a deep merge.
    mergedDailyProgress = {
      ...mergedDailyProgress,
      ...dailyProgress,
    };

    const progress = await this.prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      update: {
        currentPage,
        totalPagesRead: { increment: totalPagesRead > 0 ? totalPagesRead : 0 },
        timeSpentSeconds: {
          increment: timeSpentSeconds > 0 ? timeSpentSeconds : 0,
        },
        wordsRead: { increment: wordsRead > 0 ? wordsRead : 0 },
        percentComplete,
        lastReadAt: new Date(),
        dailyProgress: mergedDailyProgress,
        bookmarks: bookmarks,
        readerSettings: readerSettings,
      },
      create: {
        userId,
        tenantId,
        bookId,
        currentPage,
        totalPagesRead,
        timeSpentSeconds,
        wordsRead,
        percentComplete,
        dailyProgress: mergedDailyProgress,
        bookmarks: bookmarks,
        readerSettings: readerSettings,
        startedAt: new Date(),
      },
    });

    return progress;
  }

  async getProgress(userId: string, bookId: string) {
    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });

    return progress;
  }

  async ingestPages(
    tenantId: string | null,
    bookId: string,
    pages: { pageIndex: number; content: string }[],
  ) {
    // Use a transaction to clear existing pages for this book/tenant and insert new ones
    await this.prisma.$transaction([
      this.prisma.bookPage.deleteMany({
        where: { bookId, tenantId },
      }),
      this.prisma.bookPage.createMany({
        data: pages.map((page) => ({
          bookId,
          tenantId,
          pageIndex: page.pageIndex,
          content: page.content,
        })),
      }),
    ]);
    return { message: `Ingested ${pages.length} pages` };
  }

  async searchPages(tenantId: string | null, bookId: string, query: string) {
    if (!query || query.trim().length < 3) {
      return [];
    }

    const pages = await this.prisma.bookPage.findMany({
      where: {
        bookId,
        tenantId,
        content: {
          contains: query,
        },
      },
      select: {
        pageIndex: true,
        content: true,
      },
      orderBy: {
        pageIndex: 'asc',
      },
    });

    // Generate previews
    const searchResults: any[] = [];
    const lowerQuery = query.toLowerCase();

    for (const page of pages) {
      const lowerContent = page.content.toLowerCase();
      let currentIndex = 0;

      // Find all instances
      while (
        (currentIndex = lowerContent.indexOf(lowerQuery, currentIndex)) !== -1
      ) {
        const start = Math.max(0, currentIndex - 50);
        const end = Math.min(
          page.content.length,
          currentIndex + query.length + 50,
        );

        let preview = page.content.slice(start, end);
        if (start > 0) preview = '...' + preview;
        if (end < page.content.length) preview += '...';

        searchResults.push({
          pageIndex: page.pageIndex,
          chapterTitle: `Page ${page.pageIndex}`,
          preview,
          charStart: currentIndex,
          charEnd: currentIndex + query.length,
        });

        currentIndex += query.length;
      }
    }

    return searchResults;
  }
}
