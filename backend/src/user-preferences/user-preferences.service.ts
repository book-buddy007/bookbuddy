import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnswerLanguage, coerceAnswerLanguage } from '../common/language/answer-language';

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

  async setAnswerLanguage(userId: string, lang: AnswerLanguage): Promise<AnswerLanguage> {
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
}
