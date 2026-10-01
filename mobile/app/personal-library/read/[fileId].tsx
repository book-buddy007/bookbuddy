import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getFileReadUrl, syncFileProgress } from '@/api/personalLibrary';
import { EpubReader } from '@/components/reader/EpubReader';
import { PdfReader } from '@/components/reader/PdfReader';
import { EmptyState } from '@/components/ui';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, spacing, type ColorTokens } from '@/theme';

/**
 * Reader for a personal upload.
 *
 * Separate from `reader/[id]` because a personal file is not a catalogue book:
 * the URL comes from `/personal-library/files/:id/read-url` and progress syncs
 * to the personal-library endpoint, not `/reader/sync`. The viewer components
 * themselves are shared, so the reading experience stays identical.
 */
export default function PersonalFileReaderScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { fileId, title, format } = useLocalSearchParams<{
    fileId: string;
    title?: string;
    format?: string;
  }>();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const urlQuery = useQuery({
    queryKey: ['personal-read-url', fileId],
    queryFn: () => getFileReadUrl(fileId!),
    enabled: !!fileId,
  });

  const progressMutation = useMutation({
    mutationFn: (input: { currentPage: number; percentComplete: number }) =>
      syncFileProgress(fileId!, input),
  });

  function handleProgress(page: number, total: number) {
    if (!fileId || total <= 0) return;
    progressMutation.mutate({
      currentPage: page,
      percentComplete: Math.round((page / total) * 100),
    });
  }

  const resolvedFormat = (urlQuery.data?.format ?? format ?? 'pdf').toLowerCase();

  return (
    <>
      <Stack.Screen options={{ title: title ?? 'My file' }} />
      <View style={styles.container}>
        {urlQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loading}>Opening your file…</Text>
          </View>
        ) : urlQuery.isError || !urlQuery.data?.url ? (
          <EmptyState
            icon="alert-circle-outline"
            tone="danger"
            title="Couldn't open this file"
            body={
              (urlQuery.error as Error)?.message ??
              'The download link could not be created. Try again in a moment.'
            }
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        ) : resolvedFormat === 'epub' ? (
          <EpubReader url={urlQuery.data.url} title={title} onProgress={handleProgress} />
        ) : (
          <PdfReader url={urlQuery.data.url} title={title} onProgress={handleProgress} />
        )}
      </View>
    </>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing(3) },
  loading: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
