import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { listBooks } from '@/api/books';
import type { Book } from '@/api/types';
import { BookCard } from '@/components/BookCard';
import { BookCardSkeleton, EmptyState, Screen } from '@/components/ui';
import { entrance } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing } from '@/theme';
import { useBreakpoint } from '@/utils/useBreakpoint';

const PAGE_SIZE = 12;

/**
 * Catalog — infinite-scroll grid backed by GET /books on the shared
 * backend. The exact same rows the web app renders, from the same DB.
 *
 * Column count is derived from the window width rather than fixed at 2, so the
 * same screen shows 2 covers on a phone and 5 on a tablet in landscape.
 */
export default function CatalogScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { gridColumns, isTablet } = useBreakpoint();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const columns = gridColumns({ minCardWidth: 170, horizontalPadding: spacing(8) });

  const query = useInfiniteQuery({
    queryKey: ['books', search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listBooks({ search, page: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined,
  });

  const books: Book[] = query.data?.pages.flatMap((p) => p.data) ?? [];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2.5),
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing(4),
          height: 46,
          marginHorizontal: spacing(4),
          marginBottom: spacing(2),
        },
        searchInput: {
          flex: 1,
          color: colors.text,
          fontFamily: fonts.body,
          fontSize: 15,
        },
        list: { padding: spacing(4), paddingTop: spacing(2), gap: spacing(4) },
        row: { gap: spacing(4) },
        skeletonGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing(4),
          padding: spacing(4),
        },
      }),
    [colors],
  );

  function submitSearch() {
    setSearch(searchInput.trim());
  }

  return (
    <Screen padded={false} maxWidth="wide">
      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          placeholder="Search titles, authors, ISBN…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {query.isLoading ? (
        <View style={styles.skeletonGrid}>
          {Array.from({ length: columns * (isTablet ? 3 : 4) }).map((_, i) => (
            <View key={i} style={{ width: `${100 / columns}%`, flexGrow: 1, maxWidth: 260 }}>
              <BookCardSkeleton />
            </View>
          ))}
        </View>
      ) : query.isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title="Couldn't load the catalog"
          body={(query.error as Error).message}
          actionLabel="Try again"
          onAction={() => query.refetch()}
        />
      ) : (
        <FlatList
          // numColumns cannot change on an existing list instance, so the key
          // forces a remount when the window crosses a breakpoint.
          key={`catalog-${columns}`}
          data={books}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <Animated.View entering={entrance.stagger(index)} style={{ flex: 1 / columns }}>
              <BookCard book={item} onPress={() => router.push(`/book/${item.id}`)} />
            </Animated.View>
          )}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={query.refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={search ? 'No matches' : 'The catalog is empty'}
              body={
                search
                  ? `Nothing matched “${search}”. Try a different title, author, or ISBN.`
                  : 'No titles have been published to this library yet.'
              }
              actionLabel={search ? 'Clear search' : undefined}
              onAction={
                search
                  ? () => {
                      setSearchInput('');
                      setSearch('');
                    }
                  : undefined
              }
            />
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginVertical: spacing(4) }}
              />
            ) : null
          }
        />
      )}
    </Screen>
  );
}
