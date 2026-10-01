import { SetMetadata } from '@nestjs/common';
import type { Action, Resource } from './permissions';

export const PERMISSION_KEY = 'permission';

export interface RequiredPermission {
  resource: Resource;
  action: Action;
}

/**
 * Declares the tenant-scoped permission a route needs.
 *
 * Use with `TenantContextGuard` and `PermissionsGuard`:
 *
 *   @UseGuards(BetterAuthGuard, TenantContextGuard, PermissionsGuard)
 *   @RequirePermission('joinRequest', 'approve')
 */
export const RequirePermission = (resource: Resource, action: Action) =>
  SetMetadata(PERMISSION_KEY, { resource, action } satisfies RequiredPermission);
