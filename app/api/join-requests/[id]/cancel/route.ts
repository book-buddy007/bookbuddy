import { proxyToBackend } from '../../_lib/proxy';

/**
 * DELETE /api/join-requests/:id/cancel — withdraw one's own pending request.
 *
 * Ownership is enforced by the backend against the session, so the `userId`
 * query parameter this route used to require is gone.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(`/join-requests/${id}`, { method: 'DELETE' });
}
