import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TIER_RANK } from '../auth/tier.decorator';
import { AiFeature } from './ai-feature.decorator';

/** Per-feature daily allowance for a trial user. */
export const TRIAL_FEATURE_DAILY_LIMIT = parseInt(
  process.env.TRIAL_FEATURE_DAILY_LIMIT ?? '30',
  10,
);

/** How long a self-activated free trial lasts. Shared with the activation route. */
export const TRIAL_DURATION_DAYS = parseInt(
  process.env.TRIAL_DURATION_DAYS ?? '7',
  10,
);

/** The tier a paid user must reach to use AI, mirroring the retired @RequiresTier('DIAMOND'). */
const PAID_TIER_FLOOR = TIER_RANK.DIAMOND;

export interface AiAccess {
  /** May the user reach AI features at all right now? */
  hasAccess: boolean;
  /** Is that access via an active free trial (→ subject to the per-feature cap)? */
  isTrial: boolean;
  /** Is that access via a paid/entitled tier (→ no trial cap)? */
  isPaid: boolean;
  trialEndsAt: Date | null;
}

export interface FeatureUsage {
  used: number;
  limit: number;
  remaining: number;
}

/**
 * One place that answers "may this user use AI, and if they're on a trial, have
 * they any of today's allowance left?". Both the RAG guard and any UI status
 * endpoint go through here so the access rule can never drift between them.
 *
 * Loads the tier/trial state straight from the DB by user id rather than trusting
 * `req.user`: the better-auth session projection does not carry subscriptionTier
 * or trialEndsAt, so reading them off the request would see undefined and deny a
 * paying user (or, worse, a user who just activated a trial one request ago).
 */
@Injectable()
export class AiEntitlementService {
  constructor(private prisma: PrismaService) {}

  /** Start of the current UTC day — the AiFeatureUsage `date` bucket key. */
  private today(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  async resolveAccess(userId: string): Promise<AiAccess> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, trialEndsAt: true },
    });

    if (!user) {
      return { hasAccess: false, isTrial: false, isPaid: false, trialEndsAt: null };
    }

    const tier = (user.subscriptionTier ?? '').toLowerCase();
    const now = new Date();

    // An active trial: the tier says 'trial' AND the clock hasn't run out.
    // An expired trialEndsAt is treated as no access, not paid access.
    const trialActive =
      tier === 'trial' && !!user.trialEndsAt && user.trialEndsAt.getTime() > now.getTime();

    // Paid path preserved byte-for-byte from the old @RequiresTier('DIAMOND'):
    // only a tier ranking at or above DIAMOND qualifies. 'trial' is not in the
    // rank table, so it can never satisfy this branch — the two paths are disjoint.
    const paid =
      (TIER_RANK[(user.subscriptionTier ?? '').toUpperCase()] ?? 0) >= PAID_TIER_FLOOR;

    return {
      hasAccess: trialActive || paid,
      isTrial: trialActive && !paid,
      isPaid: paid,
      trialEndsAt: user.trialEndsAt ?? null,
    };
  }

  /**
   * Charge one call of `feature` against today's per-feature counter and throw
   * 429 once the allowance is spent. Atomic: the upsert's `increment` compiles to
   * `SET count = count + 1` so two concurrent calls can't both read-then-write the
   * same value and overshoot the cap.
   *
   * Only trial calls are metered — callers pass paid/entitled users straight
   * through without touching this, so no counter row is ever written for them.
   */
  async consumeFeatureQuota(userId: string, feature: AiFeature): Promise<FeatureUsage> {
    const date = this.today();
    const row = await this.prisma.aiFeatureUsage.upsert({
      where: { userId_feature_date: { userId, feature, date } },
      create: { userId, feature, date, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    const limit = TRIAL_FEATURE_DAILY_LIMIT;
    if (row.count > limit) {
      throw new HttpException(
        `You've reached today's free-trial limit for this feature (${limit} per day). ` +
          `It resets tomorrow — or upgrade for unlimited access.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return { used: row.count, limit, remaining: Math.max(0, limit - row.count) };
  }
}
