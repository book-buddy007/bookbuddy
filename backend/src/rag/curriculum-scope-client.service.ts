import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface CacheEntry {
  fetchedAt: number;
  scopeNodeIds: string[];
}

const FRESH_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;

/**
 * The calling student's institute curriculum scope, pulled from Vidyaverse — what
 * narrows book-chat retrieval to a student's actual curriculum by default (see
 * rag-search.service.ts's scopeNodeIds).
 *
 * FAIL OPEN, deliberately — the opposite of TaxonomyClientService's write path and
 * of Book Buddy's own entitlements client (which fails closed to the free tier).
 * Entitlements gates access; capabilities you can't prove you have should not be
 * granted. This only NARROWS retrieval — failing closed here would mean a Vidyaverse
 * hiccup breaks book search/chat for every institutional student, a far worse outcome
 * than a student briefly seeing the unscoped catalog. So: not federated, no token,
 * hub unreachable, malformed response — every failure mode returns an empty scope
 * (no filter), never an error the caller has to handle.
 *
 * Process-local cache, same reasoning as lib/entitlements/client.ts on the Next.js
 * side: this is a read-through cache of a cheap-to-refetch remote answer, not worth a
 * second piece of infrastructure.
 */
@Injectable()
export class CurriculumScopeClientService {
  private readonly logger = new Logger(CurriculumScopeClientService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private issuer(): string | null {
    return this.config.get<string>('VIDYAVERSE_ISSUER') ?? null;
  }

  private async accessTokenFor(userId: string): Promise<string | null> {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: 'vidyaverse' },
      orderBy: { updatedAt: 'desc' },
      select: { accessToken: true },
    });
    return account?.accessToken ?? null;
  }

  async getScopeForUser(userId: string): Promise<string[]> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < FRESH_MS) {
      return cached.scopeNodeIds;
    }

    const issuer = this.issuer();
    if (!issuer) return cached?.scopeNodeIds ?? [];

    try {
      const token = await this.accessTokenFor(userId);
      // A purely local (non-federated) account has no token and no institution —
      // no scope is exactly correct, not an error.
      if (!token) return [];

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`${issuer.replace(/\/$/, '')}/api/v1/academic/my-curriculum-scope`, {
          headers: { authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          this.logger.warn(`hub returned ${res.status} for ${userId}, failing open (no filter)`);
          return cached?.scopeNodeIds ?? [];
        }
        const body = (await res.json()) as { success: boolean; data?: { scopeNodeIds: string[] } };
        const scopeNodeIds = body.success ? (body.data?.scopeNodeIds ?? []) : [];
        this.cache.set(userId, { fetchedAt: Date.now(), scopeNodeIds });
        return scopeNodeIds;
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      this.logger.warn(`hub unreachable for ${userId}, failing open (no filter): ${(err as Error).message}`);
      return cached?.scopeNodeIds ?? [];
    }
  }

  /** Drop a user's cached scope — called by the invalidate webhook once Phase 5's
   *  push path is built; unused until then, but the cache needs an eviction seam
   *  regardless of whether anything calls it yet. */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}
