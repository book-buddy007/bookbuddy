import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { lookupWord, saveVocabulary } from '@/api/dictionary';
import { Banner, BottomSheet, Chip } from '@/components/ui';
import { Button } from '@/components/Button';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, spacing, type ColorTokens } from '@/theme';

export interface WordLookupSheetProps {
  word: string | null;
  bookId?: string;
  onClose: () => void;
}

/**
 * Tap-to-define. One lookup call returns definition, Hindi translation and a
 * Wikipedia extract together, so the sheet fills in a single round trip rather
 * than popping in three times.
 */
export function WordLookupSheet({ word, bookId, onClose }: WordLookupSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [saved, setSaved] = useState(false);

  const query = useQuery({
    queryKey: ['dictionary', word],
    queryFn: () => lookupWord(word!),
    enabled: !!word,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveVocabulary({
        word: word!,
        bookId,
        definition: query.data?.definition ?? undefined,
      }),
    onSuccess: () => {
      haptics.success();
      setSaved(true);
    },
    onError: () => haptics.error(),
  });

  const entry = query.data;

  return (
    <BottomSheet visible={!!word} onClose={onClose} title={word ?? ''}>
      {query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !entry ? (
        <Banner
          tone="warning"
          message={`No dictionary entry found for “${word}”.`}
        />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.metaRow}>
            {entry.partOfSpeech ? <Chip label={entry.partOfSpeech} tone="teal" /> : null}
            {entry.pronunciation ? (
              <Text style={styles.pronunciation}>{entry.pronunciation}</Text>
            ) : null}
          </View>

          {entry.definition ? (
            <Section title="Definition" body={entry.definition} styles={styles} />
          ) : null}

          {entry.hindiTranslation ? (
            <Section title="हिन्दी" body={entry.hindiTranslation} styles={styles} />
          ) : null}

          {entry.example ? (
            <Section title="Example" body={entry.example} italic styles={styles} />
          ) : null}

          {entry.wikiExtract ? (
            <Section title="Background" body={entry.wikiExtract} styles={styles} />
          ) : null}
        </ScrollView>
      )}

      {entry ? (
        <Button
          label={saved ? 'Saved to word list' : 'Save to word list'}
          icon={saved ? 'checkmark-outline' : 'bookmark-outline'}
          variant={saved ? 'ghost' : 'saffron'}
          disabled={saved}
          loading={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
          style={{ marginTop: spacing(4) }}
        />
      ) : null}
    </BottomSheet>
  );
}

function Section({
  title,
  body,
  italic,
  styles,
}: {
  title: string;
  body: string;
  italic?: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={[styles.sectionBody, italic && styles.italic]}>{body}</Text>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  center: { paddingVertical: spacing(8), alignItems: 'center' },
  scroll: { maxHeight: 360 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    marginBottom: spacing(3),
  },
  pronunciation: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  section: { marginBottom: spacing(4) },
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing(1.5),
  },
  sectionBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  italic: { fontStyle: 'italic' },
});
