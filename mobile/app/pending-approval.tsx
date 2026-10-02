import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { completeOnboarding } from '@/api/user';
import { useAuth } from '@/store/AuthContext';
import { USER_PROFILE_KEY, useUserProfile } from '@/hooks/useUserProfile';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/Button';
import { Banner } from '@/components/ui';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

/**
 * The institutional waiting room — ported from the web student dashboard
 * (app/dashboard/student/page.tsx:57-76).
 *
 * Without this, an institutional student who signs up on mobile reaches an
 * empty catalogue with no explanation and no way forward. Both exits the web
 * version offers are preserved: re-apply, or switch to an independent account
 * and start reading immediately.
 */
export default function PendingApprovalScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: profile, isFetching, refetch } = useUserProfile();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestRequest = profile?.joinRequests?.[0];
  const isRejected = latestRequest?.status === 'REJECTED';
  const institutionName =
    latestRequest?.tenant?.name ??
    profile?.tenantMemberships?.[0]?.tenant?.name ??
    'your institution';

  async function handleCheckAgain() {
    haptics.tap();
    const result = await refetch();
    const fresh = result.data;

    if (fresh?.tenantMemberships?.some((m) => m.status === 'ACTIVE')) {
      haptics.success();
      router.replace('/(tabs)');
    }
  }

  async function handleSwitchToIndependent() {
    setError(null);
    setSwitching(true);
    try {
      await completeOnboarding({ accountType: 'INDEPENDENT' });
      await queryClient.invalidateQueries({ queryKey: USER_PROFILE_KEY });
      haptics.success();
      router.replace('/(tabs)');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not switch your account type. Try again.';
      setError(message);
      haptics.error();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <AuthShell
      icon={isRejected ? 'close-circle-outline' : 'time-outline'}
      title={isRejected ? 'Request declined' : 'Waiting for approval'}
      subtitle={
        isRejected
          ? `Your request to join ${institutionName} was declined.`
          : `Your account is ready, but an administrator at ${institutionName} still needs to approve your access.`
      }
      showBack={false}
    >
      {!!error && <Banner tone="danger" message={error} />}

      <Banner
        tone={isRejected ? 'warning' : 'info'}
        message={
          isRejected
            ? 'You can apply to a different institution, or continue as an independent reader with the public catalogue.'
            : "You'll get an email as soon as you're approved. You can keep reading independently in the meantime."
        }
      />

      <View style={styles.steps}>
        <Step icon="checkmark-circle" tone={colors.success} label="Account created" done />
        <Step
          icon={isRejected ? 'close-circle' : 'ellipse-outline'}
          tone={isRejected ? colors.danger : colors.warning}
          label={isRejected ? 'Request declined' : 'Awaiting administrator approval'}
        />
        <Step icon="ellipse-outline" tone={colors.textMuted} label="Institution library unlocked" />
      </View>

      {!isRejected && (
        <Button
          label="Check again"
          icon="refresh-outline"
          variant="saffron"
          onPress={handleCheckAgain}
          loading={isFetching}
        />
      )}

      {isRejected && (
        <Button
          label="Apply to another institution"
          icon="school-outline"
          variant="saffron"
          onPress={() => router.replace('/onboarding')}
        />
      )}

      <Button
        label="Continue as independent reader"
        icon="person-outline"
        variant="ghost"
        onPress={handleSwitchToIndependent}
        loading={switching}
        style={{ marginTop: spacing(3) }}
      />

      <Button
        label="Sign out"
        variant="ghost"
        onPress={async () => {
          await signOut();
          router.replace('/landing');
        }}
        style={{ marginTop: spacing(3) }}
      />
    </AuthShell>
  );
}

function Step({
  icon,
  tone,
  label,
  done = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  label: string;
  done?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.stepRow}>
      <Ionicons name={icon} size={17} color={tone} />
      <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  steps: {
    gap: spacing(2.5),
    padding: spacing(4),
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(5),
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2.5) },
  stepLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  stepLabelDone: { color: colors.textSecondary },
});
