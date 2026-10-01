import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { resendVerificationPublic, verifyEmail } from '@/api/auth';
import { ApiError } from '@/api/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Banner } from '@/components/ui';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, spacing, type ColorTokens } from '@/theme';

type Phase = 'verifying' | 'verified' | 'failed' | 'pending';

/**
 * Two entry points:
 *   • Deep link `bookbuddy://verify-email?token=…` — verifies immediately.
 *   • Opened without a token (e.g. from the sign-in screen after registering) —
 *     shows the pending state with a resend action.
 */
export default function VerifyEmailScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { token, email: emailParam } = useLocalSearchParams<{
    token?: string;
    email?: string;
  }>();

  const [phase, setPhase] = useState<Phase>(token ? 'verifying' : 'pending');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(emailParam ?? '');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Guards against a second verify call if the screen re-renders while the
  // first request is still in flight — the token is single-use, so a duplicate
  // would come back as "already used" and read to the user as a failure.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    (async () => {
      try {
        await verifyEmail(token);
        haptics.success();
        setPhase('verified');
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'This verification link is invalid or has expired.';
        setError(message);
        haptics.error();
        setPhase('failed');
      }
    })();
  }, [token]);

  async function handleResend() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter the email address you registered with.');
      haptics.warning();
      return;
    }

    setError(null);
    setResending(true);
    try {
      await resendVerificationPublic(trimmed);
      haptics.success();
      setResent(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not resend the verification email. Try again shortly.';
      setError(message);
      haptics.error();
    } finally {
      setResending(false);
    }
  }

  if (phase === 'verifying') {
    return (
      <AuthShell
        icon="hourglass-outline"
        title="Verifying your email"
        subtitle="One moment while we confirm your address."
        showBack={false}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AuthShell>
    );
  }

  if (phase === 'verified') {
    return (
      <AuthShell
        icon="checkmark-circle-outline"
        title="Email verified"
        subtitle="Your address is confirmed. You can sign in and start reading."
        showBack={false}
      >
        <Banner
          tone="success"
          message="Thanks — that's the last step. Institutional accounts may still need an administrator to approve access."
        />
        <Button
          label="Continue to sign in"
          icon="arrow-forward-outline"
          variant="saffron"
          onPress={() => router.replace('/(auth)/login')}
        />
      </AuthShell>
    );
  }

  const isFailure = phase === 'failed';

  return (
    <AuthShell
      icon={isFailure ? 'alert-circle-outline' : 'mail-unread-outline'}
      title={isFailure ? 'Verification failed' : 'Verify your email'}
      subtitle={
        isFailure
          ? 'That link could not be used. Links expire and can only be used once.'
          : 'We sent a verification link to your inbox. Open it on this device to finish setting up.'
      }
      footer={
        <>
          <Text style={styles.footerText}>Already verified? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </>
      }
    >
      {!!error && <Banner tone="danger" message={error} />}

      {resent ? (
        <Banner
          tone="success"
          title="Verification email sent"
          message="Check your inbox — and your spam folder if it isn't there within a few minutes."
        />
      ) : (
        <>
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
            onSubmitEditing={handleResend}
          />

          <Button
            label="Resend verification email"
            icon="refresh-outline"
            variant="saffron"
            onPress={handleResend}
            loading={resending}
          />
        </>
      )}
    </AuthShell>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing(6) },
  footerText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  link: {
    color: colors.primary,
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '800',
  },
});
