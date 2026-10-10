import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * POST /api/books/:id/refresh-from-library — bring a hub-linked book up to date with PDLMS: its PDF/EPUB
 * markers, audio, and cover (a cover copied from the library is replaced; one that was uploaded is not).
 *
 * Dedicated route, like `link-shared-work` and `unlink-shared-work`: the `/api/admin/*` catch-all cannot
 * reach `api/books`. No body is passed on. The backend's status codes are the message (404 missing book,
 * 409 not linked to the hub, busy, or the library is not PDLMS's hub, 502 hub unreachable) and are
 * forwarded verbatim.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = readSessionToken(request.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const BACKEND_URL =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3333';

    const response = await fetch(
      `${BACKEND_URL}/api/books/${encodeURIComponent(id)}/refresh-from-library`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy Error (refresh-from-library):', error?.message);
    return NextResponse.json({ error: 'Could not reach the library service.' }, { status: 502 });
  }
}
