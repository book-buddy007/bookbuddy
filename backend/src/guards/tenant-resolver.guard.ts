import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  readTenantHeader,
  resolveTenantContext,
  setTenantContext,
} from '../common/tenant-context';

/**
 * Establishes the tenant context for a request and never refuses it.
 *
 * Sits alongside `TenantContextGuard`, which is the strict variant: that one
 * throws when a route is marked `@RequireTenant()` and no usable tenant is
 * supplied. This one resolves what it can and lets the request through, which
 * is what the reading endpoints need — an independent reader has no
 * institution, and their data is scoped by `userId` alone.
 *
 * Must be listed *after* the authentication guard, since it resolves against
 * `req.user`. Registering it globally would run it before authentication, when
 * there is no user to resolve for.
 */
@Injectable()
export class TenantResolverGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      setTenantContext(request, { tenantId: null, tenantRole: null });
      return true;
    }

    const requested = readTenantHeader(request.headers ?? {});
    const resolved = await resolveTenantContext(
      this.prisma,
      user.id,
      requested,
    );

    setTenantContext(request, resolved);
    return true;
  }
}
