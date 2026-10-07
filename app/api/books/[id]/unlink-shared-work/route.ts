import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * POST /api/books/:id/unlink-shared-work  { outcome: 'retire' | 'keep' } — take a book off the shared
 * library (PDLMS's hub): 'retire' unlinks and moves it to the Bin, 'keep' unlinks and keeps it here.
 *
 * Dedicated route, like `link-shared-work`: the `/api/admin/*` catch-all cannot reach `api/books`.
 * The backend's status codes are the message (400 bad outcome, 404 missing book, 409 not linked, busy,
 * or the library is not PDLMS's hub) and are forwarded verbatim. Only the outcome is passed on.
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 });
    }
    const outcome = body && typeof body === 'object' ? (body as { outcome?: unknown }).outcome : undefined;
    if (outcome !== 'retire' && outcome !== 'keep') {
      return NextResponse.json({ error: 'outcome must be "retire" or "keep".' }, { status: 400 });
    }

    const BACKEND_URL =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3333';

    const response = await fetch(
      `${BACKEND_URL}/api/books/${encodeURIComponent(id)}/unlink-shared-work`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
        cache: 'no-store',
      },
    );

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy Error (unlink-shared-work):', error?.message);
    return NextResponse.json({ error: 'Could not reach the library service.' }, { status: 502 });
  }
}
