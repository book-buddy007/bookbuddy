import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { fonts, radius, spacing } from '@/theme';
import { INDIC, SectionHeader, Badge } from './primitives';

/* ═══════════════ VartaDeepDive (mirrors varta-deepdive-section.tsx) ═══════════════ */
const CAPS = [
  { icon: 'chatbox-ellipses' as const, title: 'Paragraph-level citations', desc: 'Every claim links back to the exact page and paragraph in the source book.', tint: INDIC.burnt },
  { icon: 'layers' as const, title: 'Instant flashcards', desc: 'Turn any explanation into spaced-repetition cards in one tap.', tint: INDIC.teal },
  { icon: 'help-circle' as const, title: 'Practice questions', desc: "Generate exam-style questions from the chapter you're reading.", tint: INDIC.deepBlue },
  { icon: 'bookmark' as const, title: 'Saved to Sanchika', desc: 'Highlights, answers, and cards collect in one evolving study archive.', tint: INDIC.red },
];

export function VartaDeepDive() {
  return (
    <View style={[vp.section, { backgroundColor: INDIC.white }]}>
      <SectionHeader
        label="Varta" labelColor={INDIC.teal} labelIcon="chatbubble-ellipses"
        headingLead="The book that" headingAccent="answers back"
        sub="Most AI guesses. Varta reads your textbook and answers only from it — with a citation you can verify on the page."
      />

      {/* Grounded chat card */}
      <View style={vp.chatCard}>
        <View style={vp.chatHeader}>
          <Ionicons name="chatbubble-ellipses" size={14} color={INDIC.teal} />
          <Text style={vp.chatTitle}>Varta</Text>
          <View style={vp.groundedTag}>
            <Ionicons name="shield-checkmark" size={11} color={INDIC.green600} />
            <Text style={vp.groundedText}>grounded</Text>
          </View>
        </View>
        <View style={vp.chatBody}>
          <View style={vp.traceRow}>
            <Ionicons name="sparkles" size={13} color={INDIC.burnt} />
            <Text style={vp.traceText}>Searching your book → 3 passages found</Text>
          </View>
          <View style={vp.userBubble}>
            <Text style={vp.userText}>Explain latent heat in one line.</Text>
          </View>
          <View style={vp.aiBubble}>
            <Text style={vp.aiText}>
              Latent heat is the energy absorbed or released during a phase change, without any
              change in temperature.
            </Text>
            <View style={vp.citeRow}>
              <View style={[vp.citePill, { backgroundColor: 'rgba(255,77,0,0.1)' }]}>
                <Text style={[vp.citeText, { color: INDIC.burnt }]}>“ p. 148, ¶1</Text>
              </View>
              <View style={[vp.citePill, { backgroundColor: 'rgba(30,58,138,0.1)' }]}>
                <Text style={[vp.citeText, { color: INDIC.teal }]}>“ p. 149, fig 7.5</Text>
              </View>
            </View>
          </View>
          <View style={vp.actionRow}>
            {[
              { t: '+ Flashcard', c: INDIC.teal },
              { t: '+ Practice Q', c: INDIC.deepBlue },
              { t: '→ Sanchika', c: INDIC.burnt },
            ].map((a) => (
              <View key={a.t} style={[vp.actionChip, { borderColor: `${a.c}26`, backgroundColor: `${a.c}14` }]}>
                <Text style={[vp.actionText, { color: a.c }]}>{a.t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Capability list */}
      <View style={vp.capList}>
        {CAPS.map((c) => (
          <View key={c.title} style={vp.capRow}>
            <View style={[vp.capIcon, { backgroundColor: `${c.tint}14` }]}>
              <Ionicons name={c.icon} size={22} color={c.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={vp.capTitle}>{c.title}</Text>
              <Text style={vp.capDesc}>{c.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={vp.noHalluWrap}>
        <Badge icon="shield-checkmark" text="No hallucinations — if it isn't in the book, Varta says so." color={INDIC.burntDark} bg={INDIC.cream2} border="rgba(255,77,0,0.2)" />
      </View>
    </View>
  );
}

/* ═══════════════ PdfStudio (mirrors pdf-studio-section.tsx) ═══════════════ */
const TOOLS = [
  { icon: 'brush' as const, label: 'Freehand ink', tint: INDIC.red },
  { icon: 'shapes' as const, label: 'Smart shapes', tint: INDIC.burnt },
  { icon: 'color-fill' as const, label: 'Highlight', tint: INDIC.amber },
  { icon: 'eye-off' as const, label: 'Redaction', tint: INDIC.deepBlue },
  { icon: 'scan' as const, label: 'OCR search', tint: INDIC.teal },
  { icon: 'mic' as const, label: 'Audio notes', tint: INDIC.purple },
];

export function PdfStudio() {
  return (
    <View style={[vp.section, { backgroundColor: INDIC.slate50 }]}>
      <Badge icon="brush" text="Built-in PDF Studio" color={INDIC.red} bg={INDIC.white} border="rgba(198,40,40,0.2)" />
      <Text style={vp.pdfHeading}>
        A full annotation studio, <Text style={{ color: INDIC.burnt }}>right in the app.</Text>
      </Text>
      <Text style={vp.pdfSub}>
        No downloads, no separate window. Mark up any PDF with Drawboard-grade tools — then
        everything syncs to Sanchika and travels with the student across devices.
      </Text>

      <View style={vp.toolGrid}>
        {TOOLS.map((t) => (
          <View key={t.label} style={vp.toolChip}>
            <View style={[vp.toolIcon, { backgroundColor: `${t.tint}14` }]}>
              <Ionicons name={t.icon} size={18} color={t.tint} />
            </View>
            <Text style={vp.toolLabel}>{t.label}</Text>
          </View>
        ))}
      </View>

      {/* PDF page mock with floating toolbar */}
      <View style={vp.pdfCard}>
        <View style={vp.pdfToolbar}>
          {TOOLS.map((t, i) => (
            <View key={t.label} style={[vp.pdfToolBtn, i === 0 && { backgroundColor: t.tint }]}>
              <Ionicons name={t.icon} size={15} color={i === 0 ? '#fff' : 'rgba(255,255,255,0.8)'} />
            </View>
          ))}
        </View>
        <View style={vp.pdfPage}>
          <Text style={vp.pdfPageNum}>— page 142 —</Text>
          <View style={[vp.pdfLine, { width: '100%' }]} />
          <View style={[vp.pdfLine, vp.pdfHi, { width: '92%' }]} />
          <View style={[vp.pdfLine, { width: '80%' }]} />
          <View style={vp.pdfFig}>
            <Text style={vp.pdfFigText}>Fig 7.3 — Convection currents</Text>
          </View>
          <View style={vp.redactRow}>
            <View style={[vp.pdfLine, { width: '33%', backgroundColor: INDIC.slate900, marginBottom: 0 }]} />
            <View style={[vp.pdfLine, { flex: 1, marginBottom: 0 }]} />
          </View>
          <View style={vp.audioPill}>
            <Ionicons name="mic" size={12} color={INDIC.purple} />
            <Text style={vp.audioText}>Audio note · 0:12</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const vp = StyleSheet.create({
  section: { paddingVertical: spacing(9), paddingHorizontal: spacing(5) },

  /* Varta chat card */
  chatCard: {
    backgroundColor: INDIC.white, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(220,225,234,0.8)',
    overflow: 'hidden', marginBottom: spacing(6),
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 5,
  },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing(4), paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: INDIC.slate100, backgroundColor: INDIC.slate50 },
  chatTitle: { fontFamily: fonts.label, fontSize: 12, color: INDIC.slate800 },
  groundedTag: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 },
  groundedText: { fontFamily: fonts.label, fontSize: 10, color: INDIC.green600 },
  chatBody: { padding: spacing(4), gap: spacing(3) },
  traceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  traceText: { fontFamily: fonts.body, fontSize: 11, color: INDIC.slate400 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: INDIC.deepBlue, borderRadius: 16, borderTopRightRadius: 3, padding: spacing(3), maxWidth: '85%' },
  userText: { color: '#fff', fontFamily: fonts.body, fontSize: 13 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: INDIC.slate200, borderRadius: 16, borderTopLeftRadius: 3, padding: spacing(3), maxWidth: '95%' },
  aiText: { color: INDIC.slate700, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  citeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing(2) },
  citePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  citeText: { fontFamily: fonts.label, fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionChip: { flex: 1, alignItems: 'center', paddingVertical: spacing(2), borderRadius: radius.sm, borderWidth: 1 },
  actionText: { fontFamily: fonts.label, fontSize: 11 },

  /* Varta capabilities */
  capList: { gap: spacing(3) },
  capRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3), padding: spacing(4), borderRadius: radius.lg, borderWidth: 1, borderColor: INDIC.slate100, backgroundColor: '#fff' },
  capIcon: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  capTitle: { fontFamily: fonts.heading, fontSize: 16, color: INDIC.slate900, marginBottom: 2 },
  capDesc: { fontFamily: fonts.body, fontSize: 13, color: INDIC.slate600, lineHeight: 19 },
  noHalluWrap: { alignItems: 'center', marginTop: spacing(5) },

  /* PDF studio */
  pdfHeading: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, color: INDIC.slate900, marginTop: spacing(4), marginBottom: spacing(3) },
  pdfSub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: INDIC.slate700, marginBottom: spacing(5) },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5), marginBottom: spacing(6) },
  toolChip: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: spacing(2.5), padding: spacing(3), borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: INDIC.slate100 },
  toolIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontFamily: fonts.label, fontSize: 12, color: INDIC.slate700, flexShrink: 1 },
  pdfCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(220,225,234,0.8)', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 5 },
  pdfToolbar: { backgroundColor: 'rgba(15,23,42,0.95)', padding: spacing(1.5), gap: 6, alignItems: 'center', justifyContent: 'center' },
  pdfToolBtn: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  pdfPage: { flex: 1, padding: spacing(4), gap: spacing(2.5) },
  pdfPageNum: { fontFamily: fonts.body, fontSize: 10, color: INDIC.slate400, textAlign: 'center', marginBottom: spacing(1) },
  pdfLine: { height: 10, borderRadius: 4, backgroundColor: INDIC.slate200, marginBottom: spacing(1) },
  pdfHi: { backgroundColor: '#FFE3A3' },
  pdfFig: { height: 56, borderRadius: radius.sm, backgroundColor: INDIC.slate100, borderWidth: 1, borderColor: INDIC.slate200, alignItems: 'center', justifyContent: 'center', marginVertical: spacing(1) },
  pdfFigText: { fontFamily: fonts.body, fontSize: 10, color: INDIC.slate400 },
  redactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(147,51,234,0.1)', borderWidth: 1, borderColor: 'rgba(147,51,234,0.2)', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4, marginTop: spacing(1) },
  audioText: { fontFamily: fonts.label, fontSize: 10, color: INDIC.purple },
});
