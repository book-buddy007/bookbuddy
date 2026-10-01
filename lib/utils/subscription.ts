/**
 * Subscription utility functions for trial expiration tracking and subscription management
 */

export interface TrialStatus {
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number;
  expirationDate: Date | null;
  urgencyLevel: 'none' | 'low' | 'medium' | 'high' | 'expired';
  message: string;
}

/**
 * Calculate days remaining until a date
 */
export function calculateDaysRemaining(endDate: Date | string | null): number {
  if (!endDate) return 0;
  
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Check if trial is expiring soon (within specified days)
 */
export function isTrialExpiringSoon(
  trialEndsAt: Date | string | null,
  warningDays: number = 7
): boolean {
  if (!trialEndsAt) return false;
  
  const daysRemaining = calculateDaysRemaining(trialEndsAt);
  return daysRemaining > 0 && daysRemaining <= warningDays;
}

/**
 * Check if trial has expired
 */
export function isTrialExpired(trialEndsAt: Date | string | null): boolean {
  if (!trialEndsAt) return false;
  
  const end = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt;
  const now = new Date();
  
  return end.getTime() < now.getTime();
}

/**
 * Get comprehensive trial status information
 */
export function getTrialStatus(trialEndsAt: Date | string | null): TrialStatus {
  if (!trialEndsAt) {
    return {
      isActive: false,
      isExpired: false,
      isExpiringSoon: false,
      daysRemaining: 0,
      expirationDate: null,
      urgencyLevel: 'none',
      message: 'No active trial',
    };
  }

  const expirationDate = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt;
  const daysRemaining = calculateDaysRemaining(expirationDate);
  const expired = isTrialExpired(expirationDate);
  const expiringSoon = isTrialExpiringSoon(expirationDate);

  let urgencyLevel: TrialStatus['urgencyLevel'] = 'none';
  let message = '';

  if (expired) {
    urgencyLevel = 'expired';
    message = 'Your trial has expired. Upgrade to continue accessing premium features.';
  } else if (daysRemaining === 0) {
    urgencyLevel = 'high';
    message = 'Your trial expires today! Upgrade now to avoid interruption.';
  } else if (daysRemaining === 1) {
    urgencyLevel = 'high';
    message = 'Your trial expires tomorrow. Upgrade to keep your access.';
  } else if (daysRemaining <= 3) {
    urgencyLevel = 'high';
    message = `Only ${daysRemaining} days left in your trial. Upgrade now!`;
  } else if (daysRemaining <= 7) {
    urgencyLevel = 'medium';
    message = `${daysRemaining} days remaining in your trial.`;
  } else if (daysRemaining <= 14) {
    urgencyLevel = 'low';
    message = `${daysRemaining} days left in your trial period.`;
  } else {
    urgencyLevel = 'none';
    message = `Your trial is active with ${daysRemaining} days remaining.`;
  }

  return {
    isActive: !expired,
    isExpired: expired,
    isExpiringSoon: expiringSoon,
    daysRemaining,
    expirationDate,
    urgencyLevel,
    message,
  };
}

/**
 * Format trial expiration date for display
 */
export function formatTrialExpirationDate(trialEndsAt: Date | string | null): string {
  if (!trialEndsAt) return 'N/A';
  
  const date = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt;
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get subscription tier display name
 */
export function getSubscriptionTierDisplayName(tier: string | null): string {
  if (!tier) return 'No Subscription';
  
  const tierMap: Record<string, string> = {
    trial: 'Trial',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };
  
  return tierMap[tier.toLowerCase()] || tier;
}

/**
 * Get subscription tier color for badges
 */
export function getSubscriptionTierColor(tier: string | null): string {
  if (!tier) return 'gray';
  
  const colorMap: Record<string, string> = {
    trial: 'blue',
    basic: 'green',
    premium: 'purple',
    enterprise: 'gold',
  };
  
  return colorMap[tier.toLowerCase()] || 'gray';
}

/**
 * Check if user should see trial expiration warnings
 */
export function shouldShowTrialWarning(
  accountType: string | null,
  subscriptionTier: string | null,
  subscriptionStatus: string | null,
  trialEndsAt: Date | string | null
): boolean {
  // Only show for independent students on trial
  if (accountType !== 'independent') return false;
  if (subscriptionTier !== 'trial') return false;
  if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trial') return false;
  if (!trialEndsAt) return false;
  
  // Show if trial is expiring soon or expired
  const status = getTrialStatus(trialEndsAt);
  return status.isExpiringSoon || status.isExpired;
}

/**
 * Calculate trial end date from start date (default 30 days)
 */
export function calculateTrialEndDate(startDate: Date = new Date(), trialDays: number = 30): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + trialDays);
  return endDate;
}

