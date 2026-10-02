import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { useAuth } from '@/store/AuthContext';
import { useMobileTheme, useThemeColors } from '@/ThemeProvider';
import { Button } from '@/components/Button';
import { radius, spacing, type ColorTokens } from '@/theme';

import { useRouter } from 'expo-router';

/** Styles depend on the active theme, so each component derives its own set. */
function useStyles() {
  const colors = useThemeColors();
  return useMemo(() => makeStyles(colors), [colors]);
}

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { themeMode, toggleTheme, isDark } = useMobileTheme();

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.avatar, { backgroundColor: colors.saffronDark }]}>
          <Ionicons name="person-outline" size={40} color="#FFFFFF" />
        </View>
        <Text style={styles.name}>Guest Reader</Text>
        <Text style={styles.email}>Browsing in guest mode</Text>

        <View style={[styles.card, { alignItems: 'center', marginVertical: spacing(6) }]}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.saffron} style={{ marginBottom: spacing(2) }} />
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
            Sign In to Access Your Library
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing(1), marginBottom: spacing(4) }}>
            Save reading progress, borrow books, and talk to Varta study companion.
          </Text>
          <Button
            label="Sign In to Account"
            variant="saffron"
            onPress={() => router.push('/(auth)/login')}
            style={{ width: '100%' }}
          />
        </View>

        {/* Theme Preference Toggle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance & Theme</Text>
          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [styles.themeToggleRow, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.themeLeft}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={20}
                color={colors.saffron}
              />
              <Text style={styles.themeLabel}>Theme Mode</Text>
            </View>
            <View style={styles.themeBadge}>
              <Text style={styles.themeBadgeText}>
                {isDark ? 'Dark Slate' : 'Indic Light'}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // Routes to the dedicated screen rather than deleting behind a two-tap
  // dialog: Play policy expects the user to be shown what is removed, and a
  // permanent action deserves a typed confirmation.
  const handleDeleteAccount = () => router.push('/delete-account');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(user?.name ?? user?.email ?? '?').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{user?.name ?? 'Reader'}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      {/* Account Info Card */}
      <View style={styles.card}>
        <Row label="Role" value={formatRole(user?.role)} />
        <Row label="Account" value={formatRole(user?.accountType)} />
        {user?.subscriptionTier ? (
          <Row label="Plan" value={formatRole(user.subscriptionTier)} />
        ) : null}
      </View>

      {/* Theme Preference Toggle */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance & Theme</Text>
        <Pressable
          onPress={toggleTheme}
          style={({ pressed }) => [styles.themeToggleRow, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.themeLeft}>
            <Ionicons
              name={isDark ? 'moon-outline' : 'sunny-outline'}
              size={20}
              color={colors.saffron}
            />
            <Text style={styles.themeLabel}>Theme Mode</Text>
          </View>
          <View style={styles.themeBadge}>
            <Text style={styles.themeBadgeText}>
              {isDark ? 'Dark Slate' : 'Indic Light'}
            </Text>
          </View>
        </Pressable>
      </View>

      {!!user?.tenantMemberships?.length && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Institutions</Text>
          {user.tenantMemberships.map((m) => (
            <Row
              key={m.tenantId}
              label={m.tenantName}
              value={formatRole(m.role)}
            />
          ))}
        </View>
      )}

      <Button
        label="Sign Out"
        variant="ghost"
        onPress={signOut}
        style={{ marginTop: spacing(8), width: '100%' }}
      />

      <Button
        label="Delete Account & Data"
        variant="danger"
        onPress={handleDeleteAccount}
        style={{ marginTop: spacing(3), width: '100%' }}
      />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function formatRole(v?: string | null): string {
  if (!v) return '—';
  return v
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(6), alignItems: 'center' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(4),
  },
  avatarText: { color: colors.primaryText, fontSize: 36, fontWeight: '800' },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: spacing(4),
  },
  email: { color: colors.textMuted, fontSize: 14, marginTop: spacing(1) },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    marginTop: spacing(5),
  },
  cardTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing(2.5),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing(2),
  },
  rowLabel: { color: colors.textMuted, fontSize: 15 },
  rowValue: { color: colors.text, fontSize: 15, fontWeight: '600' },

  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2),
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  themeBadge: {
    backgroundColor: 'rgba(255, 138, 61, 0.15)',
    borderWidth: 1,
    borderColor: colors.borderGold,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    borderRadius: radius.sm,
  },
  themeBadgeText: {
    color: colors.saffron,
    fontSize: 12,
    fontWeight: '700',
  },
});
