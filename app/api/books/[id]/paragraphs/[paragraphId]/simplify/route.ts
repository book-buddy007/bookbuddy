import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paragraphId: string }> }
) {
  try {
    const { id, paragraphId } = await params;
    const token = readSessionToken(request.cookies) || '';
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/books/${id}/paragraphs/${paragraphId}/simplify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy Error (paragraphs/simplify):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
