import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { getBook, getReadUrl, borrowBook } from '@/api/books';
import { ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing, type ColorTokens } from '@/theme';

/** Styles depend on the active theme, so each component derives its own set. */
function useStyles() {
  const colors = useThemeColors();
  return useMemo(() => makeStyles(colors), [colors]);
}

export default function BookDetailScreen() {
  const colors = useThemeColors();
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: book, isLoading, isError, error } = useQuery({
    queryKey: ['book', id],
    queryFn: () => getBook(id!),
    enabled: !!id,
  });

  function onRead(format: string) {
    if (!id || !book) return;
    router.push({
      pathname: '/reader/[id]',
      params: { id, format, title: book.title },
    });
  }

  async function onBorrow() {
    if (!id) return;
    setBusy('borrow');
    try {
      const res = await borrowBook(id);
      Alert.alert(
        'Borrowed',
        `${res.message}\nDue ${new Date(res.dueDate).toLocaleDateString()}.`,
      );
    } catch (e) {
      Alert.alert(
        'Could not borrow',
        e instanceof ApiError ? e.message : 'Please try again.',
      );
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !book) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {(error as Error)?.message ?? 'Book not found.'}
        </Text>
      </View>
    );
  }

  const genres = book.categories.map((c) => c.category?.name).filter(Boolean);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverFallbackText}>
              {book.title.slice(0, 1)}
            </Text>
          </View>
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
          <View style={styles.badgeRow}>
            <Badge text={book.accessTier} highlight={book.accessTier !== 'FREE'} />
            {book.language ? <Badge text={book.language} /> : null}
            {book.available ? (
              <Badge text="Available" />
            ) : (
              <Badge text="Unavailable" />
            )}
          </View>
        </View>
      </View>

      {genres.length > 0 && (
        <Text style={styles.genres}>{genres.join(' · ')}</Text>
      )}

      {book.description ? (
        <Text style={styles.description}>{book.description}</Text>
      ) : null}

      <View style={styles.meta}>
        {book.publisher ? <MetaRow label="Publisher" value={book.publisher} /> : null}
        {book.publishYear ? (
          <MetaRow label="Year" value={String(book.publishYear)} />
        ) : null}
        {book.pages ? <MetaRow label="Pages" value={String(book.pages)} /> : null}
        {book.isbn ? <MetaRow label="ISBN" value={book.isbn} /> : null}
      </View>

      <Text style={styles.sectionTitle}>Read now</Text>
      {book.bookFormats.length === 0 ? (
        <Text style={styles.muted}>No readable formats yet.</Text>
      ) : (
        book.bookFormats.map((f) => (
          <Button
            key={f.id}
            label={`Open ${f.type}`}
            onPress={() => onRead(f.type)}
            loading={busy === `read:${f.type}`}
            variant="primary"
            style={{ marginBottom: spacing(3) }}
          />
        ))
      )}

      <Button
        label="Borrow this book"
        onPress={onBorrow}
        loading={busy === 'borrow'}
        variant="ghost"
        disabled={!book.available}
      />

      <Button
        label="Ask Varta 🤖"
        onPress={() =>
          router.push({
            pathname: '/chat/[id]',
            params: { id: book.id, title: book.title },
          })
        }
        variant="primary"
        style={{ marginTop: spacing(3) }}
      />
    </ScrollView>
  );
}

function Badge({ text, highlight }: { text: string; highlight?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.badge, highlight && styles.badgeHighlight]}>
      <Text style={[styles.badgeText, highlight && styles.badgeTextHighlight]}>
        {text}
      </Text>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing(5) },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing(6),
  },
  errorText: { color: colors.textMuted, textAlign: 'center' },
  hero: { flexDirection: 'row', gap: spacing(4) },
  cover: {
    width: 120,
    aspectRatio: 3 / 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverFallbackText: { color: colors.textMuted, fontSize: 40, fontWeight: '800' },
  heroInfo: { flex: 1, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  author: { color: colors.textMuted, fontSize: 15, marginTop: spacing(1) },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginTop: spacing(3),
  },
  badge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
  },
  badgeHighlight: { backgroundColor: colors.gold },
  badgeText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  badgeTextHighlight: { color: '#0A0F24' },
  genres: { color: colors.primary, fontSize: 13, marginTop: spacing(4) },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing(4),
  },
  meta: {
    marginTop: spacing(5),
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing(1.5),
  },
  metaLabel: { color: colors.textMuted, fontSize: 14 },
  metaValue: { color: colors.text, fontSize: 14, fontWeight: '600' },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing(6),
    marginBottom: spacing(3),
  },
  muted: { color: colors.textMuted, marginBottom: spacing(4) },
});
