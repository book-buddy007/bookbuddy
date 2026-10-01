/**
 * Academic-profile client — Book Buddy as a consumer of the hub's Class/Section resolution.
 *
 * Mirrors lib/entitlements/client.ts's shape and policy on purpose: same OIDC access
 * token, same fresh/stale/fail-closed cache discipline, same reason for existing —
 * Vidyaverse's ERP owns Class/Section/Stream, Book Buddy asks rather than re-deriving it.
 *
 * "Fail closed" here means "answer null" (grade unknown), not "assume free tier" the
 * way entitlements does — there is no safe default grade to guess, so callers must
 * treat null as "ask the student" (independent students self-report instead; see
 * app/onboarding).
 */
import { prisma } from "@/lib/prisma";

export interface AcademicProfile {
  userId: string;
  institutionId: string;
  institutionName: string;
  classId: string;
  className: string;
  streamId: string | null;
  streamName: string | null;
  sectionId: string;
  sectionName: string;
  academicYear: string;
  resolvedAt: string;
}

const FRESH_MS = 5 * 60 * 1000;
const STALE_CEILING_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;

interface CacheEntry {
  fetchedAt: number;
  value: AcademicProfile | null;
}

/** Process-local cache — same reasoning as the entitlements client: this is a
 *  read-through cache of a cheap-to-refetch remote answer, not worth a second piece
 *  of infrastructure. */
const cache = new Map<string, CacheEntry>();

const key = (userId: string) => `acad:${userId}:bookbuddy`;

async function accessTokenFor(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "vidyaverse" },
    orderBy: { updatedAt: "desc" },
    select: { accessToken: true },
  });
  return account?.accessToken ?? null;
}

async function fetchFromHub(userId: string): Promise<AcademicProfile | null | undefined> {
  const issuer = process.env.VIDYAVERSE_ISSUER;
  if (!issuer) return undefined; // not configured — distinct from "resolved to nothing"

  const token = await accessTokenFor(userId);
  // No federated account — this user was never a Vidyaverse student, or is a purely
  // local/independent account. Resolved answer is "no profile", not an error.
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(
      `${issuer.replace(/\/$/, "")}/api/v1/academic/my-class`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!res.ok) {
      console.warn(`[academic] hub returned ${res.status} for ${userId}`);
      return undefined; // transient — do not cache a false "no profile"
    }

    const body = (await res.json()) as { success: boolean; data: AcademicProfile | null };
    return body.success ? body.data : undefined;
  } catch (err) {
    console.warn(`[academic] hub unreachable for ${userId}: ${(err as Error).message}`);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolved academic profile for a user, honouring the cache policy above.
 *
 * Returns null when the hub confirms the user has no Class/Section (independent
 * students, or institutional users who aren't students) — a real, cacheable answer.
 * Returns null (without caching) when the hub is unreachable and no cache is usable —
 * callers should treat this the same as "unknown," since there is nothing safer to
 * assume.
 */
export async function getAcademicProfile(userId: string): Promise<AcademicProfile | null> {
  const entry = cache.get(key(userId));
  const age = entry ? Date.now() - entry.fetchedAt : Infinity;

  if (entry && age < FRESH_MS) return entry.value;

  const fresh = await fetchFromHub(userId);
  if (fresh !== undefined) {
    cache.set(key(userId), { fetchedAt: Date.now(), value: fresh });
    return fresh;
  }

  if (entry && age < STALE_CEILING_MS) {
    console.warn(`[academic] serving stale profile for ${userId} (age ${Math.round(age / 1000)}s)`);
    return entry.value;
  }

  return null;
}

/** Drop a cached answer. Called by the hub's invalidation webhook, same as entitlements. */
export function invalidateAcademicProfile(userIds: string[]): number {
  let dropped = 0;
  for (const id of userIds) {
    if (cache.delete(key(id))) dropped++;
  }
  return dropped;
}

export function __clearCacheForTest(): void {
  cache.clear();
}
