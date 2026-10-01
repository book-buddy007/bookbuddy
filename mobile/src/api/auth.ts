import { apiFetch } from './client';
import type { AuthUser, LoginResponse } from './types';

/** POST /auth/login — returns a session token + user profile. */
export function login(email: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },
  });
}

/** POST /auth/register — creates a B2C student account. */
export function register(input: {
  email: string;
  password: string;
  name: string;
}) {
  return apiFetch<{ id: string; email: string; name: string | null }>(
    '/auth/register',
    {
      method: 'POST',
      auth: false,
      body: { ...input, role: 'STUDENT' },
    },
  );
}

/** GET /auth/profile — validates the current token and returns the user. */
export function getProfile() {
  return apiFetch<AuthUser>('/auth/profile');
}

/** POST /auth/logout — revokes the session server-side. */
export function logout() {
  return apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
}

/** POST /auth/google-signin — signs in or registers via Google OAuth idToken. */
export function googleSignIn(idToken: string) {
  return apiFetch<LoginResponse>('/auth/google-signin', {
    method: 'POST',
    auth: false,
    body: { idToken },
  });
}

/** POST /auth/forgot-password — triggers password reset email. */
export function forgotPassword(email: string) {
  return apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: { email },
  });
}

/**
 * POST /auth/reset-password — resets password with token.
 *
 * The field is `password`, not `newPassword`: backend ResetPasswordDto
 * validates `password` and would reject the request outright otherwise.
 */
export function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: { token, password },
  });
}

/** POST /auth/verify-email — confirms an address from an emailed token. */
export function verifyEmail(token: string) {
  return apiFetch<{ message: string }>('/auth/verify-email', {
    method: 'POST',
    auth: false,
    body: { token },
  });
}

/**
 * POST /auth/resend-verification-public — resends the verification email by
 * address. Used before sign-in, when there is no session to authenticate with.
 */
export function resendVerificationPublic(email: string) {
  return apiFetch<{ message: string }>('/auth/resend-verification-public', {
    method: 'POST',
    auth: false,
    body: { email },
  });
}

/** POST /auth/resend-verification — resends for the signed-in user. */
export function resendVerification() {
  return apiFetch<{ message: string }>('/auth/resend-verification', {
    method: 'POST',
  });
}
