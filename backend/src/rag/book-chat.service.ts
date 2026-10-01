import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SOFT_LIMIT = parseInt(process.env.VARTA_SOFT_LIMIT_TOKENS ?? '40000', 10);
const HARD_LIMIT = parseInt(process.env.VARTA_HARD_LIMIT_TOKENS ?? '60000', 10);
const MAX_QUERY_TOKENS = parseInt(process.env.VARTA_MAX_QUERY_TOKENS ?? '4000', 10);

@Injectable()
export class BookChatService {
  private readonly logger = new Logger(BookChatService.name);

  constructor(private prisma: PrismaService) {}

  async saveMessages(
    userId: string,
    bookId: string,
    tenantId: string,
    userQuery: string,
    assistantResponse: string,
    citations: any[],
    mode: string = 'explain',
  ) {
    await this.prisma.bookChatMessage.createMany({
      data: [
        { userId, bookId, tenantId, role: 'USER', content: userQuery, mode },
        {
          userId,
          bookId,
          tenantId,
          role: 'ASSISTANT',
          content: assistantResponse,
          citedChunkIds: citations.map((c) => c.chunkId),
          mode,
        },
      ],
    });
  }

  /**
   * The most recent assistant turns in a given dialogue mode — lets the
   * dialogue policy derive conversational state (e.g. "is there a pending
   * quiz_me question the student is now answering?", "which Socratic turn
   * number is this?") without a dedicated state table, since chat history
   * already records everything needed.
   */
  async getRecentModeMessages(userId: string, bookId: string, mode: string, limit: number) {
    return this.prisma.bookChatMessage.findMany({
      where: { userId, bookId, mode },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { role: true, content: true, createdAt: true },
    });
  }

  async getHistory(userId: string, bookId: string) {
    return this.prisma.bookChatMessage.findMany({
      where: { userId, bookId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        citedChunkIds: true,
        createdAt: true,
      },
    });
  }

  /**
   * Per-user daily message count quota (existing behavior preserved).
   */
  async checkDailyQuota(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.prisma.bookChatMessage.count({
      where: { userId, role: 'USER', createdAt: { gte: today } },
    });

    const limit = parseInt(process.env.DAILY_AI_QUERY_LIMIT ?? '100', 10);
    if (count >= limit) {
      throw new HttpException(
        `Daily AI query limit reached (${limit}). Try again tomorrow.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Atomic tenant-level token quota check & increment.
   * Uses MySQL's atomic UPDATE ... SET tokensUsed = tokensUsed + N
   * to prevent race conditions from concurrent student queries.
   *
   * @returns { allowed: boolean, warning?: string, currentUsage: number }
   */
  async checkAndIncrementTenantQuota(
    tenantId: string,
    estimatedTokens: number,
  ): Promise<{ allowed: boolean; warning?: string; currentUsage: number }> {
    const today = new Date();
    // Normalize to just the date portion (YYYY-MM-DD)
    const dateStr = today.toISOString().split('T')[0];
    const dateOnly = new Date(dateStr);

    // Upsert: create today's row if it doesn't exist yet
    await this.prisma.vartaUsageLog.upsert({
      where: {
        tenantId_date: { tenantId, date: dateOnly },
      },
      create: {
        tenantId,
        date: dateOnly,
        tokensUsed: 0,
        queryCount: 0,
      },
      update: {}, // no-op, just ensures the row exists
    });

    // Read current usage
    const usage = await this.prisma.vartaUsageLog.findUnique({
      where: {
        tenantId_date: { tenantId, date: dateOnly },
      },
    });

    const currentTokens = usage?.tokensUsed ?? 0;

    // Hard limit check BEFORE incrementing
    if (currentTokens + estimatedTokens > HARD_LIMIT) {
      this.logger.warn(
        `🚫 Tenant ${tenantId} blocked: ${currentTokens} + ${estimatedTokens} > ${HARD_LIMIT} hard limit`,
      );
      throw new HttpException(
        `Your institution has reached today's AI usage limit (${HARD_LIMIT.toLocaleString()} tokens). ` +
        `Please try again tomorrow or contact your administrator.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Atomic increment. Prisma's `increment` compiles to `SET "col" = "col" + $n`,
    // which is atomic on both engines and quoted correctly per dialect — the raw
    // statement this replaces said `UPDATE VartaUsageLog` unquoted, which Postgres
    // folds to `vartausagelog` and would not find. The row is guaranteed to exist by
    // the upsert above.
    await this.prisma.vartaUsageLog.update({
      where: {
        tenantId_date: { tenantId, date: dateOnly },
      },
      data: {
        tokensUsed: { increment: estimatedTokens },
        queryCount: { increment: 1 },
      },
    });

    // Soft limit warning (non-blocking)
    let warning: string | undefined;
    if (currentTokens + estimatedTokens > SOFT_LIMIT) {
      warning =
        `Your institution has used ${(currentTokens + estimatedTokens).toLocaleString()} / ` +
        `${HARD_LIMIT.toLocaleString()} AI tokens today. ` +
        `Usage will be blocked at the daily limit.`;
      this.logger.warn(
        `⚠️ Tenant ${tenantId} soft limit warning: ${currentTokens + estimatedTokens} tokens`,
      );
    }

    return {
      allowed: true,
      warning,
      currentUsage: currentTokens + estimatedTokens,
    };
  }

  /** Maximum tokens allowed per single query context window */
  get maxQueryTokens(): number {
    return MAX_QUERY_TOKENS;
  }
}
