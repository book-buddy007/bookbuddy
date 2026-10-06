import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * POST /api/books/:id/link-shared-work  { contentItemId } — queue a book to use a work that is
 * already embedded in the shared library, instead of embedding it again.
 *
 * Dedicated route, like `embed`: the `/api/admin/*` catch-all cannot reach `api/books`.
 *
 * The backend's status codes are the message — 400 for a malformed id, 404 for a missing book,
 * 409 for a link already running or no shared library configured, and DigiClassroom's own refusals
 * (ISBN mismatch, not public) are reported by the job, not here. Forwarded verbatim.
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
    // Forward only the one field the backend reads; nothing else from the browser goes through.
    const contentItemId =
      body && typeof body === 'object' ? (body as { contentItemId?: unknown }).contentItemId : undefined;
    if (typeof contentItemId !== 'string') {
      return NextResponse.json({ error: 'contentItemId is required.' }, { status: 400 });
    }

    const BACKEND_URL =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3333';

    const response = await fetch(
      `${BACKEND_URL}/api/books/${encodeURIComponent(id)}/link-shared-work`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentItemId }),
        cache: 'no-store',
      },
    );

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy Error (link-shared-work):', error?.message);
    return NextResponse.json({ error: 'Could not reach the ingestion service.' }, { status: 502 });
  }
}
