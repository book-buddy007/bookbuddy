import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

/**
 * Fetch with automatic retry for transient errors (ECONNREFUSED, ECONNRESET, etc.)
 * This handles cases where the backend is restarting or temporarily unavailable.
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    delayMs = 800
): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fetch(url, options);
        } catch (error: any) {
            const isTransient = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT']
                .includes(error?.cause?.code || error?.code);

            if (isTransient && attempt < retries) {
                console.warn(
                    `[API Proxy /api/v1/books] Attempt ${attempt}/${retries} failed (${error?.cause?.code || error?.code}). Retrying in ${delayMs}ms...`
                );
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayMs *= 1.5; // exponential backoff
                continue;
            }
            throw error; // non-transient or exhausted retries
        }
    }
    // This should never be reached, but TypeScript needs it
    throw new Error('fetchWithRetry: unexpected state');
}

async function handleProxy(request: NextRequest) {
    try {
        const sessionToken = readSessionToken(request.cookies);
        const searchParams = request.nextUrl.searchParams.toString();
        const queryString = searchParams ? `?${searchParams}` : '';
        const targetUrl = `${BACKEND_URL}/books${queryString}`;

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

        const response = await fetchWithRetry(targetUrl, options);
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
        const code = error?.cause?.code || error?.code || 'UNKNOWN';
        console.error(`[API Proxy /api/v1/books] All retries failed: ${code} - ${error?.message}`);
        return new NextResponse(JSON.stringify({ 
            error: 'Backend Unavailable', 
            message: 'The server is temporarily unavailable. Please try again in a moment.',
            code,
        }), {
            status: 503, // 503 Service Unavailable (not 502) for proper retry semantics
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;
