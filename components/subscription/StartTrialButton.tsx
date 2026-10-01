'use client';

import { Sparkles, Check, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrialActivation } from '@/hooks/useTrialActivation';
import { useAuthStore } from '@/store/useAuthStore';
import { getTrialStatus } from '@/lib/utils/subscription';

const TRIAL_DAYS = 7;
const PER_FEATURE_DAILY = 30;

const PAID_TIERS = new Set(['basic', 'premium', 'enterprise', 'gold', 'diamond', 'silver', 'bronze']);

/**
 * True when the signed-in user is a B2C student who has never used (or has an
 * expired) trial and no paid plan — i.e. someone the "Start free trial" CTA
 * should target. Institutional users, staff, and users mid-trial or paid are
 * excluded so the button doesn't appear where it can't act.
 */
export function useCanStartTrial(): boolean {
  const { user } = useAuthStore();
  if (!user) return false;

  const role = String(user.role ?? '').toLowerCase();
  const accountType = String(user.accountType ?? '').toLowerCase();
  const tier = String(user.subscriptionTier ?? '').toLowerCase();

  if (role !== 'student' || accountType !== 'independent') return false;
  if (PAID_TIERS.has(tier)) return false;

  // Currently on an active trial → nothing to start.
  const trialActive = tier === 'trial' && getTrialStatus(user.trialEndsAt ?? null).isActive;
  if (trialActive) return false;

  return true;
}

interface StartTrialButtonProps {
  /** 'card' = prominent dashboard block; 'inline' = compact, for a blocked panel. */
  variant?: 'card' | 'inline';
  /** Called after a successful activation (e.g. to clear a blocked-state flag and retry). */
  onActivated?: () => void;
  className?: string;
}

export function StartTrialButton({ variant = 'card', onActivated, className = '' }: StartTrialButtonProps) {
  const { activate, isActivating, error, activated } = useTrialActivation(onActivated);

  const cta = (
    <Button
      onClick={() => activate()}
      disabled={isActivating || activated}
      className="bg-[var(--accent-strong,#7c3aed)] hover:bg-[var(--accent-contrast,#6d28d9)] text-white shadow-sm"
    >
      {isActivating ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…</>
      ) : activated ? (
        <><Check className="w-4 h-4 mr-2" /> Trial active</>
      ) : (
        <><Sparkles className="w-4 h-4 mr-2" /> Start {TRIAL_DAYS}-day free trial</>
      )}
    </Button>
  );

  if (variant === 'inline') {
    return (
      <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
        {activated ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            Trial activated — ask your question again.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Varta and the other AI study tools need a subscription. Try them free for{' '}
              {TRIAL_DAYS} days — up to {PER_FEATURE_DAILY} uses per feature each day.
            </p>
            {cta}
          </>
        )}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-[var(--accent-primary,#a78bfa)]/30 bg-gradient-to-br from-[var(--accent-soft,#f5f3ff)] to-white dark:from-slate-900 dark:to-slate-950 p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-[var(--accent-strong,#7c3aed)]/10 flex items-center justify-center">
          <Crown className="w-6 h-6 text-[var(--accent-strong,#7c3aed)]" />
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Unlock your AI study tools
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Start a free {TRIAL_DAYS}-day trial of Varta chat, Simplify, Chapter Recap and
            Quiz — up to {PER_FEATURE_DAILY} uses per feature each day. No card required.
          </p>
          {activated ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4" /> Your {TRIAL_DAYS}-day trial is active. Enjoy!
            </p>
          ) : (
            <div className="pt-1">{cta}</div>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
