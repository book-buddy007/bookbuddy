import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

/**
 * Maps the reader's page numbers onto the book's printed ones. Resolves only
 * when the PDF page count the client reports matches the ingested printed
 * span — see the backend method for why a guessed offset is worse than none.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = readSessionToken(request.cookies) || '';
    const pdfPages = request.nextUrl.searchParams.get('pdfPages') ?? '';

    const response = await fetch(
      `${BACKEND_URL}/books/${id}/page-map?pdfPages=${encodeURIComponent(pdfPages)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Proxy Error (page-map):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
