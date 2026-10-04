import { NextRequest, NextResponse } from 'next/server';
import { getSessionToken } from '@/app/api/join-requests/_lib/proxy';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3333';

/**
 * GET /api/tenant-admin/:tenantId/reports/:type: a CSV download. Unlike the other tenant-admin
 * routes the body is a file, so it is streamed through as text rather than parsed as JSON.
 * Errors come back as JSON from the backend and are passed on unchanged.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; type: string }> },
) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tenantId, type } = await params;
  const forwarded = new URLSearchParams();
  for (const key of ['from', 'to']) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) forwarded.set(key, value);
  }
  const query = forwarded.size ? `?${forwarded.toString()}` : '';

  try {
    const response = await fetch(
      `${BACKEND_URL}/tenant-admin/${encodeURIComponent(tenantId)}/reports/${encodeURIComponent(type)}${query}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );
    const body = await response.text();

    const headers = new Headers({
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    });
    const disposition = response.headers.get('content-disposition');
    if (disposition) headers.set('Content-Disposition', disposition);

    return new NextResponse(body, { status: response.status, headers });
  } catch (error) {
    console.error('Report proxy error:', error);
    return NextResponse.json({ error: 'Could not reach the library service' }, { status: 502 });
  }
}
