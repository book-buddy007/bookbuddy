import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * GET /api/shared-library/status — whether a shared library is set up, whose it is (PDLMS or
 * DigiClassroom), and whether a book can be taken off it from here. The catalogue reads this to decide
 * which menu items to offer. Dedicated route for the same reason as `/api/shared-library/works`.
 */
export async function GET(request: NextRequest) {
  try {
    const token = readSessionToken(request.cookies);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const BACKEND_URL =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3333';

    const response = await fetch(`${BACKEND_URL}/api/shared-library/status`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('Proxy Error (shared-library/status):', error?.message);
    return NextResponse.json({ error: 'Could not reach the library service.' }, { status: 502 });
  }
}
