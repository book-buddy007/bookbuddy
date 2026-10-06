import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * POST /api/shared-library/create-book  { contentItemId, author, title?, language? } — create a
 * catalogue book from a work that is already embedded in the shared library, and link it.
 *
 * A dedicated route for the same reason as the other shared-library routes: the `/api/admin/*`
 * catch-all rewrites to `${BACKEND}/api/super-admin/*`, and this controller is mounted at
 * `api/shared-library`.
 *
 * Only the four fields the backend reads are forwarded; nothing else from the browser goes through.
 * The backend's status and message are forwarded as they are (author missing, work not public, work
 * already used by another book, library not set up), because they are what the admin needs to read.
 */
export async function POST(request: NextRequest) {
  try {
    const token = readSessionToken(request.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
    }
    const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const forwarded = {
      contentItemId: input.contentItemId,
      author: input.author,
      title: input.title,
      language: input.language,
    };

    const BACKEND_URL =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3333';

    const response = await fetch(`${BACKEND_URL}/api/shared-library/create-book`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(forwarded),
      cache: 'no-store',
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy Error (shared-library/create-book):', error?.message);
    return NextResponse.json({ error: 'Could not reach the library service.' }, { status: 502 });
  }
}
