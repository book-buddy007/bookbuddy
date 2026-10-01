/**
 * JIT (just-in-time) provisioning for federated Vidyaverse sign-ins.
 *
 * Called from the Better Auth session hook after a successful OIDC login.
 * Reads the user's vidyaverse Account row, parses the stored ID token, and:
 *  1. Resolves each membership.institution_id → Book Buddy Tenant (auto-create if missing)
 *  2. Upserts UserTenantMembership rows
 *  3. Suspends memberships that disappeared from the latest token
 *
 * See Vidyaverse Pro/docs/identity-federation-design.md §9-§10.
 */
import { prisma } from '@/lib/prisma';
import { TenantRole, MembershipStatus, TenantType, AccountType, UserRole } from '@prisma/client';
import type { VidyaverseIdTokenClaims, VidyaverseMembershipClaim, ControlPlane } from './types';
import {
  mapToBookBuddyRole,
  mapGlobalRoleToBookBuddyPlatformRole,
  BOOK_BUDDY_LOWEST_PRIVILEGE_ROLE,
  FEDERATION_PROVIDER_IDS,
  controlPlaneFromProvider,
} from './types';

/** OIDC subs (Vidyaverse `sub`) allowed to hold Book Buddy's super-admin role. */
const SUPER_ADMIN_SUBS = (process.env.FEDERATION_SUPER_ADMIN_SUBS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function toPrismaUserRole(role: string): UserRole {
  return role.toUpperCase().replace(/-/g, '_') as UserRole;
}

/**
 * Reconciles platform-level `User.role` from the federated `global_role`
 * claim on every re-link. Ordinary roles (admin/student/anything mapped in
 * mapGlobalRoleToBookBuddyPlatformRole) are a plain write — trg_protect_super_admin
 * only guards the 'super-admin' value.
 *
 * `super_admin` can NEVER be granted here. Book Buddy's app DB role (`book_buddy_app`)
 * is not a Postgres superuser, and the trigger requires an actual superuser
 * session — verified empirically (2026-08-05) that this holds even through a
 * SECURITY DEFINER function, so there is no code path, however narrowly
 * wrapped, that can launder it. This is deliberate, not a gap: no login
 * should be able to silently mint a super-admin. When the claim asks for it,
 * this writes an audit trail instead of a role change; the actual grant stays
 * a manual, deliberate escape-hatch transaction (see TRIO_RESET_PROGRESS.md,
 * 2026-08-05 "Step 0 — Restore access" for the pattern) until Phase 1 of the
 * Trio Content Service build lands `identity.principal.platform_role` as the
 * authoritative source and RPs stop storing a local role column at all — at
 * that point this whole function, and the trigger question with it, goes away.
 */
async function syncPlatformRole(
  userId: string,
  sub: string,
  currentRole: UserRole,
  globalRole: string | null | undefined,
): Promise<void> {
  if (!globalRole) return;

  if (globalRole.toLowerCase() === 'super_admin') {
    if (currentRole === UserRole.SUPER_ADMIN) return; // already correct, nothing to reconcile
    const allowlisted = SUPER_ADMIN_SUBS.includes(sub);
    if (!allowlisted) {
      console.error(`[federation] super_admin claim for sub=${sub} is not in FEDERATION_SUPER_ADMIN_SUBS — refusing`);
    }
    await prisma.auditLog.create({
      data: {
        action: 'federation.super_admin_claim_requires_manual_elevation',
        entityType: 'User',
        entityId: userId,
        userId,
        status: allowlisted ? 'PENDING' : 'BLOCKED',
        metadata: {
          sub,
          claimedGlobalRole: globalRole,
          note:
            'trg_protect_super_admin cannot be satisfied by app code (book_buddy_app is non-superuser; ' +
            'verified SECURITY DEFINER does not launder is_superuser). Manual escape-hatch elevation ' +
            'required until Phase 1/identity.principal.platform_role removes this local column.',
        },
      },
    });
    return;
  }

  const { role: mappedRole, matched } = mapGlobalRoleToBookBuddyPlatformRole(globalRole);
  if (!matched) {
    console.warn(`[federation] unrecognized global_role="${globalRole}" for sub=${sub} — defaulting to ${BOOK_BUDDY_LOWEST_PRIVILEGE_ROLE}`);
    await prisma.auditLog.create({
      data: {
        action: 'federation.unmapped_global_role',
        entityType: 'User',
        entityId: userId,
        userId,
        status: 'WARN',
        metadata: { sub, claimedGlobalRole: globalRole, fellBackTo: BOOK_BUDDY_LOWEST_PRIVILEGE_ROLE },
      },
    });
  }

  if (currentRole === UserRole.SUPER_ADMIN) return; // never silently touch the owner's role
  const prismaRole = toPrismaUserRole(mappedRole);
  if (currentRole !== prismaRole) {
    await prisma.user.update({ where: { id: userId }, data: { role: prismaRole } });
  }
}

/**
 * JWT decode without verification — Better Auth already verified the signature
 * during the OAuth callback before storing the token. Safe to trust here.
 */
function decodeIdToken(idToken: string | null | undefined): VidyaverseIdTokenClaims | null {
  if (!idToken) return null;
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    return JSON.parse(payload) as VidyaverseIdTokenClaims;
  } catch {
    return null;
  }
}

function bookBuddyTenantTypeFromVidyaverse(t: string): TenantType {
  switch (t.toUpperCase()) {
    case 'SCHOOL': return TenantType.SCHOOL;
    case 'COLLEGE': return TenantType.COLLEGE;
    case 'UNIVERSITY': return TenantType.UNIVERSITY;
    case 'COACHING': return TenantType.CORPORATE;
    default: return TenantType.SCHOOL;
  }
}

/**
 * Resolves a Vidyaverse institution to a local Book Buddy tenant.
 * Lookup order:
 *   1. Tenant.metadata.vidyaverse_institution_id === claim.institution_id
 *   2. Tenant.domain === `<code>.vidyaverse.local`
 * If neither hit, creates a new Tenant.
 */
function tenantMetadata(controlPlane: ControlPlane, institutionId: string): string {
  return JSON.stringify({
    control_plane: controlPlane,
    cp_subject_id: institutionId,
    // Legacy key kept so Tenants created before two-trio support still match.
    ...(controlPlane === 'vidyaverse' ? { vidyaverse_institution_id: institutionId } : {}),
  });
}

async function resolveOrCreateTenant(
  membership: VidyaverseMembershipClaim,
  controlPlane: ControlPlane,
): Promise<string> {
  // Namespace the fallback domain per control plane so the two trios can never
  // collide on the same institution_code (e.g. "alpha" in both).
  const planLabel = controlPlane === 'vdl' ? 'vdl.local' : 'vidyaverse.local';
  const fallbackDomain = `${membership.institution_code.toLowerCase()}.${planLabel}`;

  const all = await prisma.tenant.findMany({
    where: { OR: [{ domain: fallbackDomain }] },
  });
  const matched = all.find((t) => {
    if (!t.metadata) return false;
    try {
      const meta = JSON.parse(t.metadata) as Record<string, unknown>;
      const sameSubject =
        meta.cp_subject_id === membership.institution_id ||
        meta.vidyaverse_institution_id === membership.institution_id;
      const samePlane = meta.control_plane ? meta.control_plane === controlPlane : true;
      return sameSubject && samePlane;
    } catch {
      return false;
    }
  }) ?? all.find((t) => t.domain === fallbackDomain);

  if (matched) {
    if (!matched.metadata || !matched.metadata.includes('control_plane')) {
      await prisma.tenant.update({
        where: { id: matched.id },
        data: { metadata: tenantMetadata(controlPlane, membership.institution_id) },
      });
    }
    return matched.id;
  }

  const created = await prisma.tenant.create({
    data: {
      name: membership.institution_name,
      domain: fallbackDomain,
      type: bookBuddyTenantTypeFromVidyaverse(membership.institution_type),
      isActive: true,
      allowJoinRequests: false,
      slug: `${controlPlane}-${membership.institution_code.toLowerCase()}`,
      metadata: tenantMetadata(controlPlane, membership.institution_id),
    },
  });
  return created.id;
}

/**
 * Retires the local password when a federated identity is linked to this user.
 *
 * Called from databaseHooks.account.create.after the moment a vidyaverse/vdl
 * Account row appears — i.e. exactly at link time, before anything else can
 * mutate the user. Doing it here rather than on session-create matters twice
 * over: session-create fires for ordinary local logins too (which would delete a
 * credential that had just been created), and better-auth flips emailVerified to
 * true during linking, so a later check of that flag can never tell a linked
 * account from an already-verified one.
 *
 * Why retire it at all: local sign-up here never proves the address, so no local
 * password on this app is email-proven. Someone can register with an address they
 * don't own and wait; if the real owner then arrives via Vidyaverse, linking would
 * hand them an account whose password a stranger still knows. Since the IdP is now
 * the proven identity, the unproven password goes. A password reset — which does
 * prove the address — restores one.
 */
export async function retireLocalCredential(userId: string): Promise<void> {
  await prisma.account.deleteMany({ where: { userId, providerId: 'credential' } });
}

/**
 * Public entry point — called from databaseHooks.session.create.after.
 * Reads the most recent vidyaverse Account for the user, syncs memberships.
 * Returns true if anything was reconciled (for logging/audit).
 */
export async function syncFederatedSession(userId: string): Promise<boolean> {
  // Newest federated session wins, regardless of which control plane it came from.
  const account = await prisma.account.findFirst({
    where: { userId, providerId: { in: [...FEDERATION_PROVIDER_IDS] } },
    orderBy: { updatedAt: 'desc' },
  });
  if (!account) return false;

  const controlPlane = controlPlaneFromProvider(account.providerId);

  const claims = decodeIdToken(account.idToken);
  if (!claims || !claims.memberships) return false;

  const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (currentUser) {
    await syncPlatformRole(userId, account.accountId, currentUser.role, claims.global_role);
  }

  // Mark user as institutional so domain code knows this is a B2B session.
  // Only when there's an actual membership to be institutional about — an
  // empty memberships[] (e.g. the platform owner, who isn't a tenant member)
  // must not flip accountType, or the B2B "waiting for approval" screen fires
  // for someone who was never trying to join anything.
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(claims.memberships.length > 0 ? { accountType: AccountType.INSTITUTIONAL } : {}),
      lastLoginAt: new Date(),
    },
  });

  const targetTenantIds = new Set<string>();
  for (const m of claims.memberships) {
    const tenantId = await resolveOrCreateTenant(m, controlPlane);
    targetTenantIds.add(tenantId);

    const role = mapToBookBuddyRole(m.role);
    const tenantRole: TenantRole = (TenantRole as Record<string, TenantRole>)[role.toUpperCase()] ?? TenantRole.STUDENT;

    await prisma.userTenantMembership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      create: {
        userId,
        tenantId,
        role: tenantRole,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      },
      update: {
        role: tenantRole,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  // Suspend memberships that the IdP no longer reports.
  await prisma.userTenantMembership.updateMany({
    where: {
      userId,
      tenantId: { notIn: Array.from(targetTenantIds) },
      status: MembershipStatus.ACTIVE,
    },
    data: { status: MembershipStatus.SUSPENDED },
  });

  return true;
}
