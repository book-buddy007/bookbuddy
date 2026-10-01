import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true; // No roles restricted
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const activeTenantId = request.headers['x-active-tenant-id'] as string;

    if (!user) return false;

    // Super-admin bypass
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!activeTenantId) {
      throw new ForbiddenException(
        'Tenant context is missing (X-Active-Tenant-Id header requires)',
      );
    }

    // Check tenant specific role
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: {
        userId: user.id,
        tenantId: activeTenantId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You do not belong to this tenant or your access is not active',
      );
    }

    request['tenantMembership'] = membership;

    return requiredRoles.includes(membership.role);
  }
}
