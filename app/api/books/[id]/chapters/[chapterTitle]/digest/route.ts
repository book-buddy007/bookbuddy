import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

// Idempotent/cached at the service layer (digest.service.ts) — safe to call
// on every "Recap" open without a separate status round-trip first.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chapterTitle: string }> }
) {
  try {
    const { id, chapterTitle } = await params;
    const token = readSessionToken(request.cookies) || '';

    const response = await fetch(
      `${BACKEND_URL}/books/${id}/chapters/${encodeURIComponent(chapterTitle)}/digest`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    );

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy Error (chapters/digest):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
