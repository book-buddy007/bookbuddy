import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// A concept must have been demonstrably learned before it's a candidate for
// forgetting-based resurfacing — same bar §2 uses for "weak" (mirrored, not
// duplicated logic: below this a concept simply hasn't been learned yet,
// which is §2's job to scaffold, not §7's job to resurface).
const DEMONSTRATED_MASTERY_THRESHOLD = 0.6;

// Below this estimated-recall value, resurface the passage.
const RECALL_TRIGGER_THRESHOLD = 0.5;

// Ebbinghaus-style exponential decay: recall(t) = mastery * exp(-t / stability).
// Stability grows with repetition count — the same spacing-effect intuition
// SM-2's interval growth already encodes elsewhere in this codebase
// (flashcards.service.ts), just applied to the auto-extracted concept graph
// instead of manually-created cards. Fixed literature-adjacent defaults, not
// fitted — same posture as mastery.service.ts's BKT parameters: revisit once
// there's enough attempt volume to fit them for real.
const BASE_STABILITY_DAYS = 3;
const STABILITY_PER_ATTEMPT_DAYS = 2;

// Don't re-notify for the same (user, concept) more than once in this window,
// even though a concept whose recall stays below threshold would otherwise
// re-qualify every single night.
const COOLDOWN_DAYS = 14;

const BATCH_SIZE = 500;

export interface ResurfacingQueueItem {
  id: string;
  bookId: string;
  bookTitle: string;
  conceptId: string;
  conceptLabel: string;
  page: number | null;
  chapterTitle: string | null;
  scheduledAt: Date;
  sentAt: Date | null;
  actioned: boolean;
}

/**
 * Reading Intelligence Layer §7 — forgetting-aware passage resurfacing.
 * Nightly job estimates *current* recall for every demonstrably-mastered
 * concept (mastery itself, from §4's BKT model, doesn't decay in storage —
 * this derives a separate, time-decayed estimate purely for scheduling) and,
 * when it drops past a threshold, resurfaces the original in-book passage
 * (not a generic flashcard) via push notification + the in-app queue.
 */
@Injectable()
export class ResurfacingService {
  private readonly logger = new Logger(ResurfacingService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Pure function, exported via the instance for direct unit testing. */
  estimateRecall(mastery: number, attempts: number, daysSinceUpdate: number): number {
    const stability = BASE_STABILITY_DAYS + attempts * STABILITY_PER_ATTEMPT_DAYS;
    return mastery * Math.exp(-daysSinceUpdate / stability);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runNightlyResurfacingCheck(): Promise<{ scheduled: number }> {
    this.logger.log('Running nightly forgetting-aware resurfacing check...');
    let cursor: string | undefined;
    let scheduled = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const batch = await this.prisma.conceptMastery.findMany({
        where: { mastery: { gte: DEMONSTRATED_MASTERY_THRESHOLD } },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
        include: {
          concept: { select: { label: true, firstPage: true, firstChapter: true } },
          book: { select: { title: true } },
        },
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      const now = Date.now();
      const candidates = batch.filter((row) => {
        const daysSinceUpdate = (now - row.lastUpdated.getTime()) / 86_400_000;
        const recall = this.estimateRecall(row.mastery, row.attempts, daysSinceUpdate);
        return recall < RECALL_TRIGGER_THRESHOLD;
      });

      if (candidates.length > 0) {
        scheduled += await this.scheduleAndNotify(candidates);
      }

      if (batch.length < BATCH_SIZE) break;
    }

    this.logger.log(`Nightly resurfacing check complete — ${scheduled} event(s) scheduled.`);
    return { scheduled };
  }

  private async scheduleAndNotify(
    candidates: Array<{
      userId: string;
      bookId: string;
      conceptId: string;
      concept: { label: string; firstPage: number | null; firstChapter: string | null };
      book: { title: string };
    }>,
  ): Promise<number> {
    const cooldownCutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000);

    // One query for the whole batch's cooldown check instead of one per
    // candidate — a pending (sentAt null) or recently-sent event for the
    // same (user, concept) means don't re-notify yet.
    const existing = await this.prisma.resurfacingEvent.findMany({
      where: {
        OR: candidates.map((c) => ({ userId: c.userId, conceptId: c.conceptId })),
        AND: { OR: [{ sentAt: null }, { sentAt: { gte: cooldownCutoff } }] },
      },
      select: { userId: true, conceptId: true },
    });
    const onCooldown = new Set(existing.map((e) => `${e.userId}:${e.conceptId}`));

    let scheduled = 0;
    for (const c of candidates) {
      if (onCooldown.has(`${c.userId}:${c.conceptId}`)) continue;

      const event = await this.prisma.resurfacingEvent.create({
        data: { userId: c.userId, bookId: c.bookId, conceptId: c.conceptId },
      });

      const page = c.concept.firstPage;
      const actionUrl = `/reader?bookId=${c.bookId}${page ? `&page=${page}` : ''}&tab=graph`;

      await this.prisma.notification.create({
        data: {
          userId: c.userId,
          type: 'concept_resurfacing',
          title: 'Quick review',
          message: `You might be forgetting "${c.concept.label}" from ${c.book.title}. Take a minute to revisit it.`,
          actionUrl,
        },
      });

      // Best-effort — a push failure shouldn't stop the batch or roll back
      // the ResurfacingEvent/Notification rows already written above; the
      // in-app queue (getQueue, below) is the source of truth regardless.
      try {
        await this.notifications.sendPushToUser({
          userId: c.userId,
          title: 'Quick review',
          body: `Revisit "${c.concept.label}" in ${c.book.title} before you forget it.`,
          data: { actionUrl, conceptId: c.conceptId, bookId: c.bookId },
        });
      } catch (e: any) {
        this.logger.warn(`Push failed for resurfacing event ${event.id}: ${e.message}`);
      }

      await this.prisma.resurfacingEvent.update({
        where: { id: event.id },
        data: { sentAt: new Date() },
      });

      scheduled += 1;
    }
    return scheduled;
  }

  /** For an in-app "review" tab, not just the push notification. */
  async getQueue(userId: string): Promise<ResurfacingQueueItem[]> {
    const events = await this.prisma.resurfacingEvent.findMany({
      where: { userId, actioned: false },
      orderBy: { scheduledAt: 'desc' },
      include: {
        book: { select: { title: true } },
        concept: { select: { label: true, firstPage: true, firstChapter: true } },
      },
      take: 50,
    });

    return events.map((e) => ({
      id: e.id,
      bookId: e.bookId,
      bookTitle: e.book.title,
      conceptId: e.conceptId,
      conceptLabel: e.concept.label,
      page: e.concept.firstPage,
      chapterTitle: e.concept.firstChapter,
      scheduledAt: e.scheduledAt,
      sentAt: e.sentAt,
      actioned: e.actioned,
    }));
  }

  async markActioned(userId: string, eventId: string): Promise<{ actioned: boolean }> {
    const { count } = await this.prisma.resurfacingEvent.updateMany({
      where: { id: eventId, userId },
      data: { actioned: true },
    });
    return { actioned: count > 0 };
  }
}
