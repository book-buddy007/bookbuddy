import { proxyToBackend } from '@/app/api/join-requests/_lib/proxy';

export const dynamic = 'force-dynamic';

/** GET /api/user/memberships: the signed-in user's institution memberships. */
export async function GET() {
  return proxyToBackend('/user/memberships', { method: 'GET' });
}
