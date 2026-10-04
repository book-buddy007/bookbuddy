import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/app/api/join-requests/_lib/proxy';

/** PUT /api/tenant-users/:tenantId/:userId/status: suspend or reactivate a membership. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  const { tenantId, userId } = await params;
  const body = await request.json().catch(() => ({}));
  return proxyToBackend(
    `/tenant-users/${encodeURIComponent(tenantId)}/${encodeURIComponent(userId)}/status`,
    { method: 'PUT', body: { status: body?.status } },
  );
}
