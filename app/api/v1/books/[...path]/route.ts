import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const resolvedParams = await params;
        const pathString = resolvedParams.path.join('/');
        const sessionToken = readSessionToken(request.cookies);
        const searchParams = request.nextUrl.searchParams.toString();
        const queryString = searchParams ? `?${searchParams}` : '';
        const targetUrl = `${BACKEND_URL.replace('localhost', '127.0.0.1')}/books/${pathString}${queryString}`;

        const requestHeaders = new Headers(request.headers);
        if (sessionToken) {
            requestHeaders.set('Authorization', `Bearer ${sessionToken}`);
        }
        requestHeaders.delete('host');

        const options: RequestInit = {
            method: request.method,
            headers: requestHeaders,
            cache: 'no-store',
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                options.body = await request.text();
            } catch (e) {}
        }

        const response = await fetch(targetUrl, options);
        const data = await response.text();

        // fetch() already decompressed the body; drop stale gzip/length headers.
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');

        return new NextResponse(data, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error: any) {
        console.error('API Proxy error (/api/v1/books/[...path]):', error?.message);
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
