/**
 * Fields of a User row that must never leave the server: credentials, provider ids, lockout
 * state and free-form onboarding metadata (which can hold government ids and family details).
 */
const SENSITIVE_USER_FIELDS = [
  'password',
  'googleId',
  'failedLoginAttempts',
  'lockedUntil',
  'lockReason',
  'metadata',
  'deletedAt',
] as const;

/** A copy of a User row without the sensitive fields. */
export function omitSensitiveUserFields<T extends Record<string, unknown>>(
  user: T,
): Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]> {
  const copy: Record<string, unknown> = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) delete copy[field];
  return copy as Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]>;
}
