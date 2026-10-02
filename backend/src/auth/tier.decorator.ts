import { SetMetadata } from '@nestjs/common';

export const TIER_KEY = 'requiredTier';

/**
 * Subscription tiers, ranked low to high. One shared ladder so every
 * tier-gated endpoint compares against the same ranking instead of each
 * defining its own.
 */
export const TIER_RANK: Record<string, number> = {
  FREE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  DIAMOND: 4,
};

export type SubscriptionTier = keyof typeof TIER_RANK;

/**
 * Require the caller's subscription tier to be at least `tier`, checked by
 * TierGuard against `req.user.subscriptionTier` — the local Book Buddy column,
 * not the Vidyaverse entitlement hub. Individual (non-institutional) Book Buddy
 * subscribers are not yet backfilled into the hub, so gating on it here
 * would incorrectly downgrade paying direct subscribers to free tier.
 * Revisit once that backfill happens.
 */
export const RequiresTier = (tier: SubscriptionTier) =>
  SetMetadata(TIER_KEY, tier);
