/**
 * Session cookie naming — single source of truth.
 *
 * Two reasons this exists rather than the name being written out at each call site:
 *
 * 1. **The prefix has to change.** All three apps in the trio currently use
 *    better-auth's default (`better-auth.*`). While cookies stay host-scoped that
 *    is harmless, but single logout (and anything else served under a shared
 *    `.vinstitution.com` parent) needs three distinguishable cookies — three
 *    identically-named ones would collide. Changing it in one place beats
 *    changing it in 23 files and missing some.
 *
 * 2. **Half the call sites were already wrong.** better-auth prefixes the cookie
 *    with `__Secure-` whenever it is served over HTTPS, so the plain name simply
 *    does not exist in production. Several routes read only the plain name:
 *    `branding/[...path]` and `homepage/[...path]` return 401 unconditionally in
 *    production as a result, and the two `v1/books` routes silently forward
 *    unauthenticated requests. Reading through `sessionCookieNames()` makes that
 *    class of bug impossible.
 *
 * NOTE: changing AUTH_COOKIE_PREFIX invalidates every existing session — better-auth
 * will not recognise a cookie stored under the old name. Deploy it deliberately.
 */

/** Must match `advanced.cookiePrefix` in lib/auth.ts. */
export const AUTH_COOKIE_PREFIX = "better-auth";

export const SESSION_COOKIE = `${AUTH_COOKIE_PREFIX}.session_token`;
export const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`;
export const ACTIVE_ORG_COOKIE = `${AUTH_COOKIE_PREFIX}.active_organization`;
export const SECURE_ACTIVE_ORG_COOKIE = `__Secure-${ACTIVE_ORG_COOKIE}`;

/** Both spellings, secure first — that is the one production actually sets. */
export function sessionCookieNames(): readonly string[] {
  return [SECURE_SESSION_COOKIE, SESSION_COOKIE];
}

/**
 * Minimal shape shared by `cookies()` from next/headers and `NextRequest.cookies`.
 */
interface CookieJar {
  get(name: string): { value: string } | undefined;
}

/** Read the session token from either cookie jar shape, trying both names. */
export function readSessionToken(jar: CookieJar): string | undefined {
  for (const name of sessionCookieNames()) {
    const value = jar.get(name)?.value;
    if (value) return value;
  }
  return undefined;
}

/** Same, for a plain `Record<string, string>` (Express-style `req.cookies`). */
export function readSessionTokenFromRecord(
  cookies: Record<string, string | undefined> | undefined,
): string | undefined {
  if (!cookies) return undefined;
  for (const name of sessionCookieNames()) {
    if (cookies[name]) return cookies[name];
  }
  return undefined;
}
