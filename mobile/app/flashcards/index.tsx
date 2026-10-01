import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { createDeck, getDecks } from '@/api/flashcards';
import { ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import {
  Banner,
  BottomSheet,
  Card,
  Chip,
  EmptyState,
  Screen,
  Skeleton,
} from '@/components/ui';
import { entrance, haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

/**
 * Sanchika — flashcard decks.
 *
 * Deck creation lives in a sheet rather than its own screen: it is two fields,
 * and sending someone to a separate page to type a title is friction for the
 * one action this screen exists to encourage.
 */
export default function FlashcardDecksScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const decksQuery = useQuery({ queryKey: ['flashcard-decks'], queryFn: getDecks });

  const createMutation = useMutation({
    mutationFn: () => createDeck({ title: title.trim(), description: description.trim() || undefined }),
    onSuccess: () => {
      haptics.success();
      setCreating(false);
      setTitle('');
      setDescription('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['flashcard-decks'] });
    },
    onError: (err) => {
      haptics.error();
      setError(err instanceof ApiError ? err.message : 'Could not create the deck.');
    },
  });

  const decks = decksQuery.data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Flashcards' }} />
      <Screen maxWidth="wide">
        {decksQuery.isLoading ? (
          <View style={styles.skeletons}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={84} rounded={radius.lg} />
            ))}
          </View>
        ) : decksQuery.isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            tone="danger"
            title="Couldn't load your decks"
            body={(decksQuery.error as Error).message}
            actionLabel="Try again"
            onAction={() => decksQuery.refetch()}
          />
        ) : (
          <FlatList
            data={decks}
            keyExtractor={(deck) => deck.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={decksQuery.isRefetching}
                onRefresh={decksQuery.refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="albums-outline"
                title="No decks yet"
                body="Make a deck for a subject or a book, then add cards from your highlights."
                actionLabel="Create a deck"
                onAction={() => setCreating(true)}
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={entrance.stagger(index)}>
                <Card onPress={() => router.push(`/flashcards/${item.id}`)} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text style={styles.description} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                  <Chip
                    label={`${item._count?.cards ?? 0} cards`}
                    tone="teal"
                    icon="layers-outline"
                  />
                </Card>
              </Animated.View>
            )}
          />
        )}

        {decks.length > 0 && (
          <Button
            label="New deck"
            icon="add-outline"
            variant="saffron"
            onPress={() => setCreating(true)}
            style={styles.fab}
          />
        )}
      </Screen>

      <BottomSheet visible={creating} onClose={() => setCreating(false)} title="New deck">
        {!!error && <Banner tone="danger" message={error} />}

        <TextField
          label="Title"
          icon="albums-outline"
          value={title}
          onChangeText={setTitle}
          placeholder="Organic Chemistry — Unit 3"
        />
        <TextField
          label="Description (optional)"
          icon="text-outline"
          value={description}
          onChangeText={setDescription}
          placeholder="What this deck covers"
        />

        <Button
          label="Create deck"
          variant="saffron"
          onPress={() => createMutation.mutate()}
          loading={createMutation.isPending}
          disabled={title.trim().length === 0}
        />
      </BottomSheet>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  skeletons: { gap: spacing(3), paddingTop: spacing(4) },
  list: { paddingTop: spacing(4), paddingBottom: spacing(20), gap: spacing(3), flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  rowText: { flex: 1, gap: spacing(0.5) },
  title: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  fab: { position: 'absolute', left: spacing(4), right: spacing(4), bottom: spacing(5) },
});
