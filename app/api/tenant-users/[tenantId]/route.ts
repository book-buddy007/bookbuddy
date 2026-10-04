import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/join-requests/_lib/proxy';

/**
 * GET /api/tenant-users/:tenantId: the members of one institution, for that
 * institution's admins. The backend checks the caller's membership.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;

  // Forward only the filters the backend understands.
  const forwarded = new URLSearchParams();
  for (const key of ['page', 'limit', 'search', 'role', 'status']) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) forwarded.set(key, value);
  }
  const query = forwarded.size ? `?${forwarded.toString()}` : '';

  return proxyToBackend(`/tenant-users/${encodeURIComponent(tenantId)}${query}`, {
    method: 'GET',
  });
}
