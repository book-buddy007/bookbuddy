import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/app/api/join-requests/_lib/proxy';

export const dynamic = 'force-dynamic';

/**
 * Proxy for an institution's admin endpoints. Only the listed method + path pairs are
 * forwarded, so this can't be used to reach anything else on the backend. The backend checks
 * that the caller administers the institution named in the path.
 */
const ALLOWED: Record<string, string[]> = {
  GET: ['overview', 'overdue', 'analytics', 'policies'],
  POST: ['overdue/remind'],
  PUT: ['policies'],
};

async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; action: string[] }> },
) {
  const { tenantId, action } = await params;
  const path = action.join('/');

  if (!ALLOWED[request.method]?.includes(path)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const base = `/tenant-admin/${encodeURIComponent(tenantId)}/${path}`;
  const range = request.nextUrl.searchParams.get('range');
  const query = path === 'analytics' && range ? `?range=${encodeURIComponent(range)}` : '';

  if (request.method === 'GET') {
    return proxyToBackend(`${base}${query}`, { method: 'GET' });
  }

  const body = await request.json().catch(() => ({}));
  return proxyToBackend(base, { method: request.method, body });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
