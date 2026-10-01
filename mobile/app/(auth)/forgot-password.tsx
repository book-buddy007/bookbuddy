import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { forgotPassword } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Banner } from '@/components/ui';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, spacing, type ColorTokens } from '@/theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    const trimmed = email.trim();

    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      haptics.warning();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      haptics.success();
      setSent(true);
    } catch (err) {
      // The backend deliberately does not reveal whether an address exists, so
      // only genuine failures (network, rate limit) should surface here.
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not send the reset email. Try again.';
      setError(message);
      haptics.error();
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        icon="mail-open-outline"
        title="Check your inbox"
        subtitle={`If an account exists for ${email.trim()}, a reset link is on its way.`}
        footer={
          <>
            <Text style={styles.footerText}>Remembered it? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
            </Link>
          </>
        }
      >
        <Banner
          tone="success"
          title="Reset link sent"
          message="The link expires shortly for security. If it doesn't arrive in a few minutes, check your spam folder before requesting another."
        />
        <Button
          label="Send again"
          variant="ghost"
          onPress={() => {
            setSent(false);
            setError(null);
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon="key-outline"
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a link to set a new password."
      footer={
        <>
          <Text style={styles.footerText}>Remembered it? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </>
      }
    >
      {!!error && <Banner tone="danger" message={error} />}

      <TextField
        label="Email Address"
        icon="mail-outline"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          if (error) setError(null);
        }}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
        returnKeyType="send"
        onSubmitEditing={onSubmit}
      />

      <Button
        label="Send reset link"
        icon="paper-plane-outline"
        variant="saffron"
        onPress={onSubmit}
        loading={loading}
      />

      <View style={styles.hintRow}>
        <Text style={styles.hint}>
          Signed up with Google? Use “Continue with Google” on the sign-in screen
          instead — that account has no password to reset.
        </Text>
      </View>
    </AuthShell>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  footerText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '800',
  },
  hintRow: { marginTop: spacing(5) },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
