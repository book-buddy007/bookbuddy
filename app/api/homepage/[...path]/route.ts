import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    try {
        const sessionToken = readSessionToken(request.cookies);

        // We allow passing through even without token if the backend handles public routes,
        if (!sessionToken) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const resolvedParams = await params;
        const pathString = resolvedParams.path.join('/');
        const searchParams = request.nextUrl.searchParams.toString();
        const queryString = searchParams ? `?${searchParams}` : '';

        const targetUrl = `${BACKEND_URL}/api/homepage/${pathString}${queryString}`;

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('Authorization', `Bearer ${sessionToken}`);
        requestHeaders.delete('host');

        const options: RequestInit = {
            method: request.method,
            headers: requestHeaders,
        };

        if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
            // RequestInit.body accepts a ReadableStream at runtime; the DOM typings disagree.
            (options as RequestInit & { body: unknown }).body = request.body;
            // `duplex` is required by Node's fetch for streamed bodies but missing from RequestInit's type.
            (options as RequestInit & { duplex?: 'half' }).duplex = 'half';
        }

        const response = await fetch(targetUrl, options);
        const data = await response.text();

        const responseHeaders = new Headers(response.headers);
        // fetch() already decompressed the body; drop the stale gzip/length
        // headers so the browser doesn't try to gunzip plain text
        // (ERR_CONTENT_DECODING_FAILED behind Traefik/Coolify).
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');

        return new NextResponse(data, {
            status: response.status,
            headers: responseHeaders,
        });

    } catch (error: any) {
        console.error('API Proxy error:', error);
        return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
