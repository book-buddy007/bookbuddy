import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AnswerLanguage,
  coerceAnswerLanguage,
} from '../common/language/answer-language';

/**
 * Self-scoped learner preferences. Currently just the answer language;
 * named generically because Phase 3 (dictionary language) and later
 * work will land here too.
 *
 * Persistence is `User.metadata` — a Json bucket already used for onboarding and
 * profile scraps — so preferences need no schema migration and no second-Prisma
 * -schema sync. The cost of that choice is that every write is a read-modify
 * -write: we must not clobber the other keys sharing the bucket.
 */
/**
 * Notification switches. Only what the platform actually sends is listed:
 * `studyReminders` gates the concept-resurfacing reminders (in-app and push),
 * `push` gates every push to the user's devices. Both default to on.
 */
export interface NotificationPreferences {
  studyReminders: boolean;
  push: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  studyReminders: true,
  push: true,
};

export function coerceNotificationPreferences(
  raw: unknown,
): NotificationPreferences {
  const obj =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    studyReminders:
      typeof obj.studyReminders === 'boolean'
        ? obj.studyReminders
        : DEFAULT_NOTIFICATION_PREFERENCES.studyReminders,
    push:
      typeof obj.push === 'boolean'
        ? obj.push
        : DEFAULT_NOTIFICATION_PREFERENCES.push,
  };
}

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  private async readMetadata(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });
    const meta = user?.metadata;
    // Json can be null, a primitive, or an array — only a plain object is a
    // valid preferences bucket. Anything else is treated as empty rather than
    // spread (spreading a primitive/array would corrupt the write-back).
    return meta && typeof meta === 'object' && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)
      : {};
  }

  async getAnswerLanguage(userId: string): Promise<AnswerLanguage> {
    const meta = await this.readMetadata(userId);
    return coerceAnswerLanguage(meta.answerLanguage);
  }

  async setAnswerLanguage(
    userId: string,
    lang: AnswerLanguage,
  ): Promise<AnswerLanguage> {
    const meta = await this.readMetadata(userId);
    // Both values are now real choices, so both are stored. (The retired 'auto'
    // used to be written as null to mean "no override"; a null still reads back
    // as the default via coerceAnswerLanguage, so old rows need no backfill.)
    // Read-modify-write on every other key in the bucket.
    const next: Record<string, unknown> = { ...meta, answerLanguage: lang };
    await this.prisma.user.update({
      where: { id: userId },
      data: { metadata: next as any },
    });
    return lang;
  }

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferences> {
    const meta = await this.readMetadata(userId);
    return coerceNotificationPreferences(meta.notificationPreferences);
  }

  async setNotificationPreferences(
    userId: string,
    patch: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    const meta = await this.readMetadata(userId);
    const next = {
      ...coerceNotificationPreferences(meta.notificationPreferences),
      ...patch,
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { metadata: { ...meta, notificationPreferences: next } as any },
    });
    return next;
  }

  /** Batch read for senders: which of these users have a given switch turned off. */
  async usersWithNotificationOff(
    userIds: string[],
    key: keyof NotificationPreferences,
  ): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, metadata: true },
    });
    const off = new Set<string>();
    for (const r of rows) {
      const meta =
        r.metadata &&
        typeof r.metadata === 'object' &&
        !Array.isArray(r.metadata)
          ? (r.metadata as Record<string, unknown>)
          : {};
      if (!coerceNotificationPreferences(meta.notificationPreferences)[key])
        off.add(r.id);
    }
    return off;
  }
}
