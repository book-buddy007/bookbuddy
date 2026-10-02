import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  type RequiredPermission,
} from './require-permission.decorator';
import { can } from './permissions';
import { getTenantContext } from '../common/tenant-context';

/**
 * Enforces the tenant permission matrix on routes marked with
 * `@RequirePermission(...)`.
 *
 * Routes without the decorator pass through untouched, so this can be applied
 * broadly without having to annotate every endpoint at once.
 *
 * Must run after whichever guard establishes the tenant context; it reads the
 * resolved role rather than re-querying, so a route cannot be authorised
 * against a different tenant than the one it will operate on.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const { tenantRole } = getTenantContext(request);
    const platformRole = request.user?.role;

    if (!can(platformRole, tenantRole, required.resource, required.action)) {
      throw new ForbiddenException(
        `You do not have permission to ${required.action} ${required.resource} in this institution.`,
      );
    }

    return true;
  }
}
