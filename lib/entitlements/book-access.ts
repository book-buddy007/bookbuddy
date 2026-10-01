/**
 * "May this user read this book?" — for Next.js route handlers.
 *
 * Audit finding BB-011. This is a deliberate mirror of the canonical NestJS
 * implementation in `backend/src/common/book-access.service.ts`. It exists because
 * `app/api/proxy-media/route.ts` runs in the Next.js process, hands out the actual
 * file bytes, and had NO entitlement check of any kind.
 *
 * The rules are copied from the NestJS service so that the two agree:
 *   1. A soft-deleted book reads as NOT FOUND, never as FORBIDDEN. The distinction
 *      leaks whether an id exists.
 *   2. A book carrying the __SYSTEM__ tenant (or no tenant) is the global catalogue
 *      and is readable by any authenticated user.
 *   3. Any other tenantId requires an ACTIVE UserTenantMembership.
 *   4. Tier is checked only when ENFORCE_BOOK_TIER=true, and unrecognised tier
 *      strings are allowed through — see the note on assertTierAllows below.
 *
 * KEPT IN SYNC BY HAND, which is a liability. The backend service's own comment
 * records that this check was copy-pasted into five controllers and that the two
 * routes handing out files never got a copy — which is exactly how BB-011
 * happened. A sixth copy is not a fix for that pattern; the real fix is a single
 * shared package. Recorded as a follow-up rather than solved here, because moving
 * it is a refactor and this is a security patch.
 */
import { prisma } from '@/lib/prisma';

/** The global catalogue's tenant sentinel. Must match SYSTEM_TENANT in the backend. */
export const SYSTEM_TENANT = '__SYSTEM__';

/** Must match TIER_RANK in backend/src/auth/tier.decorator.ts. */
const TIER_RANK: Record<string, number> = {
  FREE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  DIAMOND: 4,
};

export type AccessDenial =
  | { ok: false; reason: 'not-found'; status: 404 }
  | { ok: false; reason: 'wrong-tenant'; status: 403 }
  | { ok: false; reason: 'tier-too-low'; status: 403 };

export type AccessGrant = {
  ok: true;
  book: { id: string; tenantId: string | null; accessTier: string; drmProtected: boolean };
};

export type AccessResult = AccessGrant | AccessDenial;

/**
 * Resolve a media URL to the BookFormat row that owns it.
 *
 * The proxy receives a URL rather than an id, so the owning book has to be
 * recovered from storage before anything can be authorised against it. Matching on
 * the stored `fileUrl` means the CLIENT never names the book — a caller cannot
 * present book A's identifier alongside book B's URL, because the identifier is
 * derived, not supplied.
 *
 * Returns null when the URL belongs to no known BookFormat. Callers must treat
 * that as a denial: an unrecognised URL is precisely the case we cannot authorise.
 */
export async function resolveBookIdFromMediaUrl(url: string): Promise<string | null> {
  const format = await prisma.bookFormat.findFirst({
    where: { fileUrl: url },
    select: { bookId: true },
  });
  return format?.bookId ?? null;
}

/**
 * The decision, separated from the data access.
 *
 * Split out so the authorisation rules can be tested exhaustively without a
 * database, a Next.js request, or a test framework. The repository has no
 * frontend unit-test runner, and adding one inside a security patch would mean
 * touching the lockfile — so the rules live in a pure function and
 * `lib/entitlements/book-access.test.mjs` exercises it with plain `node`.
 * Standing up a real runner for the frontend is a follow-up, not a blocker.
 *
 * Every input is already-fetched data. No I/O, no globals except the tier flag,
 * which is passed in explicitly for the same reason.
 */
export function decideBookAccess(input: {
  book: { id: string; tenantId: string | null; accessTier: string; drmProtected: boolean } | null;
  hasActiveMembership: boolean;
  user: { subscriptionTier: string | null; trialEndsAt: Date | null } | null;
  enforceTier: boolean;
  now?: Date;
}): AccessResult {
  const { book, hasActiveMembership, user, enforceTier } = input;
  const now = input.now ?? new Date();

  if (!book) return { ok: false, reason: 'not-found', status: 404 };

  // A book with no tenant, or the __SYSTEM__ sentinel, is the global catalogue.
  if (book.tenantId && book.tenantId !== SYSTEM_TENANT && !hasActiveMembership) {
    return { ok: false, reason: 'wrong-tenant', status: 403 };
  }

  if (enforceTier) {
    const required = TIER_RANK[String(book.accessTier).toUpperCase()];
    if (required) {
      if (!user) return { ok: false, reason: 'tier-too-low', status: 403 };
      const trialActive = !!user.trialEndsAt && user.trialEndsAt > now;
      if (!trialActive) {
        const held = TIER_RANK[String(user.subscriptionTier ?? '').toUpperCase()];
        // Unrecognised tier strings pass. See the note on tierAllows: ranking an
        // unknown value as 0 locks out paying legacy subscribers.
        if (held !== undefined && held < required) {
          return { ok: false, reason: 'tier-too-low', status: 403 };
        }
      }
    }
  }

  return { ok: true, book };
}

/** Throws nothing; returns a discriminated result so the caller controls the response. */
export async function checkBookReadAccess(userId: string, bookId: string): Promise<AccessResult> {
  // findFirst, not findUnique: `deletedAt` is part of the predicate, and a binned
  // book must read as "not found" rather than "forbidden".
  const book = await prisma.book.findFirst({
    where: { id: bookId, deletedAt: null },
    select: { id: true, tenantId: true, accessTier: true, drmProtected: true },
  });

  let hasActiveMembership = false;
  if (book?.tenantId && book.tenantId !== SYSTEM_TENANT) {
    const membership = await prisma.userTenantMembership.findFirst({
      where: { userId, tenantId: book.tenantId, status: 'ACTIVE' },
      select: { id: true },
    });
    hasActiveMembership = !!membership;
  }

  const enforceTier = process.env.ENFORCE_BOOK_TIER === 'true';
  const user = enforceTier
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true, trialEndsAt: true },
      })
    : null;

  return decideBookAccess({ book, hasActiveMembership, user, enforceTier });
}

