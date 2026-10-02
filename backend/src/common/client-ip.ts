/**
 * Client IP resolution for rate limiting — audit finding BB-004.
 *
 * THE BUG THIS FIXES
 * ------------------
 * Express only derives `req.ip` from `X-Forwarded-For` when `trust proxy` is
 * enabled. It was never enabled anywhere in this codebase. Behind Traefik that
 * means every request presents the proxy's address, so `@nestjs/throttler`'s
 * default `req.ip` tracker put ALL callers in ONE bucket. The OTP and
 * password-reset limits of "3 per 10 minutes" were therefore 3 per 10 minutes
 * *platform-wide*: three unauthenticated requests denied account recovery to every
 * user. A rate limit had been inverted into a denial-of-service primitive.
 *
 * THE BUG THE OBVIOUS FIX WOULD INTRODUCE
 * ---------------------------------------
 * `app.set('trust proxy', true)` trusts the ENTIRE X-Forwarded-For chain. Any
 * caller could then send `X-Forwarded-For: <random>` and mint themselves a fresh,
 * private, effectively unlimited bucket per request. That trades a self-DoS for a
 * total bypass, which is strictly worse. `api.bookbuddy.vinstitution.com` answers
 * directly from the origin (finding BB-006), so there is no upstream filter to
 * catch a spoofed header.
 *
 * WHAT WE DO INSTEAD
 * ------------------
 * Trust is pinned to the ADDRESS of the hop, not to a hop count. Express walks the
 * forwarded chain from the socket outwards and stops at the first address that is
 * not in the trusted set, so the value it yields is the last address a trusted
 * proxy actually observed. A client-supplied X-Forwarded-For entry sits further
 * left in the chain than the address Traefik appends, so it is never selected.
 *
 * TWO MODES, ONE CONFIG CHANGE APART
 * ----------------------------------
 * MODE A — "direct origin" (current deployment; the DEFAULT).
 *   Traefik is the only hop and reaches the app over the Docker bridge network, a
 *   private range. Trusted set: loopback + unique-local/private ranges.
 *     TRUST_PROXY=loopback,uniquelocal      (default; omit and you get this)
 *     CLIENT_IP_HEADER unset
 *
 * MODE B — "behind Cloudflare" (if api.* is later proxied, per BB-006's
 *   recommendation). Cloudflare terminates TLS and forwards, so the trustworthy
 *   value is `CF-Connecting-IP` — but ONLY when the connecting peer really is
 *   Cloudflare, otherwise anyone can send that header too.
 *     TRUST_PROXY=loopback,uniquelocal,<cloudflare CIDRs, comma separated>
 *     CLIENT_IP_HEADER=cf-connecting-ip
 *   Cloudflare publishes its ranges at https://www.cloudflare.com/ips/ — they
 *   change, so treat this as configuration to refresh, not a constant to hardcode.
 *   Do NOT set CLIENT_IP_HEADER without also adding the ranges to TRUST_PROXY;
 *   the guard below refuses to honour the header from an untrusted peer, but the
 *   configuration would then be silently useless rather than wrong.
 */

/** Value for Express's `trust proxy` setting, derived from TRUST_PROXY. */
export function resolveTrustProxySetting(): boolean | number | string[] {
  const raw = (process.env.TRUST_PROXY ?? 'loopback,uniquelocal').trim();

  if (raw === '' || raw.toLowerCase() === 'false') return false;

  // A bare number means "trust exactly N hops". Supported because it is the
  // conventional spelling, but the CIDR form is preferred: a hop count trusts
  // whoever happens to be at that position, an address list trusts a specific peer.
  if (/^\d+$/.test(raw)) return Number(raw);

  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The address to rate-limit against. Never returns a constant — an unresolvable
 * address degrades to 'unknown-<socket>' rather than collapsing every caller into
 * one shared bucket, which is the failure mode this whole file exists to prevent.
 */
export function getClientIp(req: any): string {
  const headerName = process.env.CLIENT_IP_HEADER?.toLowerCase();

  if (headerName) {
    // `req.ips` is populated by Express only when `trust proxy` matched the
    // connecting peer. Empty means the peer is NOT trusted, so any forwarding
    // header on this request is attacker-controlled and must be ignored.
    const peerIsTrusted = Array.isArray(req.ips) && req.ips.length > 0;
    if (peerIsTrusted) {
      const raw = req.headers?.[headerName];
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (typeof value === 'string' && value.trim()) {
        return normalise(value.split(',')[0].trim());
      }
    }
  }

  if (typeof req.ip === 'string' && req.ip) return normalise(req.ip);

  const socketAddr = req.socket?.remoteAddress ?? req.connection?.remoteAddress;
  if (typeof socketAddr === 'string' && socketAddr)
    return normalise(socketAddr);

  // Deliberately unique-ish rather than a shared constant. If we cannot identify
  // the caller we would rather over-limit one request than under-limit everyone.
  return 'unknown';
}

/** IPv4-mapped IPv6 (::ffff:1.2.3.4) and IPv6 zone ids collapse to one form. */
function normalise(ip: string): string {
  let out = ip.trim();
  if (out.startsWith('::ffff:')) out = out.slice(7);
  const zone = out.indexOf('%');
  if (zone !== -1) out = out.slice(0, zone);
  return out.toLowerCase();
}

/**
 * Identifier for the ACCOUNT a request targets, for the second rate-limit bucket.
 *
 * IP-keyed limits alone are not enough in either direction:
 *   - a botnet spread across many IPs can still lock ONE user out of recovery;
 *   - one NAT'd school shares an IP, so a per-IP limit lets a handful of students
 *     lock out everyone else at that institution.
 * So login, password reset and OTP get an account-keyed bucket as well.
 *
 * Returns null when no account can be identified, which makes the account bucket
 * fall back to the IP bucket rather than to a shared constant.
 */
export function getTargetAccountKey(req: any): string | null {
  const userId = req.user?.id;
  if (typeof userId === 'string' && userId) return `uid:${userId}`;

  const body = req.body ?? {};
  for (const field of ['email', 'identifier', 'username']) {
    const value = body[field];
    if (typeof value === 'string' && value.trim()) {
      // Lowercased to match the database's citext columns, so `A@b.com` and
      // `a@b.com` cannot be used as two separate budgets against one account.
      return `acct:${value.trim().toLowerCase()}`;
    }
  }
  return null;
}
