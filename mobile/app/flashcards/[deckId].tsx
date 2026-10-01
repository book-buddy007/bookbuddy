import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getCardsForReview, submitReview } from '@/api/flashcards';
import { Button } from '@/components/Button';
import { Card, EmptyState, PressableScale, Screen, Skeleton } from '@/components/ui';
import { haptics, timing } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

/**
 * SM-2 recall grades, phrased the way a reader thinks about it.
 *
 * The API takes 0–5; asking someone mid-revision to pick a number on a scale
 * they have not been told the meaning of is the fastest way to get noise, so
 * the four buttons carry the meaning and the number stays internal.
 */
const GRADES = [
  { quality: 1, label: 'Again', tone: 'danger' as const },
  { quality: 3, label: 'Hard', tone: 'warning' as const },
  { quality: 4, label: 'Good', tone: 'teal' as const },
  { quality: 5, label: 'Easy', tone: 'success' as const },
];

export default function FlashcardReviewScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const cardsQuery = useQuery({
    queryKey: ['flashcard-review', deckId],
    queryFn: () => getCardsForReview(deckId!),
    enabled: !!deckId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ cardId, quality }: { cardId: string; quality: number }) =>
      submitReview(cardId, quality),
  });

  const cards = cardsQuery.data ?? [];
  const card = cards[index];
  const done = !cardsQuery.isLoading && (cards.length === 0 || index >= cards.length);

  function grade(quality: number) {
    if (!card) return;
    haptics.tap();
    reviewMutation.mutate({ cardId: card.id, quality });
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Review' }} />
      <Screen maxWidth="prose">
        {cardsQuery.isLoading ? (
          <View style={{ paddingTop: spacing(6), gap: spacing(4) }}>
            <Skeleton height={220} rounded={radius.lg} />
            <Skeleton height={48} rounded={radius.md} />
          </View>
        ) : done ? (
          <EmptyState
            icon="checkmark-done-outline"
            title={cards.length === 0 ? 'Nothing due right now' : 'Deck complete'}
            body={
              cards.length === 0
                ? 'Cards reappear here when they are next due for review.'
                : `You reviewed ${cards.length} card${cards.length === 1 ? '' : 's'}. Come back when the next batch is due.`
            }
            actionLabel="Back to decks"
            onAction={() => router.back()}
          />
        ) : (
          <View style={styles.wrap}>
            <Text style={styles.counter}>
              {index + 1} of {cards.length}
            </Text>

            <PressableScale
              scaleTo={0.995}
              onPress={() => setRevealed((r) => !r)}
              style={styles.cardWrap}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Show question' : 'Reveal answer'}
            >
              <Card style={styles.card}>
                <Text style={styles.face}>{card.frontContent}</Text>

                {revealed ? (
                  <Animated.View entering={FadeIn.duration(timing.fast.duration)}>
                    <View style={styles.divider} />
                    <Text style={styles.back}>{card.backContent}</Text>
                  </Animated.View>
                ) : (
                  <Text style={styles.hint}>Tap to reveal</Text>
                )}
              </Card>
            </PressableScale>

            {revealed ? (
              <View style={styles.grades}>
                {GRADES.map((g) => (
                  <Button
                    key={g.quality}
                    label={g.label}
                    variant={g.quality === 1 ? 'danger' : g.quality === 5 ? 'saffron' : 'ghost'}
                    onPress={() => grade(g.quality)}
                    style={styles.gradeBtn}
                    textStyle={{ fontSize: 14 }}
                  />
                ))}
              </View>
            ) : (
              <Button
                label="Reveal answer"
                icon="eye-outline"
                variant="saffron"
                onPress={() => {
                  haptics.select();
                  setRevealed(true);
                }}
              />
            )}
          </View>
        )}
      </Screen>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  wrap: { flex: 1, paddingTop: spacing(4), gap: spacing(4) },
  counter: {
    fontFamily: fonts.label,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cardWrap: { flex: 1 },
  card: { flex: 1, justifyContent: 'center', gap: spacing(3) },
  face: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing(4),
  },
  back: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing(4),
  },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5) },
  gradeBtn: { flexGrow: 1, flexBasis: '46%', height: 46 },
});
