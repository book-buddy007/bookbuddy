import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

/**
 * Active proxy route handler that replaces the passive rewrite in next.config.mjs.
 * Explicitly forwards cookies, authorization, and tenant headers to the backend.
 * This ensures authenticated requests (Better Auth session cookies) reach the
 * backend correctly — passive rewrites can silently drop headers in some environments.
 */
async function handler(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/proxy', '');
  const url = `${BACKEND_URL}${path}${req.nextUrl.search}`;

  const forwardHeaders: Record<string, string> = {
    'content-type': req.headers.get('content-type') ?? 'application/json',
  };

  // Forward auth-critical headers
  const cookie = req.headers.get('cookie');
  if (cookie) forwardHeaders['cookie'] = cookie;

  const authorization = req.headers.get('authorization');
  if (authorization) forwardHeaders['authorization'] = authorization;

  // Forward tenant context header (set by apiClient interceptor)
  const tenantId = req.headers.get('x-active-tenant-id');
  if (tenantId) forwardHeaders['x-active-tenant-id'] = tenantId;

  try {
    const fetchOptions: RequestInit & { duplex?: string } = {
      method: req.method,
      headers: forwardHeaders,
      // Required for streaming body passthrough in Node.js
      duplex: 'half',
    };

    // Only attach body for methods that support it
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req.body;
    }

    const backendRes = await fetch(url, fetchOptions);

    // Build the response, forwarding status and content-type
    const responseHeaders = new Headers();
    const contentType = backendRes.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    // Forward Set-Cookie headers back to the browser (session refresh, etc.)
    // Use getSetCookie() to handle multiple Set-Cookie headers correctly
    const setCookies = (backendRes.headers as any).getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      responseHeaders.append('set-cookie', cookie);
    }

    // Fallback for environments where getSetCookie() isn't available
    if (setCookies.length === 0) {
      const singleSetCookie = backendRes.headers.get('set-cookie');
      if (singleSetCookie) responseHeaders.set('set-cookie', singleSetCookie);
    }

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[proxy] ${req.method} ${path} → backend error:`, error?.message);
    return NextResponse.json(
      { message: 'Backend service unavailable', error: error?.message },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
