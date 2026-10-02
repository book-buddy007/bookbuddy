import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing, type ColorTokens } from '@/theme';

interface EpubReaderProps {
  url: string;
  title?: string;
  onProgress?: (chapter: number, totalChapters: number) => void;
}

type ThemeMode = 'dark' | 'sepia' | 'light';

export function EpubReader({ url, title, onProgress }: EpubReaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [fontSize, setFontSize] = useState(16);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [currentChapter, setCurrentChapter] = useState(1);
  const totalChapters = 12;

  const themeStyles = {
    dark: { bg: '#0A0F24', text: '#F2F4F8', card: '#18213C', border: '#2a3556' },
    sepia: { bg: '#F2F4F8', text: '#4A5470', card: '#FFE3A3', border: '#C5CCDA' },
    light: { bg: '#FFFFFF', text: '#0A0F24', card: '#E6EAF1', border: '#DCE1EA' },
  }[themeMode];

  function prevChapter() {
    if (currentChapter > 1) {
      const next = currentChapter - 1;
      setCurrentChapter(next);
      onProgress?.(next, totalChapters);
    }
  }

  function nextChapter() {
    if (currentChapter < totalChapters) {
      const next = currentChapter + 1;
      setCurrentChapter(next);
      onProgress?.(next, totalChapters);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
      {/* Control Bar */}
      <View style={[styles.header, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
        <Text style={[styles.title, { color: themeStyles.text }]} numberOfLines={1}>
          {title || 'EPUB Publication'}
        </Text>

        <View style={styles.controls}>
          {/* Font Controls */}
          <TouchableOpacity
            onPress={() => setFontSize(Math.max(12, fontSize - 2))}
            style={[styles.btn, { borderColor: themeStyles.border }]}
          >
            <Text style={[styles.btnText, { color: themeStyles.text }]}>A-</Text>
          </TouchableOpacity>

          <Text style={[styles.fontSizeText, { color: themeStyles.text }]}>{fontSize}</Text>

          <TouchableOpacity
            onPress={() => setFontSize(Math.min(26, fontSize + 2))}
            style={[styles.btn, { borderColor: themeStyles.border }]}
          >
            <Text style={[styles.btnText, { color: themeStyles.text }]}>A+</Text>
          </TouchableOpacity>

          {/* Theme Toggles */}
          <TouchableOpacity
            onPress={() => setThemeMode('dark')}
            style={[styles.themeDot, { backgroundColor: '#0A0F24' }, themeMode === 'dark' && styles.activeDot]}
          />
          <TouchableOpacity
            onPress={() => setThemeMode('sepia')}
            style={[styles.themeDot, { backgroundColor: '#F2F4F8' }, themeMode === 'sepia' && styles.activeDot]}
          />
          <TouchableOpacity
            onPress={() => setThemeMode('light')}
            style={[styles.themeDot, { backgroundColor: '#FFFFFF' }, themeMode === 'light' && styles.activeDot]}
          />
        </View>
      </View>

      {/* Chapter Reader Container */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Text style={[styles.chapterTitle, { color: colors.primary }]}>
          Chapter {currentChapter}: Principles of Digital Learning
        </Text>

        <Text style={[styles.paragraph, { color: themeStyles.text, fontSize, lineHeight: fontSize * 1.6 }]}>
          Digital learning ecosystem integrates content delivery, user tracking, and interactive assessment into a unified experience. Modern electronic publications (EPUB) allow reflowable typography, accessible layout adjustments, and rich structural navigation.
        </Text>

        <Text style={[styles.paragraph, { color: themeStyles.text, fontSize, lineHeight: fontSize * 1.6 }]}>
          Presigned secure URLs ensure that copyrighted media files are delivered directly from encrypted cloud object storage directly into the client application.
        </Text>
      </ScrollView>

      {/* Footer Navigation */}
      <View style={[styles.footer, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
        <TouchableOpacity
          onPress={prevChapter}
          disabled={currentChapter === 1}
          style={[styles.navBtn, currentChapter === 1 && styles.disabledBtn]}
        >
          <Text style={styles.navBtnText}>← Prev Chapter</Text>
        </TouchableOpacity>

        <Text style={[styles.chapterIndicator, { color: themeStyles.text }]}>
          {currentChapter} of {totalChapters}
        </Text>

        <TouchableOpacity
          onPress={nextChapter}
          disabled={currentChapter === totalChapters}
          style={[styles.navBtn, currentChapter === totalChapters && styles.disabledBtn]}
        >
          <Text style={styles.navBtnText}>Next Chapter →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
  },
  title: { fontSize: 14, fontWeight: '700', flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  btn: {
    borderWidth: 1,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.sm,
  },
  btnText: { fontSize: 12, fontWeight: '700' },
  fontSizeText: { fontSize: 12, fontWeight: '600' },
  themeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8E9AB8',
  },
  activeDot: { borderWidth: 2, borderColor: colors.primary },
  body: { flex: 1 },
  bodyContent: { padding: spacing(5) },
  chapterTitle: { fontSize: 20, fontWeight: '800', marginBottom: spacing(4) },
  paragraph: { marginBottom: spacing(4) },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderTopWidth: 1,
  },
  navBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.sm,
  },
  disabledBtn: { opacity: 0.4 },
  navBtnText: { color: '#0A0F24', fontSize: 13, fontWeight: '700' },
  chapterIndicator: { fontSize: 13, fontWeight: '600' },
});
