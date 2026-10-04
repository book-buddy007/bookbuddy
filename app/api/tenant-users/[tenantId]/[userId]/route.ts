import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/join-requests/_lib/proxy';

/** DELETE /api/tenant-users/:tenantId/:userId: remove a member from this institution only. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  const { tenantId, userId } = await params;
  return proxyToBackend(
    `/tenant-users/${encodeURIComponent(tenantId)}/${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
}
