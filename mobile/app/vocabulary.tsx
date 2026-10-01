import React, { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { getVocabulary } from '@/api/dictionary';
import { Card, EmptyState, Screen, Skeleton } from '@/components/ui';
import { entrance } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

/** Words saved from the reader's tap-to-define sheet. */
export default function VocabularyScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const query = useQuery({ queryKey: ['vocabulary'], queryFn: () => getVocabulary() });

  return (
    <>
      <Stack.Screen options={{ title: 'Word list' }} />
      <Screen maxWidth="prose">
        {query.isLoading ? (
          <View style={styles.skeletons}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={68} rounded={radius.lg} />
            ))}
          </View>
        ) : query.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            tone="danger"
            title="Couldn't load your word list"
            body={(query.error as Error).message}
            actionLabel="Try again"
            onAction={() => query.refetch()}
          />
        ) : (
          <FlatList
            data={query.data ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={query.refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="language-outline"
                title="No saved words yet"
                body="Tap a word while reading to look it up, then save it here to revisit later."
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={entrance.stagger(index)}>
                <Card style={styles.row}>
                  <Text style={styles.word}>{item.word}</Text>
                  {item.definition ? (
                    <Text style={styles.definition} numberOfLines={3}>
                      {item.definition}
                    </Text>
                  ) : null}
                  {item.context ? (
                    <Text style={styles.context} numberOfLines={2}>
                      “{item.context}”
                    </Text>
                  ) : null}
                </Card>
              </Animated.View>
            )}
          />
        )}
      </Screen>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  skeletons: { gap: spacing(3), paddingTop: spacing(4) },
  list: { paddingTop: spacing(4), paddingBottom: spacing(8), gap: spacing(3), flexGrow: 1 },
  row: { gap: spacing(1.5) },
  word: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  definition: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  context: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
});
