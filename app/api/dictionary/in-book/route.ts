import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

/**
 * GET /api/dictionary/in-book?word=…&bookId=… — what the book itself says about a term: the sentence that
 * defines it (or where it is used) and its page. Kept apart from `/api/dictionary/lookup` so the reader
 * sees it as soon as it is ready, whatever the outside dictionaries are doing.
 *
 * The backend decides whether this reader may read the book; its status codes are forwarded as they are.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = readSessionToken(cookieStore);
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const word = searchParams.get('word');
    const bookId = searchParams.get('bookId');
    if (!word || !bookId) {
      return NextResponse.json({ found: false });
    }

    const response = await fetch(
      `${BACKEND_URL}/dictionary/in-book?bookId=${encodeURIComponent(bookId)}&term=${encodeURIComponent(word)}`,
      {
        headers: { Authorization: `Bearer ${sessionToken}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.message || 'Could not look in the book' }, { status: response.status });
    }
    return NextResponse.json(await response.json());
  } catch (error: any) {
    console.warn('In-book lookup proxy error:', error?.message);
    return NextResponse.json({ found: false });
  }
}
