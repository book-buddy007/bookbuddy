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

interface Track {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'ai';
  duration: number;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  durationSeconds: number;
  tracks: Track[];
}

interface AudiobookPlayerProps {
  url: string;
  title?: string;
  author?: string;
  chapters?: Chapter[];
  onProgress?: (positionSec: number, totalSec: number) => void;
}

const DEFAULT_CHAPTERS: Chapter[] = [
  {
    id: 'ch-1',
    number: 1,
    title: 'Introduction & Core Concepts',
    durationSeconds: 870,
    tracks: [
      { id: 'tr-1m', name: 'Male Voice (English US)', gender: 'male', duration: 870 },
      { id: 'tr-1f', name: 'Female Voice (English UK)', gender: 'female', duration: 870 },
    ],
  },
  {
    id: 'ch-2',
    number: 2,
    title: 'Matter in Our Surroundings',
    durationSeconds: 1240,
    tracks: [
      { id: 'tr-2m', name: 'Male Voice (English US)', gender: 'male', duration: 1240 },
      { id: 'tr-2f', name: 'Female Voice (English UK)', gender: 'female', duration: 1240 },
    ],
  },
  {
    id: 'ch-3',
    number: 3,
    title: 'Atoms and Molecules',
    durationSeconds: 1510,
    tracks: [
      { id: 'tr-3m', name: 'Male Voice (English US)', gender: 'male', duration: 1510 },
      { id: 'tr-3f', name: 'Female Voice (English UK)', gender: 'female', duration: 1510 },
    ],
  },
];

export function AudiobookPlayer({
  url,
  title = 'Audiobook',
  author = 'Author',
  chapters = DEFAULT_CHAPTERS,
  onProgress,
}: AudiobookPlayerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'ai'>('female');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [positionSec, setPositionSec] = useState<number>(125);

  const currentChapter = chapters[currentChapterIndex] || chapters[0];
  const totalSec = currentChapter.durationSeconds;
  const progressPercent = Math.round((positionSec / totalSec) * 100);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function togglePlay() {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
  }

  function skipSec(delta: number) {
    const newPos = Math.max(0, Math.min(totalSec, positionSec + delta));
    setPositionSec(newPos);
    onProgress?.(newPos, totalSec);
  }

  function cycleSpeed() {
    const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
    const idx = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(idx + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
  }

  return (
    <View style={styles.container}>
      {/* Player Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.headerAuthor}>{author}</Text>
      </View>

      {/* Main Artwork / Visualiser Area */}
      <View style={styles.visualizerArea}>
        <View style={styles.discOuter}>
          <View style={styles.discInner}>
            <Text style={styles.discIcon}>{isPlaying ? '🔊' : '🎧'}</Text>
          </View>
        </View>

        <Text style={styles.chapterTitle}>
          Ch {currentChapter.number}: {currentChapter.title}
        </Text>
      </View>

      {/* Track & Gender Voice Switcher */}
      <View style={styles.voiceSwitcher}>
        <Text style={styles.sectionLabel}>VOICE NARRATION</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            onPress={() => setSelectedGender('female')}
            style={[styles.genderBtn, selectedGender === 'female' && styles.genderBtnActive]}
          >
            <Text style={[styles.genderText, selectedGender === 'female' && styles.genderTextActive]}>
              Female Voice 🎙️
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedGender('male')}
            style={[styles.genderBtn, selectedGender === 'male' && styles.genderBtnActive]}
          >
            <Text style={[styles.genderText, selectedGender === 'male' && styles.genderTextActive]}>
              Male Voice 🎙️
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrubber & Progress Bar */}
      <View style={styles.scrubberSection}>
        <View style={styles.trackBar}>
          <View style={[styles.fillBar, { width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(positionSec)}</Text>
          <Text style={styles.timeText}>-{formatTime(totalSec - positionSec)}</Text>
        </View>
      </View>

      {/* Playback Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={cycleSpeed} style={styles.speedBtn}>
          <Text style={styles.speedBtnText}>{playbackSpeed}x</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => skipSec(-15)} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>↺ 15s</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlay} style={styles.playPauseBtn}>
          <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => skipSec(15)} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>15s ↻</Text>
        </TouchableOpacity>
      </View>

      {/* Chapter Breakdown List */}
      <View style={styles.chapterSection}>
        <Text style={styles.sectionLabel}>CHAPTERS ({chapters.length})</Text>
        <ScrollView style={styles.chapterList}>
          {chapters.map((ch, idx) => (
            <TouchableOpacity
              key={ch.id}
              onPress={() => {
                setCurrentChapterIndex(idx);
                setPositionSec(0);
              }}
              style={[styles.chapterItem, idx === currentChapterIndex && styles.chapterItemActive]}
            >
              <Text style={[styles.chapterNumber, idx === currentChapterIndex && styles.textActive]}>
                {ch.number}
              </Text>
              <View style={styles.chapterDetails}>
                <Text style={[styles.chapterName, idx === currentChapterIndex && styles.textActive]}>
                  {ch.title}
                </Text>
                <Text style={styles.chapterMeta}>{formatTime(ch.durationSeconds)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  headerAuthor: { color: colors.textMuted, fontSize: 13, marginTop: spacing(0.5) },
  visualizerArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(6),
  },
  discOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(4),
  },
  discInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discIcon: { fontSize: 22 },
  chapterTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  voiceSwitcher: { paddingHorizontal: spacing(4), marginBottom: spacing(4) },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: spacing(2) },
  genderRow: { flexDirection: 'row', gap: spacing(3) },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing(2.5),
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  genderTextActive: { color: colors.bg, fontWeight: '800' },
  scrubberSection: { paddingHorizontal: spacing(4), marginBottom: spacing(4) },
  trackBar: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  fillBar: { height: '100%', backgroundColor: colors.primary },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing(2) },
  timeText: { color: colors.textMuted, fontSize: 12 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing(4),
    marginBottom: spacing(5),
  },
  speedBtn: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.sm,
  },
  speedBtnText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  skipBtn: { padding: spacing(2) },
  skipBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  playPauseBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseIcon: { color: colors.bg, fontSize: 24 },
  chapterSection: { flex: 1, paddingHorizontal: spacing(4) },
  chapterList: { flex: 1 },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  chapterItemActive: { backgroundColor: colors.surface },
  chapterNumber: { color: colors.textMuted, fontSize: 14, fontWeight: '800', width: 30 },
  chapterDetails: { flex: 1 },
  chapterName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  chapterMeta: { color: colors.textMuted, fontSize: 12, marginTop: spacing(0.5) },
  textActive: { color: colors.primary, fontWeight: '800' },
});
