import { TenantRole } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Tenant context — the single answer to "which institution is this request
 * acting in?".
 *
 * Before this existed, controllers reached for `req.user.currentTenantId` and
 * `req.user.tenantId`. Neither is ever assigned: `currentTenantId` appears
 * nowhere else in the codebase, and the Prisma `User` model has no `tenantId`
 * column. The first silently produced `undefined`, which Prisma treats as "no
 * filter" and drops from the `where` clause; the second fell through to the
 * literal string `'test-tenant'`, which persisted because `Annotation.tenantId`
 * is a plain String and not a foreign key.
 *
 * Read the context through `getTenantContext()` so there is one place to change
 * if the resolution rules move.
 */

export interface TenantContext {
  tenantId: string | null;
  tenantRole: TenantRole | null;
}

/**
 * `tenantId` is nullable on Annotation, VocabularyItem, FlashcardDeck and
 * BookPage, so a reader with no institution simply stores NULL. There is no
 * placeholder tenant any more: the previous `'test-tenant'` sentinel was
 * removed by `scripts/backfill-tenant-sentinel.ts`.
 *
 * Prisma treats the two absent values differently, and the distinction matters:
 *   - `undefined` in a `where` drops the condition entirely (match any tenant)
 *   - `null` matches only rows that are genuinely unscoped
 */

/** Both spellings are accepted: the web client sends the second. */
const TENANT_HEADERS = ['x-tenant-id', 'x-active-tenant-id'] as const;

const CONTEXT_KEY = '__tenantContext';

export function readTenantHeader(
  headers: Record<string, unknown>,
): string | null {
  for (const name of TENANT_HEADERS) {
    const value = headers?.[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function setTenantContext(request: any, context: TenantContext): void {
  request[CONTEXT_KEY] = context;
}

/**
 * The resolved context, or a null context when the request is not acting
 * inside any institution.
 *
 * A null `tenantId` is a legitimate state, not an error: independent (B2C)
 * readers have no institution, and their rows are scoped by `userId` alone.
 */
export function getTenantContext(request: any): TenantContext {
  const stored = request?.[CONTEXT_KEY] as TenantContext | undefined;
  if (stored) return stored;

  // Falls back to the shape the older TenantContextGuard set directly, so a
  // route still using that guard alone keeps working.
  const legacyTenant = request?.tenant;
  if (legacyTenant?.id) {
    return {
      tenantId: legacyTenant.id,
      tenantRole: (request.tenantRole as TenantRole) ?? null,
    };
  }

  return { tenantId: null, tenantRole: null };
}

/** Convenience for services that only need the id. */
export function getTenantId(request: any): string | null {
  return getTenantContext(request).tenantId;
}

/**
 * Work out which institution a request is acting in.
 *
 * Order:
 *   1. An explicit tenant header, validated against the caller's memberships.
 *   2. Their single ACTIVE membership, when they have exactly one.
 *   3. No tenant.
 *
 * Step 2 deliberately requires *exactly* one membership. Picking the first of
 * several would silently choose an institution on the user's behalf and write
 * their data into it — better to require the client to say which.
 */
export async function resolveTenantContext(
  prisma: PrismaService,
  userId: string,
  requestedTenantId: string | null,
): Promise<TenantContext> {
  if (requestedTenantId) {
    const membership = await prisma.userTenantMembership.findFirst({
      where: { userId, tenantId: requestedTenantId, status: 'ACTIVE' },
      select: { tenantId: true, role: true },
    });

    if (membership) {
      return { tenantId: membership.tenantId, tenantRole: membership.role };
    }

    // An unusable header is not silently ignored — returning a null context
    // here would let the request proceed against no tenant at all.
    return { tenantId: null, tenantRole: null };
  }

  const active = await prisma.userTenantMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { tenantId: true, role: true },
    take: 2,
  });

  if (active.length === 1) {
    return { tenantId: active[0].tenantId, tenantRole: active[0].role };
  }

  return { tenantId: null, tenantRole: null };
}
