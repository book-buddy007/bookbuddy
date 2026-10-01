import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * GET /api/books/:id/embedding-status — live progress for one book's ingestion.
 *
 * Same reason for existing as the sibling `embed` route: the `/api/admin/*`
 * catch-all rewrites everything to `${BACKEND}/api/super-admin/*`, and
 * EmbeddingController is mounted at `api/books`, so it cannot be reached that
 * way.
 *
 * This is polled every couple of seconds while a run is in flight, so it must
 * never be cached — `force-dynamic` plus `no-store` on both hops, otherwise the
 * dialog watches a frozen snapshot and the bar never moves.
 */
export async function GET(
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
      `${BACKEND_URL}/api/books/${id}/embedding-status`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    );

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Proxy Error (embedding-status):', error?.message);
    return NextResponse.json(
      { error: 'Could not reach the ingestion service.' },
      { status: 502 },
    );
  }
}
