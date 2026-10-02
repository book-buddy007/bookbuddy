import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/Ionicons';
import { ApiError } from '@/api/client';
import { deleteAccount } from '@/api/user';
import { useAuth } from '@/store/AuthContext';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Banner } from '@/components/ui';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

/** Typed exactly to confirm. Deliberately not localised — it must be unambiguous. */
const CONFIRM_WORD = 'DELETE';

const CONSEQUENCES = [
  'Your reading progress, streaks and statistics',
  'Highlights, notes and flashcard decks',
  'Files and folders in your personal library',
  'Borrowing history and saved titles',
  'Institution memberships and join requests',
] as const;

/**
 * Dedicated account-deletion screen.
 *
 * Google Play requires a discoverable in-app deletion path for any app that
 * creates accounts, and expects the user to be told what is removed. A native
 * confirm dialog technically deletes the account but shows none of that, so
 * this screen spells out the consequences and requires typing the word.
 */
export default function DeleteAccountScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function onDelete() {
    if (!canDelete) return;

    setError(null);
    setLoading(true);
    try {
      await deleteAccount();
      haptics.success();
      // Clear the local session regardless of what the server returns next —
      // the account is gone, so the stored token is dead either way.
      await signOut();
      router.replace('/landing');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not delete your account. Try again, or contact support.';
      setError(message);
      haptics.error();
      setLoading(false);
    }
  }

  return (
    <AuthShell
      icon="trash-outline"
      title="Delete your account"
      subtitle={
        user?.email
          ? `This permanently removes ${user.email} and everything in it.`
          : 'This permanently removes your account and everything in it.'
      }
    >
      <Banner
        tone="danger"
        title="This cannot be undone"
        message="Deletion is immediate and permanent. There is no recovery window and no way to restore your data afterwards."
      />

      {!!error && <Banner tone="danger" message={error} />}

      <View style={styles.list}>
        <Text style={styles.listTitle}>What gets deleted</Text>
        {CONSEQUENCES.map((item) => (
          <View key={item} style={styles.listRow}>
            <Ionicons name="close-circle-outline" size={15} color={colors.danger} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.prompt}>
        Type <Text style={styles.promptWord}>{CONFIRM_WORD}</Text> to confirm.
      </Text>

      <TextField
        label="Confirmation"
        icon="alert-circle-outline"
        value={confirmText}
        onChangeText={(value) => {
          setConfirmText(value);
          if (error) setError(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder={CONFIRM_WORD}
      />

      <Button
        label="Delete my account permanently"
        variant="danger"
        icon="trash-outline"
        onPress={onDelete}
        loading={loading}
        disabled={!canDelete}
      />

      <Button
        label="Keep my account"
        variant="ghost"
        onPress={() => router.back()}
        style={{ marginTop: spacing(3) }}
      />
    </AuthShell>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  list: {
    gap: spacing(2),
    padding: spacing(4),
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(5),
  },
  listTitle: {
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
  },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(2) },
  listText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  prompt: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing(2),
  },
  promptWord: {
    fontFamily: fonts.heading,
    fontWeight: '800',
    color: colors.danger,
  },
});
