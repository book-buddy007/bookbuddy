import { useQuery } from '@tanstack/react-query';
import { getUserProfile } from '@/api/user';
import { useAuth } from '@/store/AuthContext';
import type { UserProfile } from '@/api/types';

export const USER_PROFILE_KEY = ['user-profile'] as const;

/**
 * GET /user/profile, scoped to the signed-in session.
 *
 * Kept separate from AuthContext because this is the *access* profile —
 * onboarding progress, membership status, latest join request — and it needs to
 * be refetchable on demand (the waiting room polls it when the user taps
 * "Check again" after an administrator approves them).
 */
export function useUserProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: USER_PROFILE_KEY,
    queryFn: getUserProfile,
    enabled: isAuthenticated,
    // Access can change server-side while the app is open, so don't serve a
    // long-stale answer to a gate decision.
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/** True when an institutional user has at least one ACTIVE membership. */
export function hasActiveMembership(profile: UserProfile | undefined): boolean {
  return !!profile?.tenantMemberships?.some((m) => m.status === 'ACTIVE');
}

/**
 * Whether this user is stuck outside the library waiting on an administrator.
 *
 * Mirrors the web gate in app/dashboard/student/page.tsx: institutional account
 * type, but no active membership yet.
 */
export function isAwaitingApproval(profile: UserProfile | undefined): boolean {
  if (!profile) return false;
  return profile.accountType === 'INSTITUTIONAL' && !hasActiveMembership(profile);
}
