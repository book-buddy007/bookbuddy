import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../_lib/proxy';

/**
 * GET /api/join-requests/tenant/:tenantId — the review queue for an
 * institution. The backend rejects callers who are not an active admin or
 * librarian of that institution.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const status = request.nextUrl.searchParams.get('status');
  const query = status ? `?status=${encodeURIComponent(status)}` : '';

  return proxyToBackend(`/join-requests/tenant/${tenantId}${query}`, {
    method: 'GET',
  });
}
