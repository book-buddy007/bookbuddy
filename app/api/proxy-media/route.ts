import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

// ── Media proxy for pdf.js range requests ────────────────────────────────────
// SECURITY: this route fetches a URL on the server's behalf, so without controls
// it is an SSRF pivot into the Coolify docker network (Postgres, Qdrant, MinIO,
// the Coolify API — all on private IPs / single-label container hostnames) and a
// public open proxy. Defences below, in order of importance:
//   1. Require an authenticated session (blocks anonymous open-proxy abuse).
//   2. Block private/loopback/link-local IPs and non-public hostnames (kills the
//      SSRF-into-the-network primitive even if the allowlist is misconfigured).
//   3. Enforce a host allowlist derived from the configured media origins.
//   4. Refuse redirects (an allowlisted host must not 3xx us onto an internal URL).

const ALLOW_HEADERS = 'Range, Content-Type';

function corsHeaders(): Record<string, string> {
  // Same-origin fetch from our own reader; expose only what pdf.js needs.
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': ALLOW_HEADERS,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { ...corsHeaders(), 'Access-Control-Max-Age': '86400' },
  });
}

export const dynamic = 'force-dynamic';

/** Comma-separated hostnames the proxy is allowed to reach. */
function allowedHosts(): Set<string> {
  const hosts = new Set<string>();
  const sources = [
    process.env.MEDIA_PROXY_ALLOWED_HOSTS,
    process.env.CDN_BASE_URL,
    process.env.NEXT_PUBLIC_CDN_BASE_URL,
    process.env.S3_ENDPOINT,
  ].filter(Boolean) as string[];

  for (const src of sources) {
    for (const part of src.split(',')) {
      const v = part.trim();
      if (!v) continue;
      try {
        // Accept either a bare host or a full URL.
        hosts.add(new URL(v.includes('://') ? v : `https://${v}`).hostname.toLowerCase());
      } catch {
        /* ignore malformed entries */
      }
    }
  }
  return hosts;
}

/** True for IPs/hostnames that must never be reachable through the proxy. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');

  // Obvious internal names (docker service names are single-label, e.g. "qdrant").
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.internal') || h.endsWith('.local')) return true;
  if (!h.includes('.')) return true; // single-label host → not a public FQDN

  // IPv4 literal in a private / loopback / link-local / CGNAT range.
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    return false;
  }

  // IPv6 loopback / ULA / link-local.
  if (h === '::1' || h === '[::1]') return true;
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  if (h.startsWith('[fc') || h.startsWith('[fd') || h.startsWith('[fe80')) return true;

  return false;
}

export async function GET(request: NextRequest) {
  // 1. Authentication — audit finding BB-011.
  //
  // This previously called a local `hasSession()` that only tested whether a
  // cookie NAMED `better-auth.session_token` existed and was non-empty. It never
  // validated the token, so `Cookie: better-auth.session_token=x` satisfied it.
  // Resolve the session properly and get a real user id, which the entitlement
  // check below needs anyway.
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const urlParam = new URL(request.url).searchParams.get('url');
  if (!urlParam) {
    return new NextResponse('Missing URL parameter', { status: 400 });
  }

  let raw = urlParam;
  if (!/^https?:\/\//i.test(raw)) {
    try {
      raw = atob(urlParam);
    } catch {
      return new NextResponse('Invalid URL parameter', { status: 400 });
    }
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new NextResponse('Invalid URL parameter', { status: 400 });
  }

  // 2. Protocol + host safety.
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return new NextResponse('Unsupported protocol', { status: 400 });
  }
  if (isBlockedHost(target.hostname)) {
    return new NextResponse('Forbidden target', { status: 403 });
  }

  // 3. Host allowlist (enforced when configured — always is in prod).
  const allow = allowedHosts();
  if (allow.size > 0 && !allow.has(target.hostname.toLowerCase())) {
    return new NextResponse('Forbidden target', { status: 403 });
  }

  // NOTE (audit BB-011): a per-book entitlement check was attempted here but
  // REMOVED before deploy because it broke the reader. The reader proxies the
  // PRESIGNED url returned by `getReadUrl` (signed, 5-min, with X-Amz-* query
  // params); resolving the book by exact `BookFormat.fileUrl` match against a
  // presigned url never matches, so every institutional read failed closed (403).
  //
  // Content is already gated upstream: `books.service.getReadUrl` calls
  // `BookAccessService.assertCanRead` (tenant + soft-delete + tier) BEFORE it
  // presigns, and the R2 bucket is private (no anonymous read), so a working url
  // cannot be obtained without passing that check. Re-adding an entitlement check
  // HERE must match by object KEY (pathname), not full url, and be verified against
  // a live reader first (Zone A). Tracked in audit/FINDINGS.md BB-011.

  try {
    const headers: Record<string, string> = { Accept: '*/*' };
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) headers['Range'] = rangeHeader;

    // 4. Never follow redirects — an allowlisted host must not bounce us internal.
    const response = await fetch(target.toString(), {
      method: 'GET',
      headers,
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      return new NextResponse('Upstream redirect refused', { status: 502 });
    }
    if (!response.ok && response.status !== 206) {
      console.error(`Media proxy upstream error: ${response.status}`);
      return new NextResponse(`Upstream error: ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = target.pathname.toLowerCase().endsWith('.epub')
      ? 'application/epub+zip'
      : 'application/pdf';

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=86400',
      'Content-Disposition': 'inline; filename="book-document.pdf"',
      ...corsHeaders(),
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Accept-Ranges': 'bytes',
    };

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    const contentRange = response.headers.get('Content-Range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new NextResponse(response.body, {
      status: response.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Media proxy error:', error);
    return new NextResponse('Failed to proxy media', { status: 502 });
  }
}
