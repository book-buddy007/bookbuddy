import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MembershipStatus, TenantRole, UserRole } from '@prisma/client';
import { TenantUsersService } from './tenant-users.service';

const TENANT = 'tenant-1';

const makePrisma = () => ({
  userTenantMembership: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
});

describe('TenantUsersService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: TenantUsersService;

  const admin = { id: 'admin-1', role: UserRole.ADMIN };

  /** First findUnique is the actor's membership, second is the target's. */
  const asTenantAdmin = (target?: object | null) => {
    prisma.userTenantMembership.findUnique
      .mockResolvedValueOnce({ role: TenantRole.ADMIN, status: MembershipStatus.ACTIVE })
      .mockResolvedValueOnce(target);
  };

  const member = (over: Record<string, unknown> = {}) => ({
    userId: 'u-2',
    role: TenantRole.STUDENT,
    status: MembershipStatus.ACTIVE,
    user: { id: 'u-2', email: 's@x.test', role: UserRole.STUDENT },
    ...over,
  });

  beforeEach(() => {
    prisma = makePrisma();
    service = new TenantUsersService(prisma as any);
  });

  describe('authorisation', () => {
    it('refuses an admin of some other institution', async () => {
      prisma.userTenantMembership.findUnique.mockResolvedValueOnce(null);
      await expect(service.list(admin, TENANT, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a librarian: only admins manage users', async () => {
      prisma.userTenantMembership.findUnique.mockResolvedValueOnce({
        role: TenantRole.LIBRARIAN,
        status: MembershipStatus.ACTIVE,
      });
      await expect(service.list(admin, TENANT, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses a suspended admin', async () => {
      prisma.userTenantMembership.findUnique.mockResolvedValueOnce({
        role: TenantRole.ADMIN,
        status: MembershipStatus.SUSPENDED,
      });
      await expect(service.list(admin, TENANT, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets a platform super-admin through without a membership', async () => {
      await service.list({ id: 'sa', role: UserRole.SUPER_ADMIN }, TENANT, {});
      expect(prisma.userTenantMembership.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('scopes the query to the tenant and clamps the page size', async () => {
      asTenantAdmin();
      await service.list(admin, TENANT, { limit: 9999, page: -3, role: 'teacher', status: 'all' });
      const args = prisma.userTenantMembership.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ tenantId: TENANT, role: TenantRole.TEACHER });
      expect(args.take).toBe(100);
      expect(args.skip).toBe(0);
    });

    it('ignores unknown role and status values instead of passing them to Prisma', async () => {
      asTenantAdmin();
      await service.list(admin, TENANT, { role: 'wizard', status: 'nope' });
      expect(prisma.userTenantMembership.findMany.mock.calls[0][0].where).toEqual({
        tenantId: TENANT,
      });
    });
  });

  describe('changes to a member', () => {
    it('will not act on the actor themselves', async () => {
      asTenantAdmin();
      await expect(service.remove(admin, TENANT, admin.id)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.userTenantMembership.delete).not.toHaveBeenCalled();
    });

    it('404s for someone who is not a member of this institution', async () => {
      asTenantAdmin(null);
      await expect(service.setRole(admin, TENANT, 'u-9', 'teacher')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('will not touch a platform super-admin', async () => {
      asTenantAdmin(member({ user: { id: 'u-2', email: 'a@x.test', role: UserRole.SUPER_ADMIN } }));
      await expect(service.setStatus(admin, TENANT, 'u-2', 'SUSPENDED')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.userTenantMembership.update).not.toHaveBeenCalled();
    });

    it('suspends the membership, not the account, and writes an audit entry', async () => {
      asTenantAdmin(member());
      prisma.userTenantMembership.update.mockResolvedValue({ status: MembershipStatus.SUSPENDED });
      const result = await service.setStatus(admin, TENANT, 'u-2', 'suspended');
      expect(prisma.userTenantMembership.update).toHaveBeenCalledWith({
        where: { userId_tenantId: { userId: 'u-2', tenantId: TENANT } },
        data: { status: MembershipStatus.SUSPENDED },
      });
      expect(result.status).toBe(MembershipStatus.SUSPENDED);
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
        action: 'tenant_user_status_changed',
        tenantId: TENANT,
        userId: admin.id,
        entityId: 'u-2',
      });
    });

    it('rejects PENDING as a target status', async () => {
      await expect(service.setStatus(admin, TENANT, 'u-2', 'PENDING')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an invalid role before looking anything up', async () => {
      await expect(service.setRole(admin, TENANT, 'u-2', 'owner')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.userTenantMembership.findUnique).not.toHaveBeenCalled();
    });

    it('removes only the membership', async () => {
      asTenantAdmin(member());
      await service.remove(admin, TENANT, 'u-2');
      expect(prisma.userTenantMembership.delete).toHaveBeenCalledWith({
        where: { userId_tenantId: { userId: 'u-2', tenantId: TENANT } },
      });
    });
  });
});
