import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function GET(request: NextRequest) {
  try {
    const token = readSessionToken(request.cookies) || '';
    const bookId = request.nextUrl.searchParams.get('bookId');
    const query = bookId ? `?bookId=${encodeURIComponent(bookId)}` : '';

    const response = await fetch(`${BACKEND_URL}/students/me/varta-activity${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy Error (varta-activity):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
