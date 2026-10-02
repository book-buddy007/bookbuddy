import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@/components/Ionicons';
import { fonts, radius, spacing } from '@/theme';
import { INDIC, SectionHeader } from './primitives';

/** Mirrors reading-modes-section.tsx — 4 tabs swap a device preview. */
type Mode = 'epub' | 'pdf' | 'tts' | 'varta';
const MODES: { id: Mode; label: string; icon: keyof typeof import('@/components/Ionicons').Ionicons.glyphMap; tint: string }[] = [
  { id: 'epub', label: 'EPUB', icon: 'book', tint: INDIC.burnt },
  { id: 'pdf', label: 'PDF', icon: 'document-text', tint: INDIC.red },
  { id: 'tts', label: 'Audiobook', icon: 'headset', tint: INDIC.teal },
  { id: 'varta', label: 'Varta', icon: 'chatbubble-ellipses', tint: INDIC.deepBlue },
];

export function ReadingModes() {
  const [mode, setMode] = useState<Mode>('epub');
  const active = MODES.find((m) => m.id === mode)!;

  return (
    <View style={[rm.section, { backgroundColor: INDIC.cream }]}>
      <SectionHeader
        label="The Reading Experience" labelColor={INDIC.burnt}
        headingLead="Four Ways to Read" headingAccent="One Book"
        sub="Upload once. Every title instantly becomes a reflowable EPUB, a page-accurate PDF, a natural-voice audiobook, and an AI you can talk to."
      />

      {/* Tabs */}
      <View style={rm.tabs}>
        {MODES.map((m) => {
          const on = m.id === mode;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              style={({ pressed }) => [
                rm.tab,
                { backgroundColor: on ? m.tint : 'rgba(255,255,255,0.7)', borderColor: on ? m.tint : 'rgba(42,53,86,0.18)' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Ionicons name={m.icon} size={15} color={on ? '#fff' : INDIC.brown} />
              <Text style={[rm.tabText, { color: on ? '#fff' : INDIC.brown }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Device preview */}
      <View style={rm.device}>
        <View style={rm.chrome}>
          <View style={rm.dots}>
            <View style={[rm.dot, { backgroundColor: '#FFC2C9' }]} />
            <View style={[rm.dot, { backgroundColor: '#FFB547' }]} />
            <View style={[rm.dot, { backgroundColor: '#7FE3A5' }]} />
          </View>
          <View style={[rm.modePill, { backgroundColor: `${active.tint}14` }]}>
            <Ionicons name={active.icon} size={11} color={active.tint} />
            <Text style={[rm.modePillText, { color: active.tint }]}>{active.label} mode</Text>
          </View>
        </View>

        <View style={rm.body}>
          {mode === 'epub' && <EpubPreview />}
          {mode === 'pdf' && <PdfPreview />}
          {mode === 'tts' && <TtsPreview />}
          {mode === 'varta' && <VartaPreview />}
        </View>
      </View>
      <Text style={rm.caption}>
        Switch modes anytime — your highlights, bookmarks, and progress sync across all four.
      </Text>
    </View>
  );
}

function EpubPreview() {
  return (
    <View style={{ gap: spacing(3) }}>
      <View style={rm.epubPage}>
        <Text style={rm.epubTitle}>Heat &amp; Thermodynamics</Text>
        <Text style={rm.epubBody}>
          Heat is a form of energy that flows from a body at higher temperature to one at lower
          temperature. The{' '}
          <Text style={rm.epubHi}>specific heat capacity of water is 4186 J/kg·K</Text>, making it an
          excellent thermal buffer in biological systems.
        </Text>
      </View>
      <View style={rm.epubControls}>
        {[
          { i: 'text' as const, t: 'Font size', on: true },
          { i: 'sunny' as const, t: 'Sepia', on: true },
          { i: 'reorder-three' as const, t: 'Reflowable', on: false },
        ].map((c) => (
          <View key={c.t} style={[rm.epubCtl, c.on ? rm.epubCtlOn : rm.epubCtlOff]}>
            <Ionicons name={c.i} size={13} color={c.on ? INDIC.burnt : INDIC.slate500} />
            <Text style={[rm.epubCtlText, { color: c.on ? INDIC.burnt : INDIC.slate500 }]}>{c.t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PdfPreview() {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={rm.pdfPage}>
        <Text style={rm.pdfNum}>— page 142 —</Text>
        <View style={[rm.line, { width: '100%' }]} />
        <View style={[rm.line, { width: '92%' }]} />
        <View style={[rm.line, rm.lineHi, { width: '100%' }]} />
        <View style={[rm.line, { width: '80%' }]} />
        <View style={rm.pdfFig}><Text style={rm.figText}>Fig 7.3 — Convection currents</Text></View>
        <View style={[rm.line, { width: '100%' }]} />
        <View style={[rm.line, { width: '75%' }]} />
      </View>
      <Text style={rm.pdfCaption}>Pixel-perfect layout — exactly as the publisher printed it.</Text>
    </View>
  );
}

function AnimatedTtsBar({ height, index }: { height: number; index: number }) {
  const scaleY = useSharedValue(0.4);

  React.useEffect(() => {
    scaleY.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 350 + (index % 3) * 80 }),
        withTiming(0.4, { duration: 350 + (index % 3) * 80 }),
      ),
      3, // 3 cycles on reveal
      false,
      () => {
        scaleY.value = withTiming(0.7); // Settle to static waveform
      },
    );
  }, [index, scaleY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 5,
          height: height * 0.7,
          borderRadius: 3,
          backgroundColor: index < 9 ? INDIC.teal : 'rgba(30,58,138,0.2)',
        },
        animatedStyle,
      ]}
    />
  );
}

function TtsPreview() {
  const bars = [30, 55, 40, 70, 95, 60, 80, 45, 65, 90, 50, 75, 35, 60, 85, 40, 70, 55];
  return (
    <View style={{ alignItems: 'center', gap: spacing(5), paddingVertical: spacing(2) }}>
      <View style={rm.ttsCircle}><Ionicons name="headset" size={28} color="#fff" /></View>
      <View style={rm.wave}>
        {bars.map((h, i) => (
          <AnimatedTtsBar key={i} height={h} index={i} />
        ))}
      </View>
      <View style={rm.ttsProgress}>
        <Text style={rm.ttsTime}>2:34</Text>
        <View style={rm.ttsBar}><View style={rm.ttsBarFill} /></View>
        <Text style={rm.ttsTime}>8:12</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing(2) }}>
        <View style={[rm.ttsChip, { backgroundColor: 'rgba(30,58,138,0.1)', borderColor: 'rgba(30,58,138,0.2)' }]}>
          <Ionicons name="speedometer" size={13} color={INDIC.teal} />
          <Text style={[rm.ttsChipText, { color: INDIC.teal }]}>1.25× speed</Text>
        </View>
        <View style={[rm.ttsChip, { backgroundColor: INDIC.slate100, borderColor: INDIC.slate200 }]}>
          <Text style={[rm.ttsChipText, { color: INDIC.slate600 }]}>Natural voice</Text>
        </View>
      </View>
    </View>
  );
}

function VartaPreview() {
  return (
    <View style={{ gap: spacing(3) }}>
      <View style={rm.vUser}><Text style={rm.vUserText}>Why is water's specific heat so high?</Text></View>
      <View style={rm.vAi}>
        <Text style={rm.vAiText}>
          Water's high specific heat (4186 J/kg·K) comes from hydrogen bonding between molecules —
          breaking those bonds absorbs large amounts of energy.
        </Text>
        <View style={rm.vCiteRow}>
          <View style={rm.vCite}><Text style={rm.vCiteText}>“ p. 142, ¶2</Text></View>
          <Text style={rm.vCiteNote}>cited from your textbook</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing(2) }}>
        {[
          { t: 'Explain more', c: INDIC.deepBlue },
          { t: 'Make flashcards', c: INDIC.burnt },
          { t: 'Quiz me', c: INDIC.teal },
        ].map((b) => (
          <View key={b.t} style={[rm.vBtn, { backgroundColor: `${b.c}14`, borderColor: `${b.c}26` }]}>
            <Text style={[rm.vBtnText, { color: b.c }]}>{b.t}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const rm = StyleSheet.create({
  section: { paddingVertical: spacing(9), paddingHorizontal: spacing(5) },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing(2), marginBottom: spacing(6) },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderRadius: radius.full, borderWidth: 2 },
  tabText: { fontFamily: fonts.label, fontSize: 13 },
  device: { backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(220,225,234,0.8)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 6 },
  chrome: { height: 42, borderBottomWidth: 1, borderBottomColor: INDIC.slate100, backgroundColor: INDIC.slate50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(4), gap: spacing(2) },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  modePillText: { fontFamily: fonts.label, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  body: { padding: spacing(5), minHeight: 280, justifyContent: 'center' },
  caption: { fontFamily: fonts.body, fontSize: 13, color: INDIC.slate500, textAlign: 'center', marginTop: spacing(4) },

  epubPage: { backgroundColor: '#F2F4F8', borderRadius: radius.md, borderWidth: 1, borderColor: '#DCE1EA', padding: spacing(4) },
  epubTitle: { fontFamily: fonts.heading, fontSize: 17, color: INDIC.slate800, marginBottom: spacing(3) },
  epubBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 25, color: INDIC.slate700 },
  epubHi: { backgroundColor: '#FFE3A3', color: INDIC.slate900 },
  epubControls: { flexDirection: 'row', gap: spacing(2) },
  epubCtl: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radius.sm, borderWidth: 1 },
  epubCtlOn: { backgroundColor: 'rgba(255,77,0,0.08)', borderColor: 'rgba(255,77,0,0.15)' },
  epubCtlOff: { backgroundColor: INDIC.slate100, borderColor: INDIC.slate200 },
  epubCtlText: { fontFamily: fonts.label, fontSize: 11 },

  pdfPage: { width: '100%', maxWidth: 340, borderRadius: radius.sm, borderWidth: 1, borderColor: INDIC.slate300, backgroundColor: '#fff', padding: spacing(5), gap: spacing(2) },
  pdfNum: { fontFamily: fonts.body, fontSize: 10, color: INDIC.slate400, textAlign: 'center', marginBottom: spacing(1) },
  line: { height: 10, borderRadius: 4, backgroundColor: INDIC.slate200 },
  lineHi: { backgroundColor: '#FFE3A3' },
  pdfFig: { height: 72, borderRadius: radius.sm, backgroundColor: INDIC.slate100, borderWidth: 1, borderColor: INDIC.slate200, alignItems: 'center', justifyContent: 'center', marginVertical: spacing(2) },
  figText: { fontFamily: fonts.body, fontSize: 10, color: INDIC.slate400 },
  pdfCaption: { fontFamily: fonts.body, fontSize: 12, color: INDIC.slate500, textAlign: 'center', marginTop: spacing(3) },

  ttsCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: INDIC.teal, alignItems: 'center', justifyContent: 'center', shadowColor: INDIC.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  wave: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 68 },
  ttsProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  ttsTime: { fontFamily: fonts.body, fontSize: 12, color: INDIC.slate500 },
  ttsBar: { width: 170, height: 6, borderRadius: 3, backgroundColor: INDIC.slate100, overflow: 'hidden' },
  ttsBarFill: { width: '35%', height: '100%', backgroundColor: INDIC.teal, borderRadius: 3 },
  ttsChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderRadius: radius.full, borderWidth: 1 },
  ttsChipText: { fontFamily: fonts.label, fontSize: 12 },

  vUser: { alignSelf: 'flex-end', backgroundColor: INDIC.deepBlue, borderRadius: 16, borderTopRightRadius: 3, padding: spacing(3), maxWidth: '85%' },
  vUserText: { color: '#fff', fontFamily: fonts.body, fontSize: 13 },
  vAi: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: INDIC.slate200, borderRadius: 16, borderTopLeftRadius: 3, padding: spacing(3), maxWidth: '92%' },
  vAiText: { color: INDIC.slate700, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  vCiteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing(2), flexWrap: 'wrap' },
  vCite: { backgroundColor: 'rgba(255,77,0,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  vCiteText: { fontFamily: fonts.label, fontSize: 11, color: INDIC.burnt },
  vCiteNote: { fontFamily: fonts.body, fontSize: 11, color: INDIC.slate400 },
  vBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing(2), borderRadius: radius.sm, borderWidth: 1 },
  vBtnText: { fontFamily: fonts.label, fontSize: 11 },
});
