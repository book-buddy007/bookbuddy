import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AiEntitlementService,
  TRIAL_FEATURE_DAILY_LIMIT,
} from '../ai-entitlement/ai-entitlement.service';

// The Varta surfaces a student's activity spans: the chat (BookChatMessage) and
// the quiz (QuizAttempt / ConceptMastery). Graph, Digest, Simplify live under
// Notes now and are deliberately NOT counted here — this is a Varta-only view.
const USAGE_DAYS = 30;

@Injectable()
export class VartaActivityService {
  constructor(
    private prisma: PrismaService,
    private entitlement: AiEntitlementService,
  ) {}

  private startOfUtcDay(d = new Date()): Date {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  }

  /**
   * A student's Varta activity, scoped to one book when `bookId` is given, else
   * across every book. Usage-over-time is always global — AiFeatureUsage is
   * per-user-per-day with no book dimension, so it can't be narrowed to a book,
   * and is labelled as overall usage on the client.
   */
  async getActivity(userId: string, bookId?: string) {
    const chatWhere = {
      userId,
      role: 'USER' as const,
      ...(bookId ? { bookId } : {}),
    };
    const quizWhere = { userId, ...(bookId ? { item: { bookId } } : {}) };
    const masteryWhere = { userId, ...(bookId ? { bookId } : {}) };

    const [
      book,
      questionsAsked,
      modeGroups,
      quizTotal,
      quizCorrect,
      masteryRows,
      usageRows,
      access,
      recentChatsRaw,
      recentQuizzesRaw,
    ] = await Promise.all([
      bookId
        ? this.prisma.book.findUnique({
            where: { id: bookId },
            select: { id: true, title: true, author: true },
          })
        : Promise.resolve(null),
      this.prisma.bookChatMessage.count({ where: chatWhere }),
      this.prisma.bookChatMessage.groupBy({
        by: ['mode'],
        where: chatWhere,
        _count: { _all: true },
      }),
      this.prisma.quizAttempt.count({ where: quizWhere }),
      this.prisma.quizAttempt.count({ where: { ...quizWhere, correct: true } }),
      this.prisma.conceptMastery.findMany({
        where: masteryWhere,
        select: {
          mastery: true,
          attempts: true,
          concept: { select: { label: true } },
        },
        orderBy: { mastery: 'desc' },
      }),
      this.prisma.aiFeatureUsage.findMany({
        where: {
          userId,
          feature: { in: ['varta', 'quiz'] },
          date: { gte: this.daysAgo(USAGE_DAYS - 1) },
        },
        select: { feature: true, date: true, count: true },
      }),
      this.entitlement.resolveAccess(userId),
      this.prisma.bookChatMessage.findMany({
        where: chatWhere,
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          bookId: true,
          mode: true,
          content: true,
          createdAt: true,
          book: { select: { title: true } },
        },
      }),
      this.prisma.quizAttempt.findMany({
        where: quizWhere,
        orderBy: { answeredAt: 'desc' },
        take: 8,
        select: {
          correct: true,
          answeredAt: true,
          item: {
            select: {
              bookId: true,
              chapterTitle: true,
              citedPage: true,
              prompt: true,
              book: { select: { title: true } },
            },
          },
        },
      }),
    ]);

    // ── Mode breakdown ──
    const modeBreakdown: Record<string, number> = {};
    for (const g of modeGroups) modeBreakdown[g.mode] = g._count._all;

    // ── Mastery summary ──
    const tracked = masteryRows.length;
    const averageMastery = tracked
      ? masteryRows.reduce((s, r) => s + r.mastery, 0) / tracked
      : null;
    const strongest = masteryRows
      .slice(0, 5)
      .map((r) => ({ label: r.concept.label, mastery: r.mastery }));
    const weakest = masteryRows
      .slice(-5)
      .reverse()
      .map((r) => ({ label: r.concept.label, mastery: r.mastery }));

    // ── Usage series: one row per day for the window, varta + quiz counts ──
    const byDay = new Map<string, { varta: number; quiz: number }>();
    for (const r of usageRows) {
      const key = r.date.toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { varta: 0, quiz: 0 };
      if (r.feature === 'varta') cur.varta += r.count;
      if (r.feature === 'quiz') cur.quiz += r.count;
      byDay.set(key, cur);
    }
    const series: { date: string; varta: number; quiz: number }[] = [];
    for (let i = USAGE_DAYS - 1; i >= 0; i--) {
      const key = this.daysAgo(i).toISOString().slice(0, 10);
      const v = byDay.get(key) ?? { varta: 0, quiz: 0 };
      series.push({ date: key, varta: v.varta, quiz: v.quiz });
    }

    // ── Trial allowance (only meaningful while on a trial) ──
    const trial: {
      isTrial: boolean;
      isPaid: boolean;
      trialEndsAt: Date | null;
      remaining: { varta: number; quiz: number; limit: number } | null;
    } = {
      isTrial: access.isTrial,
      isPaid: access.isPaid,
      trialEndsAt: access.trialEndsAt,
      remaining: null,
    };
    if (access.isTrial) {
      const today = this.startOfUtcDay();
      const todayUsage = await this.prisma.aiFeatureUsage.findMany({
        where: { userId, date: today, feature: { in: ['varta', 'quiz'] } },
        select: { feature: true, count: true },
      });
      const usedVarta =
        todayUsage.find((u) => u.feature === 'varta')?.count ?? 0;
      const usedQuiz = todayUsage.find((u) => u.feature === 'quiz')?.count ?? 0;
      trial.remaining = {
        varta: Math.max(0, TRIAL_FEATURE_DAILY_LIMIT - usedVarta),
        quiz: Math.max(0, TRIAL_FEATURE_DAILY_LIMIT - usedQuiz),
        limit: TRIAL_FEATURE_DAILY_LIMIT,
      };
    }

    return {
      scope: bookId ? ('book' as const) : ('global' as const),
      book,
      stats: {
        questionsAsked,
        modeBreakdown,
        quiz: {
          answered: quizTotal,
          correct: quizCorrect,
          accuracy: quizTotal > 0 ? quizCorrect / quizTotal : null,
        },
        mastery: { average: averageMastery, tracked, strongest, weakest },
      },
      usage: { series, trial },
      recentChats: recentChatsRaw.map((m) => ({
        bookId: m.bookId,
        bookTitle: m.book?.title ?? 'Book',
        mode: m.mode,
        preview: m.content.slice(0, 140),
        createdAt: m.createdAt,
      })),
      recentQuizzes: recentQuizzesRaw.map((a) => ({
        bookId: a.item.bookId,
        bookTitle: a.item.book?.title ?? 'Book',
        chapterTitle: a.item.chapterTitle,
        citedPage: a.item.citedPage,
        prompt: a.item.prompt.slice(0, 120),
        correct: a.correct,
        answeredAt: a.answeredAt,
      })),
    };
  }

  private daysAgo(n: number): Date {
    const d = this.startOfUtcDay();
    d.setUTCDate(d.getUTCDate() - n);
    return d;
  }
}
