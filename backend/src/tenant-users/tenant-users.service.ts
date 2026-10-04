import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, Prisma, TenantRole, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertTenantAdmin } from '../common/tenant-admin-access';

type Actor = { id: string; role: UserRole };

export interface TenantUserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

const MAX_PAGE_SIZE = 100;

/**
 * Users of one institution, managed by that institution's admins.
 *
 * Everything here acts on the membership (UserTenantMembership), never on the
 * global User row: an institution admin can suspend or remove someone from their
 * own institution, but cannot disable the person's account platform-wide. The
 * actor must be a super-admin or hold an active ADMIN membership in the tenant.
 */
@Injectable()
export class TenantUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(actor: Actor, tenantId: string, query: TenantUserQuery) {
    await this.assertCanManage(actor, tenantId);

    const page = Math.max(1, Math.floor(query.page ?? 1));
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.limit ?? 20)));

    const where: Prisma.UserTenantMembershipWhereInput = { tenantId };

    const role = this.parseEnum(TenantRole, query.role);
    if (role) where.role = role;

    const status = this.parseEnum(MembershipStatus, query.status);
    if (status) where.status = status;

    const search = query.search?.trim();
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [rows, total, counts] = await Promise.all([
      this.prisma.userTenantMembership.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
              image: true,
              profilePicture: true,
            },
          },
        },
      }),
      this.prisma.userTenantMembership.count({ where }),
      this.prisma.userTenantMembership.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { _all: true },
      }),
    ]);

    const byStatus = Object.fromEntries(
      counts.map((c) => [c.status, c._count._all]),
    ) as Partial<Record<MembershipStatus, number>>;

    return {
      data: rows.map((m) => ({
        id: m.user.id,
        name: m.user.name ?? m.user.email,
        email: m.user.email,
        role: m.role,
        status: m.status,
        // The platform-level account state, shown read-only: a globally disabled
        // account is inactive here regardless of the membership.
        accountActive: m.user.isActive,
        isPlatformSuperAdmin: m.user.role === UserRole.SUPER_ADMIN,
        lastLoginAt: m.user.lastLoginAt,
        joinedAt: m.createdAt,
        image: m.user.image ?? m.user.profilePicture ?? null,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        total: Object.values(byStatus).reduce((a, b) => a + (b ?? 0), 0),
        active: byStatus[MembershipStatus.ACTIVE] ?? 0,
        suspended: byStatus[MembershipStatus.SUSPENDED] ?? 0,
        pending: byStatus[MembershipStatus.PENDING] ?? 0,
      },
    };
  }

  async setStatus(
    actor: Actor,
    tenantId: string,
    userId: string,
    statusInput: string,
  ) {
    const status = this.parseEnum(MembershipStatus, statusInput);
    if (status !== MembershipStatus.ACTIVE && status !== MembershipStatus.SUSPENDED) {
      throw new BadRequestException('status must be ACTIVE or SUSPENDED');
    }

    const target = await this.loadTarget(actor, tenantId, userId);
    if (target.status === status) return this.toResult(target, status);

    const updated = await this.prisma.userTenantMembership.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { status },
    });

    await this.audit(actor, tenantId, userId, 'tenant_user_status_changed', {
      from: target.status,
      to: status,
    });
    return this.toResult(target, updated.status);
  }

  async setRole(actor: Actor, tenantId: string, userId: string, roleInput: string) {
    const role = this.parseEnum(TenantRole, roleInput);
    if (!role) {
      throw new BadRequestException(
        `role must be one of: ${Object.values(TenantRole).join(', ')}`,
      );
    }

    const target = await this.loadTarget(actor, tenantId, userId);
    if (target.role === role) return this.toResult(target, target.status, role);

    await this.prisma.userTenantMembership.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { role },
    });

    await this.audit(actor, tenantId, userId, 'tenant_user_role_changed', {
      from: target.role,
      to: role,
    });
    return this.toResult(target, target.status, role);
  }

  /** Removes the person from this institution only; their account is untouched. */
  async remove(actor: Actor, tenantId: string, userId: string) {
    const target = await this.loadTarget(actor, tenantId, userId);

    await this.prisma.userTenantMembership.delete({
      where: { userId_tenantId: { userId, tenantId } },
    });

    await this.audit(actor, tenantId, userId, 'tenant_user_removed', {
      role: target.role,
      email: target.user.email,
    });
    return { success: true };
  }

  /** Super-admin, or an active ADMIN of this institution. Librarians cannot manage users. */
  private async assertCanManage(actor: Actor, tenantId: string) {
    await assertTenantAdmin(
      this.prisma,
      actor,
      tenantId,
      'You do not have permission to manage users for this institution',
    );
  }

  /**
   * Authorises the actor and returns the target's membership. Refuses the
   * actor's own membership (no locking yourself out or self-demoting) and
   * platform super-admins, who are not an institution admin's to change.
   */
  private async loadTarget(actor: Actor, tenantId: string, userId: string) {
    await this.assertCanManage(actor, tenantId);

    if (actor.id === userId) {
      throw new BadRequestException('You cannot change your own membership');
    }

    const target = await this.prisma.userTenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (!target) throw new NotFoundException('User is not a member of this institution');

    if (target.user.role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Platform administrators cannot be changed here');
    }
    return target;
  }

  private toResult(
    target: { userId: string; role: TenantRole; status: MembershipStatus },
    status: MembershipStatus,
    role: TenantRole = target.role,
  ) {
    return { id: target.userId, role, status };
  }

  private async audit(
    actor: Actor,
    tenantId: string,
    userId: string,
    action: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: actor.id,
        tenantId,
        action,
        entityType: 'user',
        entityId: userId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private parseEnum<T extends Record<string, string>>(
    enumObj: T,
    value?: string,
  ): T[keyof T] | undefined {
    if (!value || value.toLowerCase() === 'all') return undefined;
    const upper = value.toUpperCase();
    return (Object.values(enumObj) as string[]).includes(upper)
      ? (upper as T[keyof T])
      : undefined;
  }
}
