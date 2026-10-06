import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * GET /api/shared-library/works?q=<title words>&limit=<n> — the public works already embedded in the
 * shared library, for the catalogue's "Link to shared library" screen.
 *
 * A dedicated route for the same reason as `/api/books/:id/embed`: the `/api/admin/*` catch-all
 * rewrites to `${BACKEND}/api/super-admin/*`, and this controller is mounted at `api/shared-library`.
 *
 * The backend's status and message ARE the user-facing explanation ("not set up", "rejected the
 * service secret", "could not reach DigiClassroom"), so they are forwarded verbatim. Only the session
 * cookie travels; the shared service secret never leaves the backend.
 */
export async function GET(request: NextRequest) {
  try {
    const token = readSessionToken(request.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const BACKEND_URL =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3333';

    // Only the two parameters the backend understands are forwarded.
    const incoming = request.nextUrl.searchParams;
    const params = new URLSearchParams();
    const q = incoming.get('q');
    const limit = incoming.get('limit');
    if (q) params.set('q', q.slice(0, 120));
    if (limit) params.set('limit', limit);

    const response = await fetch(`${BACKEND_URL}/api/shared-library/works?${params}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('Proxy Error (shared-library/works):', error?.message);
    return NextResponse.json({ error: 'Could not reach the library service.' }, { status: 502 });
  }
}
