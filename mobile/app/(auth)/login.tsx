import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/store/AuthContext';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { ApiError } from '@/api/client';
import { resendVerificationPublic } from '@/api/auth';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';
import { RotatingMandala } from '@/components/landing/RotatingMandala';

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email verification state
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setShowResendVerification(false);
    setResendSuccess(false);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : 'Sign in failed. Please check credentials.';
      setError(msg);

      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('verif')) {
        setShowResendVerification(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email) {
      setResendError('Please enter your email address above.');
      return;
    }
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);
    try {
      // Absolute-URL API call via the shared client — a relative fetch has no
      // origin on native and always fails. Uses the public (pre-sign-in) route.
      await resendVerificationPublic(email.trim());
      setResendSuccess(true);
    } catch (e) {
      setResendError(
        e instanceof ApiError ? e.message : 'Network error. Please try again.',
      );
    } finally {
      setResendLoading(false);
    }
  }

  function handleGoogleSignIn() {
    setError('Google Sign-In will open in secure browser session.');
  }

  function handleVidyaverseSignIn() {
    setError('Institution SSO will authenticate with your institutional account.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Ambient background orbs */}
      <View style={styles.orbSaffron} />
      <View style={styles.orbIndigo} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/landing')}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="arrow-back" size={18} color="#B45309" />
            <Text style={styles.backBtnText}>Landing Page</Text>
          </Pressable>
        </View>

        {/* Parchment Glass Card Outer Wrapper with Back Glow */}
        <View style={styles.cardWrapper}>
          <View style={styles.cardGlow} />

          <View style={styles.parchmentCard}>
            {/* Subtle Rotating Mandala Watermark */}
            <RotatingMandala size={280} opacity={0.25} style={styles.mandalaWatermark} />

            {/* Brand Badge Header */}
            <View style={styles.header}>
              <View style={styles.iconHaloOuter}>
                <View style={styles.iconHaloInner}>
                  <Ionicons name="school" size={30} color="#FFFFFF" />
                </View>
              </View>
              {/* Title in Yatra One display font */}
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to access your digital library & AI companion</Text>
            </View>

            {/* Error Alert Box */}
            {!!error && (
              <View style={styles.alertError}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text style={styles.alertErrorText}>{error}</Text>
              </View>
            )}

            {/* Unverified Email Action Banner */}
            {showResendVerification && (
              <View style={styles.resendCard}>
                <View style={styles.resendHeaderRow}>
                  <Ionicons name="mail-unread-outline" size={20} color="#B45309" />
                  <Text style={styles.resendTitle}>Email Not Verified</Text>
                </View>
                <Text style={styles.resendDesc}>
                  Please verify your email address before logging in.
                </Text>

                {resendSuccess ? (
                  <View style={styles.resendSuccessBadge}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                    <Text style={styles.resendSuccessText}>Verification email sent! Check your inbox.</Text>
                  </View>
                ) : (
                  <View style={{ gap: spacing(2), marginTop: spacing(2) }}>
                    {!!resendError && <Text style={styles.resendErrorText}>{resendError}</Text>}
                    <Button
                      label="Resend Verification Email"
                      variant="saffron"
                      loading={resendLoading}
                      onPress={handleResendVerification}
                      style={{ height: 44 }}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Form Controls */}
            <TextField
              label="Email Address"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />

            <TextField
              label="Password"
              icon="lock-closed-outline"
              isPassword
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
            />

            {/* Forgot Password Link */}
            <View style={styles.forgotRow}>
              <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
                Forgot password?
              </Link>
            </View>

            {/* Main Submit Button */}
            <Button
              label="Sign In"
              icon="arrow-forward-outline"
              variant="saffron"
              onPress={onSubmit}
              loading={loading}
              style={styles.submitBtn}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* SSO Buttons */}
            <View style={styles.ssoGroup}>
              <Button
                label="Google Account"
                icon="logo-google"
                variant="sso"
                onPress={handleGoogleSignIn}
                style={styles.ssoBtn}
              />
              <Button
                label="Institution SSO"
                icon="globe-outline"
                variant="sso"
                onPress={handleVidyaverseSignIn}
                style={styles.ssoBtn}
              />
            </View>
          </View>
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Book Buddy? </Text>
          <Link href="/(auth)/register" style={styles.link}>
            Create an account
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg, position: 'relative' },
  orbSaffron: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,153,51,0.16)',
  },
  orbIndigo: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(13,27,110,0.12)',
  },
  scrollContainer: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(12),
    paddingBottom: spacing(8),
    flexGrow: 1,
    justifyContent: 'center',
  },
  topBar: {
    marginBottom: spacing(4),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(1.5),
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.3)',
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: '#B45309',
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '700',
  },

  /* Parchment Card Container */
  cardWrapper: {
    position: 'relative',
  },
  cardGlow: {
    position: 'absolute',
    top: 6,
    bottom: -6,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(180, 83, 9, 0.16)',
    borderRadius: 24,
    zIndex: -1,
  },
  parchmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 83, 9, 0.25)',
    padding: spacing(6),
    shadowColor: '#0D1B6E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
  },
  mandalaWatermark: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(6),
    zIndex: 1,
  },
  iconHaloOuter: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: '#B45309',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  iconHaloInner: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: '#E65100',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#B45309',
    fontFamily: fonts.display, // Yatra One display font
    fontSize: 32,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing(1),
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
  },

  /* Alert Box */
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: radius.md,
    padding: spacing(3.5),
    marginBottom: spacing(4),
  },
  alertErrorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  /* Resend Box */
  resendCard: {
    backgroundColor: 'rgba(255, 153, 51, 0.1)',
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: radius.md,
    padding: spacing(4),
    marginBottom: spacing(4),
  },
  resendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resendTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  resendDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  resendSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing(2),
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: spacing(2.5),
    borderRadius: radius.sm,
  },
  resendSuccessText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  resendErrorText: {
    color: colors.danger,
    fontSize: 12,
  },

  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: spacing(5),
    marginTop: -spacing(2),
  },
  forgotLink: {
    color: colors.saffron,
    fontSize: 13,
    fontWeight: '700',
  },

  submitBtn: {
    marginBottom: spacing(5),
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing(4),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginHorizontal: spacing(3),
  },

  ssoGroup: {
    gap: spacing(3),
  },
  ssoBtn: {
    width: '100%',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing(6),
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.saffron, fontWeight: '700', fontSize: 14 },
});
