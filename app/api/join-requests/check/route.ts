import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '../_lib/proxy';

/**
 * GET /api/join-requests/check?tenantId=… — whether the signed-in user has
 * already applied to (or joined) this institution.
 *
 * A `userId` parameter is no longer accepted; the session decides whose status
 * is returned.
 */
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  return proxyToBackend(`/join-requests/check/${tenantId}`, { method: 'GET' });
}
