import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3333';

/**
 * Shared proxy for the join-requests API.
 *
 * The backend derives the acting user from the session, so every call must
 * carry the Better Auth token. These routes used to forward no credentials at
 * all and passed `userId` as a query parameter instead, which meant any caller
 * could read or file requests as another user.
 *
 * Folders prefixed with `_` are not routed by Next.js, so this file sits beside
 * the routes it serves without becoming an endpoint itself.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return (
    readSessionToken(cookieStore) ||
    null
  );
}

export async function proxyToBackend(
  path: string,
  init: { method: string; body?: unknown } = { method: 'GET' },
): Promise<NextResponse> {
  const token = await getSessionToken();

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Join requests proxy error (${init.method} ${path}):`, error);
    return NextResponse.json(
      { error: 'Could not reach the library service' },
      { status: 502 },
    );
  }
}
