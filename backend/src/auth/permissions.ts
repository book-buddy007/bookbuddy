import { TenantRole, UserRole } from '@prisma/client';

/**
 * Tenant-scoped RBAC.
 *
 * Distinct from `roles.guard.ts`, which checks the *platform* role on the User
 * record (SUPER_ADMIN and friends). This map governs what someone may do
 * **inside an institution**, where the same person can be an admin of one
 * tenant and a student of another.
 *
 * Modelled on the access-control matrix from the `feat/better-auth-real-migration`
 * branch, but expressed as plain data: this project does not depend on
 * `better-auth`, so the original `createAccessControl` form could not be used
 * directly.
 */

export const RESOURCES = ['catalog', 'borrowing', 'joinRequest', 'reports'] as const;
export type Resource = (typeof RESOURCES)[number];

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject';

type PermissionMatrix = Record<Resource, readonly Action[]>;

const NONE: readonly Action[] = [];

/** Institution admin — full control within their own tenant. */
const ADMIN: PermissionMatrix = {
  catalog: ['create', 'read', 'update', 'delete'],
  borrowing: ['create', 'read', 'update', 'approve', 'reject'],
  joinRequest: ['read', 'approve', 'reject'],
  reports: ['read'],
};

/** Librarian — runs the collection and the desk, but cannot delete titles. */
const LIBRARIAN: PermissionMatrix = {
  catalog: ['create', 'read', 'update'],
  borrowing: ['create', 'read', 'update', 'approve', 'reject'],
  joinRequest: ['read', 'approve', 'reject'],
  reports: ['read'],
};

/** Teacher — assigns and borrows, but does not admit members. */
const TEACHER: PermissionMatrix = {
  catalog: ['read'],
  borrowing: ['create', 'read'],
  joinRequest: NONE,
  reports: NONE,
};

/** Student — browse, borrow, read, and apply to join. */
const STUDENT: PermissionMatrix = {
  catalog: ['read'],
  borrowing: ['create', 'read'],
  joinRequest: ['create'],
  reports: NONE,
};

export const TENANT_PERMISSIONS: Record<TenantRole, PermissionMatrix> = {
  [TenantRole.ADMIN]: ADMIN,
  [TenantRole.LIBRARIAN]: LIBRARIAN,
  [TenantRole.TEACHER]: TEACHER,
  [TenantRole.STUDENT]: STUDENT,
};

export interface PermissionCheck {
  resource: Resource;
  action: Action;
}

/**
 * Whether a tenant role may perform an action.
 *
 * Platform super-admins are handled by the caller, not here: cross-tenant
 * authority is a different question from what a role means inside one tenant,
 * and folding it in would hide the distinction.
 */
export function tenantRoleCan(
  role: TenantRole | null | undefined,
  resource: Resource,
  action: Action,
): boolean {
  if (!role) return false;

  const matrix = TENANT_PERMISSIONS[role];
  if (!matrix) return false;

  return matrix[resource].includes(action);
}

/** Convenience wrapper that also lets platform super-admins through. */
export function can(
  platformRole: UserRole | string | null | undefined,
  tenantRole: TenantRole | null | undefined,
  resource: Resource,
  action: Action,
): boolean {
  if (platformRole === UserRole.SUPER_ADMIN) return true;
  return tenantRoleCan(tenantRole, resource, action);
}
