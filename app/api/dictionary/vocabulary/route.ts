import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = readSessionToken(cookieStore);

        if (!sessionToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const bookId = searchParams.get('bookId');

        let url = `${BACKEND_URL}/dictionary/vocabulary`;
        if (bookId) {
            url += `?bookId=${bookId}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Failed to fetch vocabulary' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.warn('Vocabulary fetch proxy error:', error?.message);
        return NextResponse.json(
            { error: 'Vocabulary temporarily unavailable' },
            { status: 503 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = readSessionToken(cookieStore);

        if (!sessionToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/dictionary/vocabulary`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Failed to save vocabulary' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Vocabulary save proxy error:', error?.message);
        return NextResponse.json(
            { error: 'Failed to save vocabulary' },
            { status: 500 }
        );
    }
}
