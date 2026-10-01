import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { returnBook } from '@/api/books';
import { ApiError } from '@/api/client';
import { getBorrowHistory, getBorrowedBooks, getSavedBooks } from '@/api/library';
import type { BorrowedBook, SavedBook } from '@/api/types';
import { Button } from '@/components/Button';
import {
  Banner,
  Card,
  Chip,
  EmptyState,
  Screen,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { entrance, haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';
import { dueLabel, dueState } from '@/utils/dueDate';

type Shelf = 'borrowed' | 'saved' | 'history';

const SHELVES = [
  { value: 'borrowed' as const, label: 'Borrowed' },
  { value: 'saved' as const, label: 'Saved' },
  { value: 'history' as const, label: 'History' },
];

/**
 * My Library — the reader's own shelves, split across the three endpoints the
 * backend exposes. Returning is done here rather than on the book page because
 * this is where someone goes when they want to clear space or stop an item
 * going overdue.
 */
export default function MyLibraryScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [shelf, setShelf] = useState<Shelf>('borrowed');
  const [error, setError] = useState<string | null>(null);

  const borrowedQuery = useQuery({
    queryKey: ['library-borrowed'],
    queryFn: getBorrowedBooks,
    enabled: shelf === 'borrowed',
  });

  const savedQuery = useQuery({
    queryKey: ['library-saved'],
    queryFn: getSavedBooks,
    enabled: shelf === 'saved',
  });

  const historyQuery = useQuery({
    queryKey: ['library-history'],
    queryFn: getBorrowHistory,
    enabled: shelf === 'history',
  });

  const active =
    shelf === 'borrowed' ? borrowedQuery : shelf === 'saved' ? savedQuery : historyQuery;

  const returnMutation = useMutation({
    mutationFn: (bookId: string) => returnBook(bookId),
    onSuccess: () => {
      haptics.success();
      setError(null);
      // The shelf, the home screen's "continue reading" and the history list
      // all change when a title goes back.
      queryClient.invalidateQueries({ queryKey: ['library-borrowed'] });
      queryClient.invalidateQueries({ queryKey: ['library-history'] });
    },
    onError: (err) => {
      haptics.error();
      setError(
        err instanceof ApiError ? err.message : 'Could not return this title. Try again.',
      );
    },
  });

  if (active.isLoading) {
    return (
      <Screen maxWidth="wide">
        <SegmentedControl options={SHELVES} value={shelf} onChange={setShelf} />
        <View style={styles.skeletons}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={82} rounded={radius.lg} />
          ))}
        </View>
      </Screen>
    );
  }

  if (active.isError) {
    return (
      <Screen maxWidth="wide">
        <SegmentedControl options={SHELVES} value={shelf} onChange={setShelf} />
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title="Couldn't load your shelf"
          body={(active.error as Error).message}
          actionLabel="Try again"
          onAction={() => active.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen maxWidth="wide">
      <SegmentedControl options={SHELVES} value={shelf} onChange={setShelf} />

      {!!error && <Banner tone="danger" message={error} style={{ marginTop: spacing(4) }} />}

      {shelf === 'saved' ? (
        <ShelfList
          data={savedQuery.data ?? []}
          keyOf={(item) => item.annotationId}
          refreshing={savedQuery.isRefetching}
          onRefresh={savedQuery.refetch}
          empty={
            <EmptyState
              icon="bookmark-outline"
              title="Nothing saved yet"
              body="Bookmark a title while reading and it'll wait for you here."
              actionLabel="Browse the catalogue"
              onAction={() => router.push('/(tabs)/catalog')}
            />
          }
          renderItem={(item, index) => (
            <Animated.View entering={entrance.stagger(index)}>
              <Card onPress={() => router.push(`/book/${item.id}`)} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.author} numberOfLines={1}>
                    {item.author}
                  </Text>
                </View>
                <Chip label="Saved" tone="teal" icon="bookmark" />
              </Card>
            </Animated.View>
          )}
        />
      ) : (
        <ShelfList
          data={(shelf === 'borrowed' ? borrowedQuery.data : historyQuery.data) ?? []}
          keyOf={(item) => item.id}
          refreshing={active.isRefetching}
          onRefresh={active.refetch}
          empty={
            shelf === 'borrowed' ? (
              <EmptyState
                icon="book-outline"
                title="No borrowed titles"
                body="Anything you borrow appears here with its due date."
                actionLabel="Browse the catalogue"
                onAction={() => router.push('/(tabs)/catalog')}
              />
            ) : (
              <EmptyState
                icon="time-outline"
                title="No reading history yet"
                body="Titles you've borrowed and returned will be listed here."
              />
            )
          }
          renderItem={(item, index) => (
            <Animated.View entering={entrance.stagger(index)}>
              <Card onPress={() => router.push(`/book/${item.bookId}`)} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.title} numberOfLines={2}>
                    {item.book.title}
                  </Text>
                  <Text style={styles.author} numberOfLines={1}>
                    {item.book.author}
                  </Text>

                  <View style={styles.metaRow}>
                    {shelf === 'borrowed' ? (
                      <Chip
                        label={dueLabel(item.dueDate)}
                        tone={
                          dueState(item.dueDate) === 'overdue'
                            ? 'danger'
                            : dueState(item.dueDate) === 'ok'
                              ? 'teal'
                              : 'gold'
                        }
                        icon="time-outline"
                      />
                    ) : (
                      <Chip
                        label={`Returned ${new Date(item.returnedAt!).toLocaleDateString(
                          undefined,
                          { day: 'numeric', month: 'short' },
                        )}`}
                        tone="neutral"
                        icon="checkmark-done-outline"
                      />
                    )}
                  </View>
                </View>

                {shelf === 'borrowed' && (
                  <Button
                    label="Return"
                    variant="ghost"
                    onPress={() => returnMutation.mutate(item.bookId)}
                    loading={
                      returnMutation.isPending && returnMutation.variables === item.bookId
                    }
                    style={styles.returnBtn}
                    textStyle={{ fontSize: 13 }}
                  />
                )}
              </Card>
            </Animated.View>
          )}
        />
      )}
    </Screen>
  );
}

/** Shared list frame so the three shelves stay visually identical. */
function ShelfList<T>({
  data,
  keyOf,
  renderItem,
  empty,
  refreshing,
  onRefresh,
}: {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactElement;
  empty: React.ReactElement;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const colors = useThemeColors();

  return (
    <FlatList
      data={data}
      keyExtractor={keyOf}
      renderItem={({ item, index }) => renderItem(item, index)}
      contentContainerStyle={{
        paddingTop: spacing(4),
        paddingBottom: spacing(8),
        gap: spacing(3),
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={empty}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    />
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  skeletons: { gap: spacing(3), paddingTop: spacing(4) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  rowText: { flex: 1, gap: spacing(0.5) },
  title: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  author: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  metaRow: { flexDirection: 'row', marginTop: spacing(2) },
  returnBtn: { height: 38, paddingHorizontal: spacing(3.5) },
});
