import { SetMetadata } from '@nestjs/common';

/**
 * RequireTenant Decorator
 *
 * Marks a route as requiring tenant context.
 * Must be used in conjunction with TenantContextGuard.
 *
 * When applied to a route, the guard will enforce that:
 * 1. A tenant ID is provided in the 'x-tenant-id' header
 * 2. The user has an active membership in that tenant
 * 3. The tenant is active
 *
 * Usage:
 * @UseGuards(BetterAuthGuard, TenantContextGuard)
 * @RequireTenant()
 * @Get('books')
 * async getBooks(@Request() req) {
 *   // req.tenant is guaranteed to be available
 *   // req.tenantRole contains the user's role in this tenant
 *   return this.service.getBooks(req.tenant.id);
 * }
 *
 * Note: Super-admins bypass this requirement
 */
export const REQUIRE_TENANT_KEY = 'requireTenant';
export const RequireTenant = () => SetMetadata(REQUIRE_TENANT_KEY, true);
