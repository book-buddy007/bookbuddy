/**
 * Session cookie naming for the NestJS backend.
 *
 * Deliberately duplicated from the Next.js app's `lib/auth-cookies.ts` rather than
 * imported: this is a separately-deployed application with its own tsconfig and no
 * path alias reaching outside `backend/`. The two MUST be kept in step — the prefix
 * is set once in the Next app's better-auth config (`advanced.cookiePrefix`), and
 * this backend only ever reads what that issued.
 *
 * better-auth prefixes the cookie with `__Secure-` when served over HTTPS, so the
 * secure name is the one that exists in production. Always try both.
 */

/** Must match AUTH_COOKIE_PREFIX in the Next app's lib/auth-cookies.ts. */
export const AUTH_COOKIE_PREFIX = 'better-auth';

export const SESSION_COOKIE = `${AUTH_COOKIE_PREFIX}.session_token`;
export const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`;

/** Secure first — that is what production actually sets. */
export const SESSION_COOKIE_NAMES: readonly string[] = [
  SECURE_SESSION_COOKIE,
  SESSION_COOKIE,
];

/** Read the session token from an Express-style `req.cookies` record. */
export function readSessionTokenFromRecord(
  cookies: Record<string, string | undefined> | undefined,
): string {
  if (!cookies) return '';
  for (const name of SESSION_COOKIE_NAMES) {
    const value = cookies[name];
    if (value) return value;
  }
  return '';
}

/** Read the session token out of a raw `Cookie:` header. */
export function readSessionTokenFromHeader(header: string | undefined): string {
  if (!header) return '';
  const parts = header.split(';').map((c) => c.trim());
  for (const name of SESSION_COOKIE_NAMES) {
    const hit = parts.find((c) => c.startsWith(`${name}=`));
    if (hit) return decodeURIComponent(hit.slice(name.length + 1));
  }
  return '';
}
