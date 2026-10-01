import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../_lib/proxy';

/** PUT /api/join-requests/:id/reject — decline with an optional reason. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  return proxyToBackend(`/join-requests/${id}/reject`, {
    method: 'PUT',
    body: { rejectionReason: body?.rejectionReason },
  });
}
