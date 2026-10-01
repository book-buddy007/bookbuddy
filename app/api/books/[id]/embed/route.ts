import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * POST /api/books/:id/embed — queue a book for ingestion into the shared spine.
 *
 * The sibling `/api/v1/books/[...path]` proxy cannot reach this: it rewrites to
 * `${BACKEND}/books/...` (BooksController), while EmbeddingController is mounted
 * at `api/books`. Hence a dedicated route, matching the chat/chat-history ones.
 *
 * The backend's status codes ARE the user-facing message here — 403 for the
 * licence gate, 404 for a missing markdown rendition, 409 for an in-flight job.
 * So this forwards the body and status verbatim rather than collapsing failures
 * into a generic error, which would hide exactly the thing the admin needs.
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

    const response = await fetch(`${BACKEND_URL}/api/books/${id}/embed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Proxy Error (embed):', error?.message);
    return NextResponse.json(
      { error: 'Could not reach the ingestion service.' },
      { status: 502 },
    );
  }
}
