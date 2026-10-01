import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../_lib/proxy';

/**
 * PUT /api/join-requests/:id/approve — grant the membership.
 *
 * The reviewer is taken from the session, so `reviewerId` in the body is
 * ignored: an administrator cannot be recorded as approving something they
 * did not.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  return proxyToBackend(`/join-requests/${id}/approve`, {
    method: 'PUT',
    body: { role: body?.role },
  });
}
