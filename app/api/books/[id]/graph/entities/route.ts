import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = readSessionToken(request.cookies) || '';
    const type = request.nextUrl.searchParams.get('type');
    const chapter = request.nextUrl.searchParams.get('chapter');
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (chapter) qs.set('chapter', chapter);
    const query = qs.toString() ? `?${qs.toString()}` : '';

    const response = await fetch(`${BACKEND_URL}/books/${id}/graph/entities${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy Error (graph/entities):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
