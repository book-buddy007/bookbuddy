import { apiFetch } from './client';
import type { UserProfile } from './types';

/**
 * GET /user/profile — the full profile, including onboarding progress,
 * membership status and the latest join request.
 *
 * Distinct from `auth.getProfile()` (GET /auth/profile), which returns only the
 * session's `AuthUser`. Anything that needs to decide *access* — the onboarding
 * redirect, the institutional waiting room — must use this one.
 */
export function getUserProfile() {
  return apiFetch<UserProfile>('/user/profile');
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  profilePicture?: string;
  metadata?: unknown;
}

/** PUT /user/profile — partial update of the signed-in user. */
export function updateProfile(data: UpdateProfileInput) {
  return apiFetch<UserProfile>('/user/profile', {
    method: 'PUT',
    body: data,
  });
}

export interface CompleteOnboardingInput {
  accountType?: 'INDEPENDENT' | 'INSTITUTIONAL';
  /**
   * Defaults to 3 (complete) server-side. Step 2 is rejected unless the email
   * is verified, and any step >= 3 requires an accountType.
   */
  onboardingStep?: number;
}

/** PUT /user/complete-onboarding — advances or finishes onboarding. */
export function completeOnboarding(data: CompleteOnboardingInput = {}) {
  return apiFetch<UserProfile>('/user/complete-onboarding', {
    method: 'PUT',
    body: data,
  });
}

/** DELETE /user/account — permanent account deletion. */
export function deleteAccount() {
  return apiFetch<{ message: string }>('/user/account', {
    method: 'DELETE',
  });
}
