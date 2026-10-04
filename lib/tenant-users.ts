/**
 * Client for an institution's member list (`/api/tenant-users/...`), the data behind
 * the admin Users page and the dashboard's user count. Calls go through the Next proxy,
 * which attaches the session; the backend decides whether the caller may manage the tenant.
 */

export type TenantRole = 'ADMIN' | 'LIBRARIAN' | 'TEACHER' | 'STUDENT';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';

export const TENANT_ROLES: TenantRole[] = ['ADMIN', 'LIBRARIAN', 'TEACHER', 'STUDENT'];

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  status: MembershipStatus;
  /** Platform-level account state; a disabled account cannot sign in whatever the membership says. */
  accountActive: boolean;
  isPlatformSuperAdmin: boolean;
  lastLoginAt: string | null;
  joinedAt: string;
  image: string | null;
}

export interface TenantUserSummary {
  total: number;
  active: number;
  suspended: number;
  pending: number;
}

export interface TenantUserList {
  data: TenantUser[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  summary: TenantUserSummary;
}

export interface TenantUserQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: TenantRole | 'all';
  status?: MembershipStatus | 'all';
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || body?.error || `Request failed (${res.status})`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return body as T;
}

const base = (tenantId: string) => `/api/tenant-users/${encodeURIComponent(tenantId)}`;

export function fetchTenantUsers(
  tenantId: string,
  query: TenantUserQuery = {},
  signal?: AbortSignal,
): Promise<TenantUserList> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search?.trim()) params.set('search', query.search.trim());
  if (query.role && query.role !== 'all') params.set('role', query.role);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  const qs = params.toString();
  return request<TenantUserList>(`${base(tenantId)}${qs ? `?${qs}` : ''}`, { signal });
}

const put = (url: string, body: unknown) =>
  request<{ id: string; role: TenantRole; status: MembershipStatus }>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const setTenantUserStatus = (
  tenantId: string,
  userId: string,
  status: 'ACTIVE' | 'SUSPENDED',
) => put(`${base(tenantId)}/${encodeURIComponent(userId)}/status`, { status });

export const setTenantUserRole = (tenantId: string, userId: string, role: TenantRole) =>
  put(`${base(tenantId)}/${encodeURIComponent(userId)}/role`, { role });

export const removeTenantUser = (tenantId: string, userId: string) =>
  request<{ success: boolean }>(`${base(tenantId)}/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
