import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(tenantId: string | undefined, userId: string) {
    // Everything the student dashboard needs, computed from real rows.
    // Counts are user-scoped (annotations/flashcards/chat carry the tenant
    // denormalised, but userId alone is the correct owner key here).
    const [streakRecord, progressRecords, highlights, flashcards, explanations] =
      await Promise.all([
        this.prisma.userStreak.findUnique({ where: { userId } }),
        this.prisma.readingProgress.findMany({ where: { tenantId, userId } }),
        this.prisma.annotation.count({ where: { userId, type: 'highlight' } }),
        this.prisma.flashcardDeck.count({ where: { userId } }),
        this.prisma.bookChatMessage.count({
          where: { userId, role: 'ASSISTANT', mode: 'explain' },
        }),
      ]);

    const totalBooksRead = progressRecords.filter(
      (p) => p.percentComplete >= 100,
    ).length;
    const totalPagesRead = progressRecords.reduce(
      (sum, p) => sum + p.totalPagesRead,
      0,
    );
    const readingTimeHours =
      progressRecords.reduce((sum, p) => sum + p.timeSpentSeconds, 0) / 3600;

    // Minutes read today — sum the per-book dailyProgress entry for today's date.
    const todayKey = new Date().toISOString().split('T')[0];
    const secondsToday = progressRecords.reduce((sum, p) => {
      const dp = (p.dailyProgress as Record<string, { seconds?: number }>) || {};
      return sum + (dp[todayKey]?.seconds || 0);
    }, 0);

    return {
      streak: streakRecord ? streakRecord.currentStreak : 0,
      totalBooks: totalBooksRead,
      totalPages: totalPagesRead,
      readingTimeHours: Math.round(readingTimeHours * 10) / 10,
      minutesReadToday: Math.round(secondsToday / 60),
      highlights,
      flashcards,
      explanations,
    };
  }

  async getHistory(tenantId: string | undefined, userId: string, days: number = 7) {
    // 1. Aggregates reading progress JSON data from multiple books
    const progressRecords = await this.prisma.readingProgress.findMany({
      where: { tenantId, userId },
      select: { dailyProgress: true },
    });

    // Note: Since Prisma strictly stores JSON, we must process the aggregation in memory
    const historyMap = new Map<string, number>();

    // 2. Generate the last N days as keys initialized to 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      historyMap.set(dateString, 0);
    }

    // 3. Sum up pages read across all books for each date
    for (const record of progressRecords) {
      if (!record.dailyProgress) continue;
      const dp = record.dailyProgress as Record<
        string,
        { pages: number; seconds: number }
      >;

      for (const [dateStr, metrics] of Object.entries(dp)) {
        if (historyMap.has(dateStr)) {
          historyMap.set(
            dateStr,
            historyMap.get(dateStr)! + (metrics.pages || 0),
          );
        }
      }
    }

    // 4. Format for the Recharts frontend graph [{ date: 'Mon', pages: 12 }]
    return Array.from(historyMap.entries()).map(([dateStr, pages]) => {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: dateStr,
        pages,
      };
    });
  }

  async getGoals(tenantId: string | undefined, userId: string) {
    // Mocking goals as this isn't strictly defined in the Prisma schema yet
    // In the future, a `UserGoal` table could be added.
    const overview = await this.getOverview(tenantId, userId);

    return [
      {
        id: 'goal_1',
        title: 'Read 5 Books This Month',
        type: 'books',
        target: 5,
        progress: overview.totalBooks % 5, // Just for illustrative UI binding
        deadline: new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        )
          .toISOString()
          .split('T')[0],
        category: 'General',
      },
      {
        id: 'goal_2',
        title: 'Read 50 Pages Today',
        type: 'pages',
        target: 50,
        progress: 0, // In reality, fetch from today's dailyProgress
        deadline: new Date().toISOString().split('T')[0],
        category: 'Daily Habit',
      },
    ];
  }
}
