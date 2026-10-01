import React, { useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { getOverview } from '@/api/analytics';
import { getBorrowedBooks } from '@/api/library';
import { getStreak } from '@/api/progress';
import type { BorrowedBook } from '@/api/types';
import { useAuth } from '@/store/AuthContext';
import { Avatar, Card, Chip, EmptyState, Screen, Skeleton, StatTile } from '@/components/ui';
import { entrance } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';
import { useBreakpoint } from '@/utils/useBreakpoint';
import { dueLabel, dueState } from '@/utils/dueDate';

function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Student home — the first thing a signed-in reader sees.
 *
 * Ordered by what gets someone back into a book fastest: continue reading,
 * then what's due, then the numbers. Stats sit below the fold on a phone
 * because they're satisfying to check but never the reason the app was opened.
 */
export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { user } = useAuth();
  const { select } = useBreakpoint();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const overviewQuery = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: getOverview,
  });

  const streakQuery = useQuery({
    queryKey: ['reading-streak'],
    queryFn: getStreak,
  });

  const borrowedQuery = useQuery({
    queryKey: ['library-borrowed'],
    queryFn: getBorrowedBooks,
  });

  const borrowed = borrowedQuery.data ?? [];
  // Soonest due first (the endpoint already orders this way) — the most
  // urgent title is also the most likely one to be resumed.
  const current: BorrowedBook | undefined = borrowed[0];
  const overview = overviewQuery.data;
  const streak = streakQuery.data;

  const isLoading =
    overviewQuery.isLoading || streakQuery.isLoading || borrowedQuery.isLoading;

  const refreshing =
    overviewQuery.isRefetching || borrowedQuery.isRefetching || streakQuery.isRefetching;

  function refetchAll() {
    overviewQuery.refetch();
    streakQuery.refetch();
    borrowedQuery.refetch();
  }

  return (
    <Screen
      scroll
      maxWidth="wide"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refetchAll}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.greetRow}>
        <View style={styles.greetText}>
          <Text style={styles.greeting}>{greetingFor()}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {user?.name?.split(' ')[0] ?? 'Reader'}
          </Text>
        </View>
        <Avatar name={user?.name ?? user?.email} size={46} />
      </View>

      {isLoading ? (
        <View style={styles.section}>
          <Skeleton height={132} rounded={radius.lg} />
          <View style={styles.statGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ flexBasis: select({ compact: '47%', medium: '23%' }) }}>
                <Skeleton height={104} rounded={radius.lg} />
              </View>
            ))}
          </View>
        </View>
      ) : (
        <>
          {current ? (
            <Animated.View entering={entrance.card}>
              <Card
                variant="accent"
                onPress={() =>
                  router.push({
                    pathname: '/reader/[id]',
                    params: {
                      id: current.bookId,
                      title: current.book.title,
                      format: current.book.bookFormats?.[0]?.type ?? 'PDF',
                    },
                  })
                }
                accessibilityLabel={`Continue reading ${current.book.title}`}
                style={styles.continueCard}
              >
                <Text style={styles.eyebrow}>Continue reading</Text>
                <Text style={styles.continueTitle} numberOfLines={2}>
                  {current.book.title}
                </Text>
                <Text style={styles.continueAuthor} numberOfLines={1}>
                  {current.book.author}
                </Text>

                <View style={styles.continueFooter}>
                  <Chip
                    label={dueLabel(current.dueDate)}
                    tone={
                      dueState(current.dueDate) === 'overdue'
                        ? 'danger'
                        : dueState(current.dueDate) === 'ok'
                          ? 'teal'
                          : 'gold'
                    }
                    icon="time-outline"
                  />
                  <View style={styles.resumeHint}>
                    <Text style={styles.resumeText}>Resume</Text>
                    <Ionicons name="arrow-forward" size={15} color={colors.primary} />
                  </View>
                </View>
              </Card>
            </Animated.View>
          ) : (
            <EmptyState
              icon="book-outline"
              title="Nothing on your shelf yet"
              body="Borrow a title from the catalogue and it'll show up here, ready to pick up where you left off."
              actionLabel="Browse the catalogue"
              onAction={() => router.push('/(tabs)/catalog')}
            />
          )}

          <View style={styles.statGrid}>
            <StatTile
              label="Day streak"
              value={streak?.currentStreak ?? overview?.streak ?? 0}
              icon="flame"
              tone="primary"
              hint={
                streak?.longestStreak
                  ? `Best: ${streak.longestStreak} days`
                  : undefined
              }
              style={{ flexBasis: select({ compact: '47%', medium: '23%' }) }}
            />
            <StatTile
              label="Books read"
              value={overview?.totalBooks ?? 0}
              icon="library"
              tone="teal"
              style={{ flexBasis: select({ compact: '47%', medium: '23%' }) }}
            />
            <StatTile
              label="Pages"
              value={overview?.totalPages ?? 0}
              icon="document-text"
              tone="indigo"
              style={{ flexBasis: select({ compact: '47%', medium: '23%' }) }}
            />
            <StatTile
              label="Hours"
              value={overview?.readingTimeHours ?? 0}
              icon="hourglass"
              tone="gold"
              style={{ flexBasis: select({ compact: '47%', medium: '23%' }) }}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Study</Text>
            <View style={styles.studyRow}>
              <Card
                onPress={() => router.push('/flashcards')}
                style={styles.studyCard}
                accessibilityLabel="Flashcards"
              >
                <Ionicons name="albums-outline" size={20} color={colors.primary} />
                <Text style={styles.studyLabel}>Flashcards</Text>
              </Card>
              <Card
                onPress={() => router.push('/vocabulary')}
                style={styles.studyCard}
                accessibilityLabel="Word list"
              >
                <Ionicons name="language-outline" size={20} color={colors.teal} />
                <Text style={styles.studyLabel}>Word list</Text>
              </Card>
              <Card
                onPress={() => router.push('/personal-library')}
                style={styles.studyCard}
                accessibilityLabel="My files"
              >
                <Ionicons name="folder-outline" size={20} color={colors.gold} />
                <Text style={styles.studyLabel}>My files</Text>
              </Card>
            </View>
          </View>

          {borrowed.length > 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Also on your shelf</Text>
              {borrowed.slice(1, 5).map((item, index) => (
                <Animated.View key={item.id} entering={entrance.stagger(index)}>
                  <Card
                    padded={false}
                    onPress={() => router.push(`/book/${item.bookId}`)}
                    style={styles.shelfCard}
                  >
                    <View style={styles.shelfRow}>
                      <View style={styles.shelfText}>
                        <Text style={styles.shelfTitle} numberOfLines={1}>
                          {item.book.title}
                        </Text>
                        <Text style={styles.shelfAuthor} numberOfLines={1}>
                          {item.book.author}
                        </Text>
                      </View>
                      <Chip
                        label={dueLabel(item.dueDate)}
                        tone={dueState(item.dueDate) === 'overdue' ? 'danger' : 'neutral'}
                      />
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
    marginBottom: spacing(5),
  },
  greetText: { flex: 1, gap: spacing(0.5) },
  greeting: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
  },
  continueCard: { gap: spacing(1) },
  eyebrow: {
    fontFamily: fonts.label,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  continueTitle: {
    fontFamily: fonts.heading,
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing(1),
  },
  continueAuthor: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  continueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing(3),
    gap: spacing(3),
  },
  resumeHint: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  resumeText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(3),
    marginTop: spacing(5),
  },
  section: { marginTop: spacing(6), gap: spacing(3) },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  studyRow: { flexDirection: 'row', gap: spacing(3) },
  studyCard: { flex: 1, alignItems: 'center', gap: spacing(2), paddingVertical: spacing(5) },
  studyLabel: {
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  shelfCard: { padding: spacing(3.5) },
  shelfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  shelfText: { flex: 1, gap: spacing(0.5) },
  shelfTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  shelfAuthor: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
});
