import { proxyToBackend } from '../_lib/proxy';

/**
 * GET /api/join-requests/user — the signed-in user's own join requests.
 *
 * The `userId` query parameter this route used to require is ignored: identity
 * comes from the session, so one user can no longer read another's requests by
 * changing the URL.
 */
export async function GET() {
  return proxyToBackend('/join-requests/me', { method: 'GET' });
}
