import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '../_lib/proxy';

/**
 * POST /api/join-requests/create — file a request to join an institution.
 *
 * `userId` is no longer read from the body; the backend takes the requester
 * from the session. Clients that still send it are unaffected — it is ignored.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.tenantId) {
    return NextResponse.json(
      { error: 'Please choose an institution' },
      { status: 400 },
    );
  }

  return proxyToBackend('/join-requests', {
    method: 'POST',
    body: {
      tenantId: body.tenantId,
      requestedRole: body.requestedRole,
      message: body.message,
      proofDocument: body.proofDocument,
    },
  });
}
