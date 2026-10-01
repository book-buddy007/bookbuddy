import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getReadUrl } from '@/api/books';
import { getProgress, syncProgress } from '@/api/reader';
import { decryptReadUrl } from '@/utils/decryptReadUrl';
import { PdfReader } from '@/components/reader/PdfReader';
import { EpubReader } from '@/components/reader/EpubReader';
import { AudiobookPlayer } from '@/components/reader/AudiobookPlayer';
import { StudyToolsSheet } from '@/components/reader/StudyToolsSheet';
import { exportNotes } from '@/api/export';
import type { Annotation } from '@/api/types';
import { haptics } from '@/motion';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing, type ColorTokens } from '@/theme';

export default function NativeReaderScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { id, format = 'PDF', title } = useLocalSearchParams<{
    id: string;
    format: string;
    title?: string;
  }>();

  const activeFormat = (format || 'PDF').toUpperCase();
  const [toolsOpen, setToolsOpen] = useState(false);

  /**
   * Notes are rendered to Markdown server-side, then handed to the OS share
   * sheet — that puts them into whichever notes app or drive the reader already
   * uses, rather than trapping them in a viewer we would have to build.
   */
  async function handleExportNotes(annotations: Annotation[]) {
    if (!id) return;
    try {
      const result = await exportNotes({
        bookId: id,
        bookTitle: title ?? 'Study notes',
        annotations,
      });
      const markdown = result.markdown ?? result.content ?? '';
      if (!markdown) throw new Error('Empty export');

      haptics.success();
      await Share.share({ message: markdown, title: title ?? 'Study notes' });
    } catch {
      haptics.error();
    }
  }

  // Fetch URL and decrypt DRM if needed
  const { data: readContent, isLoading, isError, error } = useQuery({
    queryKey: ['read-url', id, activeFormat],
    queryFn: async () => {
      if (!id) throw new Error('Book ID is required');
      const res = await getReadUrl(id, activeFormat);

      if (res.encryptedUrl) {
        const decrypted = decryptReadUrl(res.encryptedUrl);
        return {
          url: decrypted.url,
          format: decrypted.format || activeFormat,
          expiresAt: decrypted.expiresAt,
        };
      }

      if (res.url) {
        return {
          url: res.url,
          format: res.format || activeFormat,
          expiresAt: res.expiresAt,
        };
      }

      throw new Error('No content URL available for this title.');
    },
    enabled: !!id,
  });

  // Fetch saved reading progress
  const { data: savedProgress } = useQuery({
    queryKey: ['reading-progress', id],
    queryFn: () => getProgress(id!),
    enabled: !!id,
  });

  // Progress sync mutation
  const syncMutation = useMutation({
    mutationFn: (syncData: {
      currentPage?: number;
      totalPagesRead?: number;
      timeSpentSeconds?: number;
      percentComplete?: number;
    }) => syncProgress({ bookId: id!, ...syncData }),
  });

  function handleProgressUpdate(page: number, total: number) {
    if (!id) return;
    const percent = Math.round((page / total) * 100);
    syncMutation.mutate({
      currentPage: page,
      percentComplete: percent,
      totalPagesRead: 1,
    });
  }

  function handleAudioProgressUpdate(positionSec: number, totalSec: number) {
    if (!id) return;
    const percent = Math.round((positionSec / totalSec) * 100);
    syncMutation.mutate({
      timeSpentSeconds: 15,
      percentComplete: percent,
    });
  }

  return (
    <View style={styles.container}>
      {/* Reader Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕ Close</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <Text style={styles.formatBadge}>{activeFormat}</Text>
          <TouchableOpacity
            onPress={() => setToolsOpen(true)}
            style={styles.toolsBtn}
            accessibilityRole="button"
            accessibilityLabel="Study tools"
          >
            <Ionicons name="school-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Reader View */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Decrypting DRM content stream...</Text>
        </View>
      ) : isError || !readContent ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Unable to load reader</Text>
          <Text style={styles.errorText}>
            {(error as Error)?.message || 'Content stream unavailable.'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Return to Book</Text>
          </TouchableOpacity>
        </View>
      ) : activeFormat === 'PDF' ? (
        <PdfReader
          url={readContent.url}
          title={title}
          onProgress={handleProgressUpdate}
        />
      ) : activeFormat === 'EPUB' ? (
        <EpubReader
          url={readContent.url}
          title={title}
          onProgress={handleProgressUpdate}
        />
      ) : activeFormat === 'AUDIOBOOK' ? (
        <AudiobookPlayer
          url={readContent.url}
          title={title}
          onProgress={handleAudioProgressUpdate}
        />
      ) : (
        <PdfReader
          url={readContent.url}
          title={title}
          onProgress={handleProgressUpdate}
        />
      )}

      {id ? (
        <StudyToolsSheet
          visible={toolsOpen}
          onClose={() => setToolsOpen(false)}
          bookId={id}
          bookTitle={title}
          onOpenVarta={() =>
            router.push({ pathname: '/chat/[id]', params: { id, title: title ?? '' } })
          }
          onExportNotes={handleExportNotes}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  toolsBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  backBtn: { paddingVertical: spacing(1) },
  backBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  formatBadge: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(0.5),
    borderRadius: radius.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(6),
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: spacing(3),
  },
  errorTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing(2) },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: spacing(4) },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2.5),
    borderRadius: radius.sm,
  },
  retryBtnText: { color: colors.bg, fontSize: 14, fontWeight: '700' },
});
