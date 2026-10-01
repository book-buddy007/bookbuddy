import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = readSessionToken(cookieStore);

        if (!accessToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const bookId = searchParams.get('bookId');

        if (!bookId) {
            return NextResponse.json({ error: 'bookId is required' }, { status: 400 });
        }

        const response = await fetch(`${BACKEND_URL}/annotations/book/${bookId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Failed to fetch annotations' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.warn('Annotations fetch proxy error:', error?.message);
        return NextResponse.json(
            { error: 'Annotations temporarily unavailable' },
            { status: 503 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const accessToken = readSessionToken(cookieStore);

        if (!accessToken) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/annotations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Failed to save annotation' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.warn('Annotation save proxy error:', error?.message);
        return NextResponse.json(
            { error: 'Annotation saving temporarily unavailable' },
            { status: 503 }
        );
    }
}

