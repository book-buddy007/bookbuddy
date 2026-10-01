import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Banner } from '@/components/ui';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, spacing, type ColorTokens } from '@/theme';
import { PASSWORD_RULES, isPasswordValid } from '@/utils/password';

/**
 * Reached from the emailed reset link via the `bookbuddy://` scheme —
 * `bookbuddy://reset-password?token=…` — or by typing a token manually if the deep
 * link fails to open. Without a token there is nothing to submit, so the screen
 * says so rather than presenting a form that cannot succeed.
 */
export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const rules = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ label: rule.label, met: rule.test(password) })),
    [password],
  );

  async function onSubmit() {
    if (!token) return;

    if (!isPasswordValid(password)) {
      setError('Your password does not meet all the requirements yet.');
      haptics.warning();
      return;
    }

    if (password !== confirm) {
      setError('The two passwords do not match.');
      haptics.warning();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await resetPassword(token, password);
      haptics.success();
      setDone(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not reset your password. Request a new link and try again.';
      setError(message);
      haptics.error();
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        icon="link-outline"
        title="Link not recognised"
        subtitle="This screen needs a reset token from the email we sent you."
      >
        <Banner
          tone="warning"
          title="Open the link from your email"
          message="Tap the button in the password-reset email on this device. If the link has expired, request a new one — they are single-use."
        />
        <Button
          label="Request a new link"
          variant="saffron"
          icon="refresh-outline"
          onPress={() => router.replace('/(auth)/forgot-password')}
        />
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        icon="shield-checkmark-outline"
        title="Password updated"
        subtitle="You can now sign in with your new password."
        showBack={false}
      >
        <Banner
          tone="success"
          message="For your security, any other devices signed in to this account may need to sign in again."
        />
        <Button
          label="Go to sign in"
          icon="arrow-forward-outline"
          variant="saffron"
          onPress={() => router.replace('/(auth)/login')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon="lock-open-outline"
      title="Set a new password"
      subtitle="Choose something you haven't used on this account before."
      footer={
        <>
          <Text style={styles.footerText}>Changed your mind? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </>
      }
    >
      {!!error && <Banner tone="danger" message={error} />}

      <TextField
        label="New Password"
        icon="lock-closed-outline"
        isPassword
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          if (error) setError(null);
        }}
        placeholder="Enter a new password"
      />

      <View style={styles.rules}>
        {rules.map((rule) => (
          <View key={rule.label} style={styles.ruleRow}>
            <Ionicons
              name={rule.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={rule.met ? colors.success : colors.textMuted}
            />
            <Text style={[styles.ruleText, rule.met && styles.ruleTextMet]}>
              {rule.label}
            </Text>
          </View>
        ))}
      </View>

      <TextField
        label="Confirm Password"
        icon="lock-closed-outline"
        isPassword
        value={confirm}
        onChangeText={(value) => {
          setConfirm(value);
          if (error) setError(null);
        }}
        placeholder="Re-enter the new password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />

      <Button
        label="Update password"
        icon="checkmark-outline"
        variant="saffron"
        onPress={onSubmit}
        loading={loading}
      />
    </AuthShell>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  footerText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  link: {
    color: colors.primary,
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '800',
  },
  rules: {
    gap: spacing(1.5),
    marginTop: -spacing(2),
    marginBottom: spacing(4.5),
    paddingLeft: spacing(1),
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  ruleText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
  ruleTextMet: { color: colors.success },
});
