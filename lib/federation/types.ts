/**
 * Vidyaverse OIDC claims shape (subset Book Buddy consumes).
 * See Vidyaverse Pro/docs/identity-federation-design.md §9 for the contract.
 */
export interface VidyaverseMembershipClaim {
  institution_id: string;
  institution_code: string;
  institution_name: string;
  institution_type: 'SCHOOL' | 'COLLEGE' | 'UNIVERSITY' | 'COACHING' | string;
  role: string;
  assigned_classes: unknown;
  assigned_sections: unknown;
  subscription_tier: string;
  subscription_status: string;
}

export interface VidyaverseIdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  iat: number;
  exp: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string | null;
  global_role?: string | null;
  memberships?: VidyaverseMembershipClaim[];
  entitlements_url?: string;
}

/**
 * Maps Vidyaverse InstitutionRole → Book Buddy TenantRole.
 * See identity-federation-design.md §9.1.
 */
const ROLE_MAP: Record<string, 'admin' | 'librarian' | 'teacher' | 'student'> = {
  main_admin: 'admin',
  school_admin: 'admin',
  owner: 'admin',
  admin: 'admin',
  principal: 'admin',
  teacher: 'teacher',
  librarian: 'librarian',
  staff: 'librarian',
  student: 'student',
  parent: 'student',
};

export function mapToBookBuddyRole(vidyaverseRole: string): 'admin' | 'librarian' | 'teacher' | 'student' {
  return ROLE_MAP[vidyaverseRole.toLowerCase()] ?? 'student';
}

/**
 * Vidyaverse `global_role` (platform-level, `GlobalRole` enum:
 * super_admin | admin | support | student | user — see
 * Vidyaverse Pro/backend/prisma/schema.prisma) → Book Buddy's platform-level
 * `User.role` (`UserRole` enum: SUPER_ADMIN | ADMIN | LIBRARIAN | TEACHER |
 * STUDENT — see backend/prisma/schema.prisma:51-57 / prisma/schema.prisma).
 *
 * Only listed values are confident 1:1 matches. Vidyaverse's `GlobalRole` has
 * no `librarian`/`teacher` equivalent (those are tenant-scoped memberships,
 * handled separately by mapToBookBuddyRole above) and no `support` equivalent —
 * Book Buddy has no platform-level support role, so `support` is NOT inferred to
 * mean anything. `super_admin` is deliberately excluded from this map: it can
 * never be granted through an ordinary write (trg_protect_super_admin blocks
 * it even from a SECURITY DEFINER function — verified empirically 2026-08-05,
 * is_superuser tracks session identity through a path SECURITY DEFINER
 * doesn't touch), so it is handled by a separate detect-and-audit path in
 * jit.ts, never by this mapper.
 *
 * Any value with no entry here — including `support`, `user`, and anything
 * the IdP adds in future — falls back to the lowest-privilege role and the
 * caller must log it. Never infer an equivalence that isn't listed.
 */
export type BookBuddyPlatformRole = 'super-admin' | 'admin' | 'librarian' | 'teacher' | 'student';

export const BOOK_BUDDY_LOWEST_PRIVILEGE_ROLE: BookBuddyPlatformRole = 'student';

const GLOBAL_ROLE_TO_BOOK_BUDDY_PLATFORM_ROLE: Record<string, BookBuddyPlatformRole> = {
  admin: 'admin',
  student: 'student',
};

export function mapGlobalRoleToBookBuddyPlatformRole(
  globalRole: string | null | undefined,
): { role: BookBuddyPlatformRole; matched: boolean } {
  if (!globalRole) return { role: BOOK_BUDDY_LOWEST_PRIVILEGE_ROLE, matched: false };
  const mapped = GLOBAL_ROLE_TO_BOOK_BUDDY_PLATFORM_ROLE[globalRole.toLowerCase()];
  return mapped ? { role: mapped, matched: true } : { role: BOOK_BUDDY_LOWEST_PRIVILEGE_ROLE, matched: false };
}

/**
 * Two-trio federation: Book Buddy is a shared service layer for BOTH control planes
 * — Vidyaverse (formal institutions) and VDL (D2C coaching/library). Both IdPs
 * emit the identical claim contract above, so the only thing that tells the two
 * trios apart on the RP side is which Better Auth provider minted the session.
 * See Vidyaverse Pro/docs/two-trio-federation-design.md.
 */
export type ControlPlane = 'vidyaverse' | 'vdl';

/** Federated provider ids Book Buddy accepts, newest-session-wins. */
export const FEDERATION_PROVIDER_IDS = ['vidyaverse', 'vdl'] as const;

/** Maps a Better Auth providerId (or token issuer hint) to its control plane. */
export function controlPlaneFromProvider(providerId: string): ControlPlane {
  return providerId === 'vdl' ? 'vdl' : 'vidyaverse';
}
