import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        // Check for better-auth cookie or default to whatever is available
        const sessionToken = readSessionToken(cookieStore);

        if (!sessionToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const word = searchParams.get('word');

        if (!word) {
            return NextResponse.json({ error: 'Word is required' }, { status: 400 });
        }

        const url = `${BACKEND_URL}/dictionary/lookup?word=${encodeURIComponent(word)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Failed to lookup word' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.warn('Dictionary lookup proxy error:', error?.message);
        return NextResponse.json(
            { error: 'Dictionary lookup temporarily unavailable' },
            { status: 503 }
        );
    }
}
