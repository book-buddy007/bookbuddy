import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Book } from '@/api/types';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing } from '@/theme';
import { PressableScale } from './ui/PressableScale';

export function BookCard({ book, onPress }: { book: Book; onPress: () => void }) {
  const colors = useThemeColors();

  const genres = book.categories
    .map((c) => c.category?.name)
    .filter(Boolean)
    .slice(0, 2);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          padding: spacing(2.5),
          borderWidth: 1,
          borderColor: colors.border,
        },
        coverWrap: { position: 'relative', marginBottom: spacing(2.5) },
        cover: {
          width: '100%',
          aspectRatio: 3 / 4,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceAlt,
        },
        coverFallback: { alignItems: 'center', justifyContent: 'center' },
        coverFallbackText: {
          color: colors.textMuted,
          fontSize: 40,
          fontFamily: fonts.heading,
          fontWeight: '700',
        },
        tierBadge: {
          position: 'absolute',
          top: spacing(2),
          right: spacing(2),
          backgroundColor: colors.gold,
          borderRadius: radius.sm,
          paddingHorizontal: spacing(2),
          paddingVertical: spacing(0.5),
        },
        tierText: {
          color: '#1A1205',
          fontSize: 10,
          fontFamily: fonts.label,
          fontWeight: '800',
        },
        title: {
          color: colors.text,
          fontSize: 14,
          fontFamily: fonts.heading,
          fontWeight: '700',
        },
        author: {
          color: colors.textMuted,
          fontSize: 12,
          fontFamily: fonts.body,
          marginTop: spacing(0.5),
        },
        genre: {
          color: colors.primary,
          fontSize: 11,
          fontFamily: fonts.label,
          marginTop: spacing(1),
        },
      }),
    [colors],
  );

  return (
    <PressableScale
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${book.title} by ${book.author}`}
    >
      <View style={styles.coverWrap}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverFallbackText}>
              {book.title.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        {book.accessTier !== 'FREE' && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{book.accessTier}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {book.title}
      </Text>
      <Text numberOfLines={1} style={styles.author}>
        {book.author}
      </Text>
      {genres.length > 0 && (
        <Text numberOfLines={1} style={styles.genre}>
          {genres.join(' · ')}
        </Text>
      )}
    </PressableScale>
  );
}
