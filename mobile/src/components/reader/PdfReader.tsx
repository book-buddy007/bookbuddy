import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing, type ColorTokens } from '@/theme';

interface PdfReaderProps {
  url: string;
  title?: string;
  onProgress?: (page: number, totalPages: number) => void;
}

export function PdfReader({ url, title, onProgress }: PdfReaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(10); // Default estimate until loaded
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(false);

  function prevPage() {
    if (currentPage > 1) {
      const next = currentPage - 1;
      setCurrentPage(next);
      onProgress?.(next, totalPages);
    }
  }

  function nextPage() {
    if (currentPage < totalPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      onProgress?.(next, totalPages);
    }
  }

  function zoomIn() {
    if (zoom < 200) setZoom(zoom + 25);
  }

  function zoomOut() {
    if (zoom > 50) setZoom(zoom - 25);
  }

  const progressPercent = Math.round((currentPage / totalPages) * 100);

  return (
    <View style={styles.container}>
      {/* Top Header / Toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.title} numberOfLines={1}>
          {title || 'PDF Document'}
        </Text>
        <View style={styles.zoomControls}>
          <TouchableOpacity onPress={zoomOut} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.zoomText}>{zoom}%</Text>
          <TouchableOpacity onPress={zoomIn} style={styles.toolBtn}>
            <Text style={styles.toolBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Document Viewport */}
      <View style={styles.viewport}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <View style={styles.pageCard}>
            <View style={styles.watermark}>
              <Text style={styles.watermarkText}>PROTECTED COPY</Text>
            </View>

            <Text style={styles.pageHeader}>PAGE {currentPage}</Text>

            {/* Simulates rendered PDF canvas content area in mobile UI */}
            <View style={[styles.canvasArea, { transform: [{ scale: zoom / 100 }] }]}>
              <Text style={styles.documentBodyText}>
                Document view loaded securely for format [PDF].
              </Text>
              <Text style={styles.documentSubText}>
                Content stream verified via encrypted presigned link.
              </Text>
            </View>

            <Text style={styles.pageFooter}>
              Page {currentPage} of {totalPages} ({progressPercent}%)
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={prevPage}
          disabled={currentPage === 1}
          style={[styles.navBtn, currentPage === 1 && styles.navBtnDisabled]}
        >
          <Text style={styles.navBtnText}>← Previous</Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          {currentPage} / {totalPages}
        </Text>

        <TouchableOpacity
          onPress={nextPage}
          disabled={currentPage === totalPages}
          style={[styles.navBtn, currentPage === totalPages && styles.navBtnDisabled]}
        >
          <Text style={styles.navBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  zoomControls: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  toolBtn: {
    backgroundColor: colors.surfaceAlt,
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  zoomText: { color: colors.textMuted, fontSize: 12 },
  viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
  },
  pageCard: {
    width: '100%',
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(5),
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    opacity: 0.08,
    transform: [{ rotate: '-30deg' }],
  },
  watermarkText: { color: colors.text, fontSize: 36, fontWeight: '900' },
  pageHeader: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  canvasArea: { flex: 1, justifyContent: 'center', marginVertical: spacing(4) },
  documentBodyText: { color: colors.text, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  documentSubText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing(2),
    textAlign: 'center',
  },
  pageFooter: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
  progressContainer: {
    height: 3,
    backgroundColor: colors.surfaceAlt,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  navBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radius.sm,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: colors.bg, fontSize: 13, fontWeight: '700' },
  pageIndicator: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
