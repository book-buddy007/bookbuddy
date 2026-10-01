/**
 * Capability client — Book Buddy as a consumer of the hub's entitlement service.
 *
 * Book Buddy does not decide what a user may do. Purchases route through Vidyaverse by
 * product design, so the hub is the single subscription authority and returns
 * RESOLVED capabilities; Book Buddy asks and caches. Reimplementing the union rule here
 * would be a second, subtly different answer to the same question.
 *
 * Authentication uses the OIDC access token better-auth already stored for the
 * federated account, carrying the `entitlements` scope. No hub session is involved.
 *
 * Availability mirrors the hub's own policy, deliberately:
 *
 *   fresh  (< 5 min)   serve cached
 *   stale  (< 30 min)  serve cached
 *   beyond            fail closed — return the free tier, never a guess
 *
 * Failing closed means degrading to free, not throwing: a reader mid-book should see
 * a locked feature and a retry, not a crash.
 */
import { prisma } from "@/lib/prisma";

export type AppKey = "vidyaverse" | "bookbuddy" | "digiclassroom";
export type Tier = "free" | "basic" | "premium" | "enterprise";
export type CapabilityStatus = "active" | "grace" | "none";

export interface ResolvedCapabilities {
  userId: string;
  app: AppKey;
  tier: Tier;
  features: string[];
  status: CapabilityStatus;
  expiresAt: string | null;
  graceUntil: string | null;
  sources: Array<{
    subscriptionId: string;
    subjectKind: "user" | "institution";
    subjectId: string;
    tier: Tier;
    status: string;
  }>;
  resolvedAt: string;
}

const FRESH_MS = 5 * 60 * 1000;
const STALE_CEILING_MS = 30 * 60 * 1000;
/** The hub is not on this request's critical path forever — bound the wait. */
const REQUEST_TIMEOUT_MS = 4000;

interface CacheEntry {
  fetchedAt: number;
  value: ResolvedCapabilities;
}

/**
 * Process-local cache. Deliberately not Redis: this is a read-through cache of a
 * remote answer that is already cheap to refetch, and a per-instance cache avoids
 * making entitlement reads depend on a second piece of infrastructure being up.
 */
const cache = new Map<string, CacheEntry>();

const key = (userId: string) => `ent:${userId}:bookbuddy`;

/** What a user gets when the hub cannot be reached and nothing usable is cached. */
export function freeTierFallback(userId: string): ResolvedCapabilities {
  return {
    userId,
    app: "bookbuddy",
    tier: "free",
    features: ["catalog.browse", "books.read_free", "annotations.own"],
    status: "none",
    expiresAt: null,
    graceUntil: null,
    sources: [],
    resolvedAt: new Date().toISOString(),
  };
}

/** The stored OIDC access token for this user's federated Vidyaverse account. */
async function accessTokenFor(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "vidyaverse" },
    orderBy: { updatedAt: "desc" },
    select: { accessToken: true },
  });
  return account?.accessToken ?? null;
}

async function fetchFromHub(userId: string): Promise<ResolvedCapabilities | null> {
  const issuer = process.env.VIDYAVERSE_ISSUER;
  if (!issuer) return null;

  const token = await accessTokenFor(userId);
  // A purely local account has never federated, so it has no token and no
  // institution — the free tier is the correct answer, not an error.
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${issuer.replace(/\/$/, "")}/api/v1/entitlements/capabilities?app=bookbuddy`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!res.ok) {
      // 401 here means the stored token expired — the user's next federated sign-in
      // replaces it, so this is transient rather than a denial.
      console.warn(`[entitlements] hub returned ${res.status} for ${userId}`);
      return null;
    }

    const body = (await res.json()) as { success: boolean; data: ResolvedCapabilities };
    return body.success ? body.data : null;
  } catch (err) {
    console.warn(`[entitlements] hub unreachable for ${userId}: ${(err as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolved capabilities for a user, honouring the cache policy above. */
export async function getCapabilities(userId: string): Promise<ResolvedCapabilities> {
  const entry = cache.get(key(userId));
  const age = entry ? Date.now() - entry.fetchedAt : Infinity;

  if (entry && age < FRESH_MS) return entry.value;

  const fresh = await fetchFromHub(userId);
  if (fresh) {
    cache.set(key(userId), { fetchedAt: Date.now(), value: fresh });
    return fresh;
  }

  if (entry && age < STALE_CEILING_MS) {
    console.warn(`[entitlements] serving stale capabilities for ${userId} (age ${Math.round(age / 1000)}s)`);
    return entry.value;
  }

  // Fail closed. Never invent access we cannot prove.
  return freeTierFallback(userId);
}

/** True when the user currently holds a capability. */
export async function hasCapability(userId: string, capability: string): Promise<boolean> {
  const caps = await getCapabilities(userId);
  return caps.features.includes(capability);
}

/** Drop cached answers. Called by the hub's invalidation webhook. */
export function invalidateCapabilities(userIds: string[]): number {
  let dropped = 0;
  for (const id of userIds) {
    if (cache.delete(key(id))) dropped++;
  }
  return dropped;
}

/** Test seam — lets tests exercise the staleness policy without waiting. */
export function __setCacheEntryForTest(userId: string, entry: CacheEntry): void {
  cache.set(key(userId), entry);
}
export function __clearCacheForTest(): void {
  cache.clear();
}
