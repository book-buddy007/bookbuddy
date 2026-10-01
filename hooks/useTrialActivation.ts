import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export interface TrialActivationResult {
  status: 'ACTIVATED' | 'ALREADY_ACTIVE';
  trialEndsAt?: string;
  trialDays?: number;
}

/**
 * Drives POST /api/subscription/activate-trial and, on success, forces the
 * better-auth session to refetch so the freshly-granted trial is visible
 * everywhere that reads `user.subscriptionTier` (the RAG guard admits it on the
 * next request; the UI hides the button and shows the expiry banner).
 */
export function useTrialActivation(onActivated?: () => void) {
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  const activate = useCallback(async () => {
    setIsActivating(true);
    setError(null);
    try {
      const res = await fetch('/api/subscription/activate-trial', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // ALREADY_SUBSCRIBED / TRIAL_ALREADY_USED / INSTITUTIONAL carry a human
        // message from the route; fall back to a generic line if absent.
        throw new Error(data.error || `Could not start trial (HTTP ${res.status})`);
      }

      setActivated(true);
      // Pull the new subscription fields into the session store the whole app
      // reads, then re-render server components. Best-effort: the button already
      // shows success regardless.
      await authClient.getSession().catch(() => undefined);
      router.refresh();
      onActivated?.();
      return data as TrialActivationResult;
    } catch (e: any) {
      setError(e.message || 'Could not start your free trial.');
      return null;
    } finally {
      setIsActivating(false);
    }
  }, [router, onActivated]);

  return { activate, isActivating, error, activated };
}
