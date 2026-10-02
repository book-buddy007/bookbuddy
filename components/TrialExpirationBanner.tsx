'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  getTrialStatus, 
  shouldShowTrialWarning,
  formatTrialExpirationDate 
} from '@/lib/utils/subscription';
import { 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  X,
  Crown,
  Zap
} from '@/components/ui/icons';

export function TrialExpirationBanner() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Was the banner dismissed recently? Declared above the early returns below: hooks
  // must run on every render, and this one used to sit after them, which crashed the
  // banner on the first render that showed it.
  useEffect(() => {
    const dismissalData = localStorage.getItem('trialBannerDismissed');
    if (dismissalData) {
      try {
        const { expiresAt } = JSON.parse(dismissalData);
        if (Date.now() < expiresAt) {
          setIsDismissed(true);
        } else {
          // Dismissal expired, remove from storage
          localStorage.removeItem('trialBannerDismissed');
        }
      } catch (error) {
        // Invalid data, remove it
        localStorage.removeItem('trialBannerDismissed');
      }
    }
  }, []);

  if (!mounted || !user) return null;

  // Check if we should show the banner
  const shouldShow = shouldShowTrialWarning(
    user.accountType,
    user.subscriptionTier,
    user.subscriptionStatus,
    user.trialEndsAt || null
  );

  if (!shouldShow || isDismissed) return null;

  const trialStatus = getTrialStatus(user.trialEndsAt || null);

  // Determine banner styling based on urgency
  const getBannerStyles = () => {
    switch (trialStatus.urgencyLevel) {
      case 'expired':
        return {
          containerClass: 'border-red-500 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30',
          iconClass: 'text-red-600 dark:text-red-400',
          icon: AlertTriangle,
          badgeVariant: 'destructive' as const,
          badgeText: 'Expired',
          buttonVariant: 'destructive' as const,
          buttonText: 'Upgrade Now',
        };
      case 'high':
        return {
          containerClass: 'border-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30',
          iconClass: 'text-orange-600 dark:text-orange-400',
          icon: Clock,
          badgeVariant: 'destructive' as const,
          badgeText: `${trialStatus.daysRemaining} ${trialStatus.daysRemaining === 1 ? 'Day' : 'Days'} Left`,
          buttonVariant: 'default' as const,
          buttonText: 'Upgrade Now',
        };
      case 'medium':
        return {
          containerClass: 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30',
          iconClass: 'text-yellow-600 dark:text-yellow-400',
          icon: Sparkles,
          badgeVariant: 'secondary' as const,
          badgeText: `${trialStatus.daysRemaining} Days Left`,
          buttonVariant: 'default' as const,
          buttonText: 'View Plans',
        };
      default:
        return {
          containerClass: 'border-blue-500 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
          iconClass: 'text-blue-600 dark:text-blue-400',
          icon: Sparkles,
          badgeVariant: 'secondary' as const,
          badgeText: `${trialStatus.daysRemaining} Days Left`,
          buttonVariant: 'default' as const,
          buttonText: 'View Plans',
        };
    }
  };

  const styles = getBannerStyles();
  const Icon = styles.icon;

  const handleUpgrade = () => {
    router.push('/subscription/compare');
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal in localStorage with expiry (dismiss for 24 hours)
    const dismissalData = {
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };
    localStorage.setItem('trialBannerDismissed', JSON.stringify(dismissalData));
  };


  return (
    <div className="w-full animate-in fade-in-0 duration-bb-ui">
      <Alert className={`relative border-2 ${styles.containerClass} shadow-vg-md`}>
        {/* Dismiss button */}
        {trialStatus.urgencyLevel !== 'expired' && (
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        <div className="flex items-start gap-4 pr-8">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <Icon className={`h-6 w-6 ${styles.iconClass}`} />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-0">
                {trialStatus.isExpired ? 'Trial Expired' : 'Trial Period Ending Soon'}
              </AlertTitle>
              <Badge variant={styles.badgeVariant} className="font-semibold">
                {styles.badgeText}
              </Badge>
            </div>

            <AlertDescription className="text-gray-700 dark:text-gray-300">
              {trialStatus.message}
              {!trialStatus.isExpired && (
                <span className="block mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Trial expires on {formatTrialExpirationDate(trialStatus.expirationDate)}
                </span>
              )}
            </AlertDescription>

            {/* Upgrade benefits */}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Zap className="h-4 w-4 text-cyan-600" />
                <span>Offline Reading</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Crown className="h-4 w-4 text-purple-600" />
                <span>Advanced Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Sparkles className="h-4 w-4 text-yellow-600" />
                <span>Unlimited Storage</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <EnhancedButton
                variant={styles.buttonVariant}
                onClick={handleUpgrade}
                icon={<Crown className="h-4 w-4" />}
                iconPosition="left"
                size="sm"
              >
                {styles.buttonText}
              </EnhancedButton>
              
              {trialStatus.urgencyLevel !== 'expired' && (
                <EnhancedButton
                  variant="outline"
                  onClick={() => router.push('/subscription/compare')}
                  size="sm"
                >
                  Compare Plans
                </EnhancedButton>
              )}
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
}

