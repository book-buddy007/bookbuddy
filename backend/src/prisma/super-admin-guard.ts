import type { Prisma } from '@prisma/client';

/**
 * SECURITY — the super-admin (platform owner) role is not transferable.
 *
 * Enforced as Prisma middleware rather than at each call site, because `role`
 * can be written from many places (signup, the federation JIT sync, the admin
 * APIs, scripts) and a per-site check only protects the sites someone
 * remembered. Every write to `User` funnels through here.
 *
 * The database carries the same rules in a trigger, so a direct SQL write or a
 * path that bypasses Prisma is still refused. This layer exists to fail early
 * with a readable message instead of a raw driver error.
 *
 * NOTE: `SUPER_ADMIN` is the Prisma client value; Prisma maps it to the column
 * value `super-admin` (see `enum UserRole` in schema.prisma).
 */
const OWNER_ROLE = 'SUPER_ADMIN';

/** The one address permitted to hold the owner role, if configured. */
function ownerEmail(): string | null {
  return process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || null;
}

function isOwnerEmail(email: unknown): boolean {
  const target = ownerEmail();
  if (!target) return false;
  return typeof email === 'string' && email.trim().toLowerCase() === target;
}

function grantsOwner(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const role = (data as Record<string, unknown>).role;
  // Prisma also accepts { role: { set: 'X' } }
  const value =
    role &&
    typeof role === 'object' &&
    'set' in (role as Record<string, unknown>)
      ? (role as Record<string, unknown>).set
      : role;
  return value === OWNER_ROLE;
}

function removesOwner(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const raw = (data as Record<string, unknown>).role;
  if (raw === undefined) return false; // role not being touched
  const value =
    raw && typeof raw === 'object' && 'set' in (raw as Record<string, unknown>)
      ? (raw as Record<string, unknown>).set
      : raw;
  return value !== OWNER_ROLE;
}

export class SuperAdminProtectionError extends Error {}

/**
 * Prisma middleware guarding the owner role. Attach once, on the client.
 */
export function superAdminGuard(): Prisma.Middleware {
  return async (params, next) => {
    if (params.model !== 'User') return next(params);

    const args = (params.args ?? {}) as Record<string, unknown>;

    // ── creating an owner ────────────────────────────────────────────────────
    if (params.action === 'create' || params.action === 'createMany') {
      const payload = args.data;
      const rows = Array.isArray(payload) ? payload : [payload];
      for (const row of rows) {
        if (
          grantsOwner(row) &&
          !isOwnerEmail((row as Record<string, unknown>)?.email)
        ) {
          throw new SuperAdminProtectionError(
            'The super-admin role is reserved for the platform owner and cannot be assigned.',
          );
        }
      }
      return next(params);
    }

    // ── deleting ─────────────────────────────────────────────────────────────
    if (params.action === 'delete' || params.action === 'deleteMany') {
      const victims = await currentOwnersMatching(next, params);
      if (victims > 0) {
        throw new SuperAdminProtectionError(
          'The super-admin (platform owner) account cannot be deleted.',
        );
      }
      return next(params);
    }

    // ── updating ─────────────────────────────────────────────────────────────
    if (
      params.action === 'update' ||
      params.action === 'updateMany' ||
      params.action === 'upsert'
    ) {
      const data = params.action === 'upsert' ? args.update : args.data;

      if (grantsOwner(data)) {
        // Promoting: only permitted when the target IS the configured owner.
        const target = await findOneUser(next, params);
        if (!target || !isOwnerEmail(target.email)) {
          throw new SuperAdminProtectionError(
            'The super-admin role is reserved for the platform owner and cannot be assigned.',
          );
        }
      } else if (removesOwner(data)) {
        // Demoting: refuse if any matched row is currently the owner.
        const owners = await currentOwnersMatching(next, params);
        if (owners > 0) {
          throw new SuperAdminProtectionError(
            'The super-admin role cannot be removed from the platform owner account.',
          );
        }
      }

      if (params.action === 'upsert' && grantsOwner(args.create)) {
        const createEmail = (args.create as Record<string, unknown>)?.email;
        if (!isOwnerEmail(createEmail)) {
          throw new SuperAdminProtectionError(
            'The super-admin role is reserved for the platform owner and cannot be assigned.',
          );
        }
      }

      return next(params);
    }

    return next(params);
  };
}

/** Count rows matching this operation's `where` that currently hold the owner role. */
async function currentOwnersMatching(
  next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
  params: Prisma.MiddlewareParams,
): Promise<number> {
  const where =
    (params.args as Record<string, unknown> | undefined)?.where ?? {};
  const rows = (await next({
    ...params,
    action: 'findMany',
    args: {
      where: { AND: [where, { role: OWNER_ROLE }] },
      select: { id: true },
    },
  })) as unknown[];
  return Array.isArray(rows) ? rows.length : 0;
}

/** Resolve the single row this operation targets, for email checks. */
async function findOneUser(
  next: (params: Prisma.MiddlewareParams) => Promise<unknown>,
  params: Prisma.MiddlewareParams,
): Promise<{ email: string } | null> {
  const where =
    (params.args as Record<string, unknown> | undefined)?.where ?? {};
  const rows = (await next({
    ...params,
    action: 'findMany',
    args: { where, select: { email: true } },
  })) as Array<{ email: string }>;
  if (!Array.isArray(rows) || rows.length !== 1) return null;
  return rows[0];
}
