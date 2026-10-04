import { ForbiddenException } from '@nestjs/common';
import { MembershipStatus, TenantRole, UserRole } from '@prisma/client';

type MembershipLookup = {
  userTenantMembership: {
    findUnique(args: {
      where: { userId_tenantId: { userId: string; tenantId: string } };
      select: { role: true; status: true };
    }): Promise<{ role: TenantRole; status: MembershipStatus } | null>;
  };
};

/**
 * Passes for a platform super-admin or an active ADMIN of this institution; throws 403 for
 * everyone else, including librarians and admins of other institutions. Authorisation is by
 * membership in the tenant named in the request, never by a global role alone.
 */
export async function assertTenantAdmin(
  prisma: MembershipLookup,
  actor: { id: string; role: UserRole },
  tenantId: string,
  deniedMessage = 'You do not have permission to manage this institution',
): Promise<void> {
  if (actor.role === UserRole.SUPER_ADMIN) return;

  const membership = await prisma.userTenantMembership.findUnique({
    where: { userId_tenantId: { userId: actor.id, tenantId } },
    select: { role: true, status: true },
  });

  if (
    membership?.status !== MembershipStatus.ACTIVE ||
    membership.role !== TenantRole.ADMIN
  ) {
    throw new ForbiddenException(deniedMessage);
  }
}
