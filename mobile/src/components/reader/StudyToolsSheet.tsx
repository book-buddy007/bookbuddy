import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteAnnotation, getAnnotations } from '@/api/annotations';
import { searchBook } from '@/api/reader';
import type { Annotation } from '@/api/types';
import { Banner, BottomSheet, Chip, PressableScale, SegmentedControl } from '@/components/ui';
import { Button } from '@/components/Button';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing, type ColorTokens } from '@/theme';

type Tool = 'search' | 'notes';

const TOOLS = [
  { value: 'search' as const, label: 'Search' },
  { value: 'notes' as const, label: 'Notes' },
];

export interface StudyToolsSheetProps {
  visible: boolean;
  onClose: () => void;
  bookId: string;
  bookTitle?: string;
  /** Jump the reader to a page from a search hit. */
  onGoToPage?: (page: number) => void;
  onOpenVarta?: () => void;
  onExportNotes?: (annotations: Annotation[]) => void;
}

/**
 * The reader's study drawer: search inside the book, and review highlights and
 * notes without leaving the page.
 *
 * Both live in one sheet because they answer the same question — "where was
 * that bit?" — and splitting them across separate screens would mean leaving
 * the reader to look something up.
 */
export function StudyToolsSheet({
  visible,
  onClose,
  bookId,
  bookTitle,
  onGoToPage,
  onOpenVarta,
  onExportNotes,
}: StudyToolsSheetProps) {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tool, setTool] = useState<Tool>('search');
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');

  const searchQuery = useQuery({
    queryKey: ['book-search', bookId, submitted],
    queryFn: () => searchBook(bookId, submitted),
    enabled: visible && tool === 'search' && submitted.length > 1,
  });

  const annotationsQuery = useQuery({
    queryKey: ['annotations', bookId],
    queryFn: () => getAnnotations(bookId),
    enabled: visible && tool === 'notes',
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAnnotation(id),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['annotations', bookId] });
    },
    onError: () => haptics.error(),
  });

  const annotations = annotationsQuery.data ?? [];

  return (
    <BottomSheet visible={visible} onClose={onClose} title={bookTitle ?? 'Study tools'}>
      <SegmentedControl options={TOOLS} value={tool} onChange={setTool} />

      {tool === 'search' ? (
        <View style={styles.body}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={term}
              onChangeText={setTerm}
              onSubmitEditing={() => setSubmitted(term.trim())}
              returnKeyType="search"
              autoFocus
              placeholder="Find a phrase in this book…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>

          {searchQuery.isFetching ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : submitted.length > 1 && (searchQuery.data?.length ?? 0) === 0 ? (
            <Banner tone="info" message={`No matches for “${submitted}” in this book.`} />
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {(searchQuery.data ?? []).map((hit, index) => {
                const page = hit.pageNumber ?? hit.page;
                return (
                  <PressableScale
                    key={`${page}-${index}`}
                    scaleTo={0.99}
                    style={styles.hit}
                    onPress={() => {
                      if (page && onGoToPage) {
                        onGoToPage(page);
                        onClose();
                      }
                    }}
                  >
                    {page ? <Chip label={`Page ${page}`} tone="teal" /> : null}
                    <Text style={styles.hitText} numberOfLines={3}>
                      {hit.snippet ?? hit.content ?? ''}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : (
        <View style={styles.body}>
          {annotationsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : annotations.length === 0 ? (
            <Banner
              tone="info"
              title="No notes yet"
              message="Highlight a passage while reading and it will collect here, ready to export as study notes."
            />
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {annotations.map((item) => (
                <View key={item.id} style={styles.note}>
                  <View style={styles.noteHead}>
                    <Chip
                      label={item.type}
                      tone={item.type === 'highlight' ? 'gold' : 'teal'}
                    />
                    {item.position?.page ? (
                      <Text style={styles.notePage}>p.{item.position.page}</Text>
                    ) : null}
                    <View style={{ flex: 1 }} />
                    <PressableScale
                      haptic="none"
                      onPress={() => deleteMutation.mutate(item.id)}
                      accessibilityLabel="Delete note"
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </PressableScale>
                  </View>
                  <Text style={styles.noteText}>{item.content}</Text>
                  {item.user?.name ? (
                    <Text style={styles.noteAuthor}>Shared by {item.user.name}</Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}

          {annotations.length > 0 && onExportNotes ? (
            <Button
              label="Export study notes"
              icon="download-outline"
              variant="ghost"
              onPress={() => onExportNotes(annotations)}
              style={{ marginTop: spacing(3) }}
            />
          ) : null}
        </View>
      )}

      {onOpenVarta ? (
        <Button
          label="Ask Varta about this book"
          icon="sparkles-outline"
          variant="saffron"
          onPress={() => {
            onClose();
            onOpenVarta();
          }}
          style={{ marginTop: spacing(4) }}
        />
      ) : null}
    </BottomSheet>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  body: { marginTop: spacing(4) },
  center: { paddingVertical: spacing(8), alignItems: 'center' },
  scroll: { maxHeight: 300 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2.5),
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(3.5),
    height: 44,
    marginBottom: spacing(3),
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  hit: {
    paddingVertical: spacing(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing(1.5),
  },
  hitText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  note: {
    paddingVertical: spacing(3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing(2),
  },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  notePage: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: colors.textMuted,
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.text,
  },
  noteAuthor: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
