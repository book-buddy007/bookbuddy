import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/store/AuthContext';
import { isAwaitingApproval, useUserProfile } from '@/hooks/useUserProfile';
import { useThemeColors } from '@/ThemeProvider';

/**
 * Boot gate. Validates the stored token, then routes to the first screen the
 * user can actually act on:
 *
 *   not signed in            -> landing
 *   onboarding incomplete    -> onboarding
 *   institutional, unapproved-> waiting room
 *   otherwise                -> the library
 *
 * If the profile request fails (offline, server down) we fall through to the
 * library rather than trapping the user on a spinner — the catalogue supports
 * guest browsing, so a failed gate check should degrade to less access, not to
 * a dead end.
 */
export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const colors = useThemeColors();

  if (isLoading || (isAuthenticated && profileLoading)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/landing" />;

  if (profile && !profile.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  if (isAwaitingApproval(profile)) {
    return <Redirect href="/pending-approval" />;
  }

  return <Redirect href="/(tabs)" />;
}
