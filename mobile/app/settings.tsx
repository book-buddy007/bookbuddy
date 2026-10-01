import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { sendTestPush } from '@/api/notifications';
import { updateProfile } from '@/api/user';
import { useAuth } from '@/store/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Banner, Card, ListRow, Screen } from '@/components/ui';
import { haptics } from '@/motion';
import { useMobileTheme, useThemeColors } from '@/ThemeProvider';
import { fonts, spacing, type ColorTokens } from '@/theme';

/**
 * Settings.
 *
 * Mirrors the web tabs that have a backend behind them — account, appearance,
 * notifications, advanced. The web "Security" tab (password change, 2FA,
 * session management) is deliberately absent: the auth controller exposes no
 * endpoints for any of it, so those controls would be decorative.
 */
export default function SettingsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { data: profile } = useUserProfile();
  const { isDark, toggleTheme } = useMobileTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [name, setName] = useState(profile?.name ?? user?.name ?? '');
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; message: string } | null>(
    null,
  );

  const saveMutation = useMutation({
    mutationFn: () => updateProfile({ name: name.trim() }),
    onSuccess: () => {
      haptics.success();
      setStatus({ tone: 'success', message: 'Profile updated.' });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
    onError: (err) => {
      haptics.error();
      setStatus({
        tone: 'danger',
        message: err instanceof ApiError ? err.message : 'Could not save your profile.',
      });
    },
  });

  const testPushMutation = useMutation({
    mutationFn: () => sendTestPush('Book Buddy by VPD', 'Push notifications are working.'),
    onSuccess: () => {
      haptics.success();
      setStatus({ tone: 'success', message: 'Test notification sent.' });
    },
    onError: (err) => {
      haptics.error();
      setStatus({
        tone: 'danger',
        message: err instanceof ApiError ? err.message : 'Could not send a test notification.',
      });
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Screen scroll maxWidth="form">
        {status ? <Banner tone={status.tone} message={status.message} /> : null}

        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.card}>
          <TextField
            label="Display name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
          <ListRow title="Email" subtitle={profile?.email ?? user?.email ?? '—'} icon="mail-outline" />
          <ListRow
            title="Email verified"
            subtitle={profile?.emailVerified ? 'Verified' : 'Not verified yet'}
            icon={profile?.emailVerified ? 'shield-checkmark-outline' : 'alert-circle-outline'}
          />
          <ListRow
            title="Account type"
            subtitle={profile?.accountType === 'INSTITUTIONAL' ? 'Institutional' : 'Independent'}
            icon="school-outline"
            last
          />
          <Button
            label="Save changes"
            variant="saffron"
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={name.trim().length === 0 || name.trim() === (profile?.name ?? '')}
            style={{ marginTop: spacing(4) }}
          />
        </Card>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <Card style={styles.card}>
          <ListRow
            title="Dark theme"
            subtitle={isDark ? 'On' : 'Off'}
            icon="moon-outline"
            last
            trailing={
              <Switch
                value={isDark}
                onValueChange={() => {
                  haptics.select();
                  toggleTheme();
                }}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.surface}
              />
            }
          />
        </Card>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <Card style={styles.card}>
          <ListRow
            title="Notification inbox"
            subtitle="Due dates and institution updates"
            icon="notifications-outline"
            onPress={() => router.push('/notifications')}
          />
          <ListRow
            title="Send a test notification"
            subtitle="Check that push is reaching this device"
            icon="paper-plane-outline"
            onPress={() => testPushMutation.mutate()}
            last
          />
        </Card>

        <Text style={styles.sectionTitle}>Institution</Text>
        <Card style={styles.card}>
          <ListRow
            title="Browse institutions"
            subtitle="Find and request access to a library"
            icon="business-outline"
            onPress={() => router.push('/institutions')}
            last
          />
        </Card>

        <Text style={styles.sectionTitle}>Advanced</Text>
        <Card style={styles.card}>
          <ListRow
            title="Sign out"
            icon="log-out-outline"
            onPress={async () => {
              await signOut();
              router.replace('/landing');
            }}
          />
          <ListRow
            title="Delete account"
            subtitle="Permanently remove your account and data"
            icon="trash-outline"
            tone="danger"
            onPress={() => router.push('/delete-account')}
            last
          />
        </Card>
      </Screen>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: spacing(6),
    marginBottom: spacing(2),
  },
  card: { paddingVertical: spacing(1) },
});
