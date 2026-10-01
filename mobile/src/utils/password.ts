/**
 * Password rules, mirrored from the backend's ResetPasswordDto:
 *   @MinLength(8)
 *   @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
 *
 * Checked client-side so a user learns the rule while typing rather than after
 * a round trip. The server remains the authority — this only shortens the
 * feedback loop.
 */

export interface PasswordRule {
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v) => /\d/.test(v) },
] as const;

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

/** First unmet rule, for a single-line error message. */
export function firstPasswordError(value: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  return failed ? failed.label : null;
}
