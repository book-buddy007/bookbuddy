import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { fonts, radius, spacing } from '@/theme';
import { INDIC } from './primitives';

/** Mirrors deep-dive-section.tsx — Student block + Admin/Teacher block. */

const STUDENT_ITEMS = [
  { icon: 'color-wand' as const, title: 'Distraction-free Reading', desc: 'Clean interface exactly respecting publisher layouts.' },
  { icon: 'chatbubble-ellipses' as const, title: 'Chat with Varta', desc: 'Select a paragraph and ask Varta for an instant, citation-backed explanation.' },
  { icon: 'bookmark' as const, title: 'Sanchika Smart Notebook', desc: 'All your highlights, flashcards, and AI explanations collected in one evolving archive.' },
  { icon: 'headset' as const, title: 'Listen with Text-to-Speech', desc: 'Natural voice narration for every book. Listen on the bus, study at the desk.' },
];

const ADMIN_ITEMS = [
  { icon: 'people' as const, title: 'Assign Books to Batches', desc: 'Instantly distribute required reading to specific semesters.' },
  { icon: 'alert-circle' as const, title: 'Struggling Chapter Heatmaps', desc: 'Identify the exact pages where students spend the most time.' },
  { icon: 'bar-chart' as const, title: 'Track Varta Question Volume', desc: 'See what topics are so confusing they require the Varta engine.' },
];

const HEATMAP = [
  { ch: 'Ch 1: Basics', pct: 12, color: INDIC.slate300, hot: false },
  { ch: 'Ch 3: Conduction', pct: 34, color: 'rgba(30,58,138,0.5)', hot: false },
  { ch: 'Ch 7: Thermodynamics', pct: 89, color: INDIC.teal, hot: true },
  { ch: 'Ch 9: Radiation', pct: 18, color: INDIC.slate300, hot: false },
  { ch: 'Ch 12: Applications', pct: 45, color: 'rgba(30,58,138,0.4)', hot: false },
];

export function DeepDive() {
  return (
    <View style={[dd.section, { backgroundColor: INDIC.slate50 }]}>
      {/* ── Student block ── */}
      <View style={dd.block}>
        <View style={[dd.badge, { borderColor: 'rgba(30,58,138,0.2)' }]}>
          <View style={dd.pingDot} />
          <Text style={[dd.badgeText, { color: INDIC.teal }]}>Student Experience</Text>
        </View>
        <Text style={dd.heading}>
          A distraction-free reader that <Text style={{ color: INDIC.burnt }}>teaches back.</Text>
        </Text>
        <Text style={dd.para}>
          Why leave the textbook to search for answers? With Book Buddy, the book itself becomes the
          tutor. Highlight, listen, and chat directly with the context of the page.
        </Text>
        <FeatureList items={STUDENT_ITEMS} tint={INDIC.teal} />

        {/* Reader storyboard mock */}
        <View style={dd.mock}>
          <View style={dd.readerTabs}>
            {[
              { i: 'book' as const, t: 'Read', on: true },
              { i: 'headset' as const, t: 'Listen', on: false },
              { i: 'chatbubble-ellipses' as const, t: 'Ask Varta', on: false },
              { i: 'bookmark' as const, t: 'Sanchika', on: false },
            ].map((tab) => (
              <View key={tab.t} style={[dd.readerTab, tab.on && dd.readerTabOn]}>
                <Ionicons name={tab.i} size={11} color={tab.on ? INDIC.burnt : INDIC.slate500} />
                <Text style={[dd.readerTabText, { color: tab.on ? INDIC.burnt : INDIC.slate500 }]}>{tab.t}</Text>
              </View>
            ))}
          </View>
          <View style={dd.readerBody}>
            <Text style={dd.readerChapter}>Chapter 7: Heat &amp; Thermodynamics</Text>
            <Text style={dd.readerText}>Heat flows from a body at higher temperature to one at lower temperature.</Text>
            <View style={dd.readerHi}>
              <Text style={dd.readerHiText}>The specific heat capacity of water is 4186 J/kg·K, an excellent thermal buffer.</Text>
            </View>
            <View style={dd.vartaMini}>
              <View style={dd.vartaMiniHeader}>
                <Ionicons name="chatbubble-ellipses" size={12} color={INDIC.teal} />
                <Text style={dd.vartaMiniTitle}>Varta</Text>
                <View style={dd.greenDot} />
              </View>
              <View style={dd.vartaMiniUser}><Text style={dd.vartaMiniUserText}>Why is water's specific heat so high?</Text></View>
              <View style={dd.vartaMiniAi}>
                <Text style={dd.vartaMiniAiText}>Hydrogen bonding between molecules requires significant energy to break.</Text>
                <View style={dd.vartaMiniCite}><Text style={dd.vartaMiniCiteText}>📄 p. 142, ¶2</Text></View>
              </View>
            </View>
          </View>
          <View style={dd.ttsBar}>
            <View style={dd.playBtn}><Ionicons name="play" size={11} color="#fff" /></View>
            <View style={dd.ttsBarTrack}><View style={dd.ttsBarFill} /></View>
            <Text style={dd.ttsBarTime}>2:34 / 8:12</Text>
            <Ionicons name="volume-high" size={13} color={INDIC.slate400} />
          </View>
        </View>
      </View>

      {/* ── Admin block ── */}
      <View style={[dd.block, { marginTop: spacing(12) }]}>
        <View style={[dd.badge, { borderColor: 'rgba(255,77,0,0.2)' }]}>
          <Ionicons name="bar-chart" size={14} color={INDIC.burnt} />
          <Text style={[dd.badgeText, { color: INDIC.burnt }]}>Teacher &amp; Admin Experience</Text>
        </View>
        <Text style={dd.heading}>
          See what they read. <Text style={{ color: INDIC.teal }}>Know what they skip.</Text>
        </Text>
        <Text style={dd.para}>
          Equip your faculty with X-ray vision. Understand class engagement, track assignment
          completion, and see precisely which chapters trigger the most AI questions.
        </Text>
        <FeatureList items={ADMIN_ITEMS} tint={INDIC.burnt} />

        {/* Dashboard mock */}
        <View style={dd.mock}>
          <View style={dd.dashTop}>
            <View style={dd.dashLogo}><Ionicons name="bar-chart" size={12} color="#fff" /></View>
            <Text style={dd.dashTitle}>Book Buddy Admin</Text>
            <View style={dd.dashClass}>
              <Text style={dd.dashClassText}>Class 10 · Physics · </Text>
              <Text style={[dd.dashClassText, { color: INDIC.gold, fontFamily: fonts.label }]}>Heat</Text>
            </View>
          </View>
          <View style={dd.dashBody}>
            <Text style={dd.dashSectionLabel}>STRUGGLING CHAPTER HEATMAP</Text>
            {HEATMAP.map((h) => (
              <View key={h.ch} style={dd.heatRow}>
                <Text style={[dd.heatCh, h.hot && { color: INDIC.teal, fontFamily: fonts.label }]} numberOfLines={1}>{h.ch}</Text>
                <View style={dd.heatTrack}>
                  <View style={[dd.heatFill, { width: `${h.pct}%`, backgroundColor: h.color }]} />
                </View>
                <Text style={[dd.heatPct, h.hot && { color: INDIC.teal, fontFamily: fonts.label }]}>{h.pct}%</Text>
                {h.hot && <Ionicons name="warning" size={13} color={INDIC.amber} />}
              </View>
            ))}
            <View style={dd.metricRow}>
              <View style={[dd.metric, { backgroundColor: '#EFFBF3', borderColor: 'rgba(16,185,129,0.3)' }]}>
                <View style={dd.metricHead}>
                  <Ionicons name="checkmark-circle" size={13} color="#0e9a4a" />
                  <Text style={[dd.metricLabel, { color: '#095E2E' }]}>ASSIGNMENTS</Text>
                </View>
                <Text style={[dd.metricNum, { color: '#0b7a3b' }]}>82%</Text>
                <Text style={[dd.metricSub, { color: '#0e9a4a' }]}>Complete this week</Text>
              </View>
              <View style={[dd.metric, { backgroundColor: '#EEF3FF', borderColor: 'rgba(30,58,138,0.15)' }]}>
                <View style={dd.metricHead}>
                  <Ionicons name="chatbubble-ellipses" size={13} color={INDIC.teal} />
                  <Text style={[dd.metricLabel, { color: INDIC.teal }]}>VARTA AI Qs</Text>
                </View>
                <Text style={[dd.metricNum, { color: INDIC.teal }]}>437</Text>
                <Text style={[dd.metricSub, { color: 'rgba(30,58,138,0.7)' }]}>Questions this week</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function FeatureList({ items, tint }: { items: { icon: any; title: string; desc: string }[]; tint: string }) {
  return (
    <View style={dd.list}>
      {items.map((it) => (
        <View key={it.title} style={dd.listRow}>
          <View style={[dd.listIcon, { borderColor: INDIC.slate100 }]}>
            <Ionicons name={it.icon} size={20} color={tint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={dd.listTitle}>{it.title}</Text>
            <Text style={dd.listDesc}>{it.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const dd = StyleSheet.create({
  section: { paddingVertical: spacing(9), paddingHorizontal: spacing(5) },
  block: {},
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderRadius: radius.full, borderWidth: 1, backgroundColor: '#fff', marginBottom: spacing(4) },
  pingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: INDIC.teal },
  badgeText: { fontFamily: fonts.label, fontSize: 13 },
  heading: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, color: INDIC.slate900, marginBottom: spacing(3) },
  para: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: INDIC.slate700, marginBottom: spacing(5) },

  list: { gap: spacing(4) },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3) },
  listIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  listTitle: { fontFamily: fonts.label, fontSize: 15, color: INDIC.slate800, marginBottom: 2 },
  listDesc: { fontFamily: fonts.body, fontSize: 13, color: INDIC.slate600, lineHeight: 19 },

  mock: { marginTop: spacing(6), backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(220,225,234,0.8)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 5 },

  /* Reader mock */
  readerTabs: { flexDirection: 'row', backgroundColor: INDIC.slate50, borderBottomWidth: 1, borderBottomColor: INDIC.slate100, paddingHorizontal: 4, paddingTop: 4, gap: 2 },
  readerTab: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing(2.5), paddingVertical: spacing(2), borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  readerTabOn: { backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: INDIC.burnt },
  readerTabText: { fontFamily: fonts.label, fontSize: 9.5, letterSpacing: 0.4, textTransform: 'uppercase' },
  readerBody: { padding: spacing(4) },
  readerChapter: { fontFamily: fonts.heading, fontSize: 13, color: INDIC.slate800, borderBottomWidth: 1, borderBottomColor: INDIC.slate100, paddingBottom: spacing(1.5), marginBottom: spacing(2.5) },
  readerText: { fontFamily: fonts.body, fontSize: 11, lineHeight: 17, color: INDIC.slate600, marginBottom: spacing(2) },
  readerHi: { backgroundColor: '#FFE3A3', borderLeftWidth: 2, borderLeftColor: INDIC.amber, borderRadius: 3, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1), marginBottom: spacing(3) },
  readerHiText: { fontFamily: fonts.label, fontSize: 11, lineHeight: 17, color: INDIC.slate800 },
  vartaMini: { backgroundColor: 'rgba(248,250,252,0.8)', borderWidth: 1, borderColor: INDIC.slate200, borderRadius: radius.md, padding: spacing(2.5), gap: spacing(2) },
  vartaMiniHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vartaMiniTitle: { fontFamily: fonts.label, fontSize: 10, color: INDIC.slate800 },
  greenDot: { marginLeft: 'auto', width: 6, height: 6, borderRadius: 3, backgroundColor: '#3DDC84' },
  vartaMiniUser: { alignSelf: 'flex-end', backgroundColor: INDIC.teal, borderRadius: 8, borderTopRightRadius: 2, paddingHorizontal: spacing(2), paddingVertical: spacing(1.5), maxWidth: '90%' },
  vartaMiniUserText: { color: '#fff', fontFamily: fonts.body, fontSize: 9 },
  vartaMiniAi: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: INDIC.slate200, borderRadius: 8, borderTopLeftRadius: 2, paddingHorizontal: spacing(2), paddingVertical: spacing(1.5), maxWidth: '95%' },
  vartaMiniAiText: { color: INDIC.slate700, fontFamily: fonts.body, fontSize: 9, lineHeight: 13 },
  vartaMiniCite: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,77,0,0.1)', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1, marginTop: 4 },
  vartaMiniCiteText: { fontFamily: fonts.label, fontSize: 8, color: INDIC.burnt },
  ttsBar: { height: 38, borderTopWidth: 1, borderTopColor: INDIC.slate100, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(3), gap: spacing(2) },
  playBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: INDIC.teal, alignItems: 'center', justifyContent: 'center' },
  ttsBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: INDIC.slate100, overflow: 'hidden' },
  ttsBarFill: { width: '35%', height: '100%', backgroundColor: INDIC.teal, borderRadius: 3 },
  ttsBarTime: { fontFamily: fonts.body, fontSize: 9, color: INDIC.slate500 },

  /* Dashboard mock */
  dashTop: { height: 40, backgroundColor: INDIC.slate900, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(3), gap: spacing(2) },
  dashLogo: { width: 20, height: 20, borderRadius: 4, backgroundColor: INDIC.burnt, alignItems: 'center', justifyContent: 'center' },
  dashTitle: { fontFamily: fonts.label, fontSize: 10, color: '#fff' },
  dashClass: { marginLeft: 'auto', flexDirection: 'row', backgroundColor: INDIC.slate800, borderRadius: radius.full, paddingHorizontal: spacing(2.5), paddingVertical: 3 },
  dashClassText: { fontFamily: fonts.body, fontSize: 8.5, color: INDIC.slate300 },
  dashBody: { padding: spacing(4) },
  dashSectionLabel: { fontFamily: fonts.label, fontSize: 10, color: INDIC.slate800, letterSpacing: 0.5, marginBottom: spacing(3) },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(2) },
  heatCh: { fontFamily: fonts.body, fontSize: 9, color: INDIC.slate600, width: 96 },
  heatTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: INDIC.slate100, overflow: 'hidden' },
  heatFill: { height: '100%', borderRadius: 6 },
  heatPct: { fontFamily: fonts.body, fontSize: 9, color: INDIC.slate500, width: 30, textAlign: 'right' },
  metricRow: { flexDirection: 'row', gap: spacing(2.5), marginTop: spacing(3) },
  metric: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: spacing(3) },
  metricHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing(2) },
  metricLabel: { fontFamily: fonts.label, fontSize: 8.5, letterSpacing: 0.4 },
  metricNum: { fontFamily: fonts.heading, fontSize: 24 },
  metricSub: { fontFamily: fonts.body, fontSize: 8.5, marginTop: 2 },
});
