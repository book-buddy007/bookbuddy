import { NextRequest, NextResponse } from 'next/server';
import { readSessionToken } from '@/lib/auth-cookies';

// Force dynamic rendering — prevents Next.js from caching this route handler
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function proxyToBackend(request: NextRequest, resolvedParams: { path: string[] }, retries = 0): Promise<NextResponse> {
    try {
        const sessionToken = readSessionToken(request.cookies);

        if (!sessionToken) {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const pathString = resolvedParams.path.join('/');
        const searchParams = request.nextUrl.searchParams.toString();
        const queryString = searchParams ? `?${searchParams}` : '';

        const targetUrl = `${BACKEND_URL}/api/super-admin/${pathString}${queryString}`;

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('Authorization', `Bearer ${sessionToken}`);
        requestHeaders.delete('host');

        const options: RequestInit = {
            method: request.method,
            headers: requestHeaders,
            cache: 'no-store',
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                // To allow retries, we can't read request.text() multiple times unless we clone the request.
                // However, since we expect connection issues primarily during startup (GET stats), 
                // we'll clone if we are reading it.
                options.body = await request.clone().text();
            } catch (e) {
                // Body reading failed
            }
        }

        const response = await fetch(targetUrl, options);
        const data = await response.text();

        // DEBUG: Log proxy responses for catalog routes
        if (pathString.includes('catalog')) {
            console.log(`[PROXY DEBUG] ${request.method} ${targetUrl} => ${response.status} (${data.length} bytes)`);
            if (data.length < 2000) console.log(`[PROXY DEBUG] Body: ${data}`);
        }

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
        const isConnRefused = error?.cause?.code === 'ECONNREFUSED' || error?.code === 'ECONNREFUSED';

        if (isConnRefused && retries < MAX_RETRIES) {
            console.warn(`[API Proxy] Backend not ready (attempt ${retries + 1}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            return proxyToBackend(request, resolvedParams, retries + 1);
        }

        console.error(`[API Proxy] Backend unreachable after ${MAX_RETRIES} attempts:`, error?.message);
        
        return NextResponse.json(
            {
                error: 'Service Unavailable',
                message: 'Backend is starting up. Please wait a moment and refresh.',
                code: 'BACKEND_STARTING',
            },
            { status: 503 } // 503 is more accurate than 502 for "starting up"
        );
    }
}

async function handleProxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const resolvedParams = await params;
    return proxyToBackend(request, resolvedParams, 0);
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
export const PATCH = handleProxy;

