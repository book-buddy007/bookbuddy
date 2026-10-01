import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { InvalidTenantContextException } from '../exceptions/auth.exceptions';
import { LoggerService } from '../logger/logger.service';

/**
 * TenantContextGuard - Verifies user has access to the requested tenant
 *
 * This guard ensures:
 * 1. User belongs to the tenant (via UserTenantMembership)
 * 2. User's membership status is 'active'
 * 3. Tenant is active (isActive = true)
 * 4. Attaches tenant context to request object
 *
 * Usage:
 * @UseGuards(BetterAuthGuard, TenantContextGuard)
 * @RequireTenant()
 *
 * The tenant ID is extracted from the 'x-tenant-id' header.
 * Super-admins bypass tenant verification.
 */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user is authenticated, let BetterAuthGuard handle it
    if (!user) {
      return true;
    }

    // Get tenant ID from header
    const tenantId = request.headers['x-tenant-id'] as string;

    // Check if route requires tenant context
    const requireTenant = this.reflector.get<boolean>(
      'requireTenant',
      context.getHandler(),
    );

    // If no tenant ID provided and tenant is not required, allow access
    if (!tenantId && !requireTenant) {
      return true;
    }

    // Super-admins can access any tenant (or no tenant)
    if (user.role === 'SUPER_ADMIN') {
      // If tenant ID is provided, still attach tenant context for super-admin
      if (tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });

        if (tenant) {
          request.tenant = tenant;
          request.tenantRole = 'super-admin';
        }
      }
      return true;
    }

    // For non-super-admins, tenant ID is required if route requires tenant
    if (!tenantId && requireTenant) {
      this.logger.warn(
        `Tenant context required but no tenant ID provided. User: ${user.id}`,
      );
      throw new InvalidTenantContextException({
        userId: user.id,
        reason: 'Tenant ID is required for this operation',
      });
    }

    // If tenant ID is provided, verify membership
    if (tenantId) {
      // Verify user belongs to tenant with active membership
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: {
          userId: user.id,
          tenantId: tenantId,
          status: 'ACTIVE', // Only active memberships
        },
        include: {
          tenant: true,
        },
      });

      if (!membership) {
        this.logger.warn(
          `User ${user.id} attempted to access tenant ${tenantId} without active membership`,
        );
        throw new InvalidTenantContextException({
          userId: user.id,
          tenantId,
          reason: 'You do not have an active membership in this tenant',
        });
      }

      // Verify tenant is active
      if (!membership.tenant.isActive) {
        this.logger.warn(
          `User ${user.id} attempted to access inactive tenant ${tenantId}`,
        );
        throw new InvalidTenantContextException({
          userId: user.id,
          tenantId,
          reason: 'This tenant is currently inactive',
        });
      }

      // Attach tenant context to request for use in controllers/services
      request.tenant = membership.tenant;
      request.tenantRole = membership.role;

      this.logger.log(
        `Tenant context verified: User ${user.id} accessing tenant ${tenantId} with role ${membership.role}`,
      );
    }

    return true;
  }
}
