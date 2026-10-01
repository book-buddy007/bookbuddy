import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

export async function GET(request: NextRequest) {
    try {
        // FIX: [Bug #3 - Forward Authorization and Cookie headers from client request to NestJS backend]
        const token = request.headers.get('authorization');
        const cookie = request.headers.get('cookie');

        if (!token && !cookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = token;
        if (cookie) headers['Cookie'] = cookie;

        const response = await fetch(`${BACKEND_URL}/progress/streak`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Failed to fetch streak' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.warn('Streak fetch proxy error:', error?.message);
        return NextResponse.json(
            { error: 'Streak fetch temporarily unavailable' },
            { status: 503 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // FIX: [Bug #3 - Forward Authorization and Cookie headers from client request to NestJS backend]
        const token = request.headers.get('authorization');
        const cookie = request.headers.get('cookie');

        if (!token && !cookie) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) headers['Authorization'] = token;
        if (cookie) headers['Cookie'] = cookie;

        const response = await fetch(`${BACKEND_URL}/progress/streak`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: errorData.message || 'Failed to update streak' },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.warn('Streak update proxy error:', error?.message);
        return NextResponse.json(
            { error: 'Streak update temporarily unavailable' },
            { status: 503 }
        );
    }
}
