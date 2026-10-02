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
import { Ionicons } from '@/components/Ionicons';
import { useAuth } from '@/store/AuthContext';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { ApiError } from '@/api/client';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing, type ColorTokens } from '@/theme';

export default function RegisterScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setNotice(null);

    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      if (e instanceof ApiError && /verif/i.test(e.message)) {
        setNotice(
          'Account created successfully! Please verify your email, then sign in.',
        );
      } else {
        setError(
          e instanceof ApiError ? e.message : 'Registration failed. Try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.push('/landing')}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textMuted} />
            <Text style={styles.backBtnText}>Landing Page</Text>
          </Pressable>
        </View>

        {/* Parchment Glass Card Container */}
        <View style={styles.parchmentCard}>
          {/* Brand Header */}
          <View style={styles.header}>
            <View style={styles.iconHaloOuter}>
              <View style={styles.iconHaloInner}>
                <Ionicons name="person-add" size={30} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Free access to the shared global library catalog
            </Text>
          </View>

          {/* Alerts */}
          {!!error && (
            <View style={styles.alertError}>
              <Ionicons name="warning-outline" size={18} color={colors.danger} />
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          )}

          {!!notice && (
            <View style={styles.alertNotice}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={styles.alertNoticeText}>{notice}</Text>
            </View>
          )}

          {/* Form Fields */}
          <TextField
            label="Full Name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Jane Student"
          />

          <TextField
            label="Email Address"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />

          <TextField
            label="Password"
            icon="lock-closed-outline"
            isPassword
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
          />

          {/* Submit Button */}
          <Button
            label="Create Account"
            icon="checkmark-outline"
            variant="saffron"
            onPress={onSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scrollContainer: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(10),
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
  },
  backBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  parchmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    padding: spacing(6),
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(6),
  },
  iconHaloOuter: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.saffronDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
    shadowColor: colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  iconHaloInner: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: '#D93A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing(1),
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(229, 40, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 40, 58, 0.3)',
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

  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: radius.md,
    padding: spacing(3.5),
    marginBottom: spacing(4),
  },
  alertNoticeText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  submitBtn: {
    marginTop: spacing(2),
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing(6),
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.saffron, fontWeight: '700', fontSize: 14 },
});
