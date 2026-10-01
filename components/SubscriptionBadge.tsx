'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { 
  getSubscriptionTierDisplayName,
  getTrialStatus,
  calculateDaysRemaining
} from '@/lib/utils/subscription';
import { 
  Crown, 
  Sparkles, 
  Zap,
  Clock
} from 'lucide-react';

interface SubscriptionBadgeProps {
  showIcon?: boolean;
  showDaysRemaining?: boolean;
  clickable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SubscriptionBadge({ 
  showIcon = true, 
  showDaysRemaining = false,
  clickable = true,
  size = 'md'
}: SubscriptionBadgeProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  // Only show for independent students
  if (user.accountType !== 'INDEPENDENT') return null;

  const tier = user.subscriptionTier;
  const displayName = getSubscriptionTierDisplayName(tier);

  // Get badge styling based on tier
  const getBadgeStyles = () => {
    switch (tier?.toLowerCase()) {
      case 'trial':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700',
          icon: Sparkles,
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
      case 'basic':
        return {
          variant: 'secondary' as const,
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700',
          icon: Zap,
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'premium':
        return {
          variant: 'secondary' as const,
          className: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700',
          icon: Crown,
          iconColor: 'text-purple-600 dark:text-purple-400',
        };
      case 'enterprise':
        return {
          variant: 'secondary' as const,
          className: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-900 dark:from-yellow-900/30 dark:to-orange-900/30 dark:text-yellow-300 border-yellow-400 dark:border-yellow-700',
          icon: Crown,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600',
          icon: Clock,
          iconColor: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const styles = getBadgeStyles();
  const Icon = styles.icon;

  // Calculate days remaining for trial
  let daysRemainingText = '';
  if (tier === 'TRIAL' && showDaysRemaining && user.trialEndsAt) {
    const trialStatus = getTrialStatus(user.trialEndsAt);
    if (trialStatus.isActive) {
      daysRemainingText = ` (${trialStatus.daysRemaining}d)`;
    } else if (trialStatus.isExpired) {
      daysRemainingText = ' (Expired)';
    }
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const handleClick = () => {
    if (clickable) {
      router.push('/subscription/compare');
    }
  };

  return (
    <Badge
      variant={styles.variant}
      className={`
        ${styles.className} 
        ${sizeClasses[size]}
        ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        font-semibold
        border
        flex items-center gap-1.5
      `}
      onClick={handleClick}
    >
      {showIcon && <Icon className={`${iconSizes[size]} ${styles.iconColor}`} />}
      <span>{displayName}{daysRemainingText}</span>
    </Badge>
  );
}

