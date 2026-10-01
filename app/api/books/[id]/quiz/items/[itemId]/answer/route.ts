import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

/**
 * Grade one answer. The verdict is computed backend-side because the answer
 * key must never reach the browser — shipping it with the question would make
 * the green/red instant and the quiz pointless for anyone who opens devtools.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const token = readSessionToken(request.cookies) || '';
    const body = await request.text();

    const response = await fetch(
      `${BACKEND_URL}/books/${id}/quiz/items/${encodeURIComponent(itemId)}/answer`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body,
        cache: 'no-store',
      },
    );

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy Error (quiz answer):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
