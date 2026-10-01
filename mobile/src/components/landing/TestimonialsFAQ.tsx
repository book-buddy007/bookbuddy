import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius, spacing } from '@/theme';
import { INDIC, SectionHeader } from './primitives';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Mirrors testimonial-and-faq.tsx — single-card auto-rotating carousel + FAQ accordion. */

const TESTIMONIALS = [
  { name: 'Dean of Academics', role: 'Design-partner persona', institution: 'Founding cohort', rating: 5, content: 'What we need is to move thousands of students to digital EPUBs without standing up new infrastructure — Book Buddy is built to do exactly that.' },
  { name: 'Head of Sciences', role: 'Design-partner persona', institution: 'Founding cohort', rating: 5, content: 'The reason Varta matters: it answers only from the textbooks we upload and cites the page — so there are no hallucinations for students to second-guess.' },
  { name: 'Postgraduate Student', role: 'Design-partner persona', institution: 'Founding cohort', rating: 5, content: 'Annotating a PDF in the app and turning those highlights straight into Sanchika flashcards is the workflow that would cut my revision time in half.' },
];

const FAQS = [
  { q: 'How does AI-embedded reading work?', a: "When you upload a textbook (PDF or EPUB), our Varta engine indexes the exact content. When a student asks a doubt, the AI constructs an answer strictly using the textbook's text and provides clickable citations to the exact page.", cat: 'AI & Features' },
  { q: 'What is Sanchika?', a: 'Sanchika is the personal study archive built into Book Buddy. It automatically collects every highlight, annotation, AI explanation, and flashcard a student creates — across all their books — into one evolving notebook they can revisit any time.', cat: 'AI & Features' },
  { q: 'Is student data private and tenant-isolated?', a: 'Yes. Every institution gets a completely isolated database tenant. User queries, reading habits, and highlighting data are never shared across institutions or used to train public LLM models.', cat: 'Security' },
  { q: 'Can we bring our existing PDFs and books?', a: 'Absolutely. Our platform supports bulk uploads of PDFs and EPUBs. We automatically run OCR on scanned PDFs to ensure they are searchable and AI-ready.', cat: 'Getting Started' },
  { q: 'Does Book Buddy support Text-to-Speech and audiobooks?', a: 'Yes. Every book in your catalog gets natural, AI-powered Text-to-Speech narration. Students can listen on the go and seamlessly switch between reading and listening modes.', cat: 'AI & Features' },
  { q: 'What about mobile reading?', a: 'Book Buddy ships native iOS and Android apps plus responsive rendering engines. Textbooks automatically reflow and scale perfectly across phones and tablets.', cat: 'Technical' },
];

const CATEGORIES = ['All', 'AI & Features', 'Security', 'Getting Started', 'Technical'];
const ROTATE_MS = 5000;

/* ── Single-card auto-rotating carousel (mirrors testimonial-carousel.tsx) ── */
function TestimonialCarousel() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;
  const len = TESTIMONIALS.length;

  // Cross-fade whenever the active card changes.
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [idx, fade]);

  // Auto-rotate; the timer restarts on every index change (manual or auto) and
  // pauses briefly while the user is interacting.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIdx((p) => (p + 1) % len), ROTATE_MS);
    return () => clearTimeout(t);
  }, [idx, paused, len]);

  const go = (next: number) => {
    setIdx((next + len) % len);
    setPaused(true);
    // resume auto-rotate a little after manual interaction
    setTimeout(() => setPaused(false), ROTATE_MS * 1.4);
  };

  const t = TESTIMONIALS[idx];

  return (
    <View>
      <View style={c.stage}>
        {/* Prev / Next arrows */}
        <Pressable onPress={() => go(idx - 1)} hitSlop={10} style={({ pressed }) => [c.arrow, c.arrowLeft, pressed && c.arrowPressed]}>
          <Ionicons name="chevron-back" size={20} color={INDIC.amber} />
        </Pressable>

        <Animated.View style={[c.card, { opacity: fade }]}>
          <View style={c.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons key={i} name="star" size={18} color={i < t.rating ? INDIC.amber : 'rgba(217,119,6,0.2)'} />
            ))}
          </View>

          <Text style={c.quote}>“{t.content}”</Text>

          {/* Golden diamond divider */}
          <View style={c.diamondRow}>
            <View style={c.diamondLine} />
            <View style={c.diamond} />
            <View style={c.diamondLine} />
          </View>

          <View style={c.author}>
            <View style={c.avatar}>
              <Text style={c.avatarText}>{t.name.charAt(0)}</Text>
            </View>
            <Text style={c.name}>{t.name}</Text>
            <Text style={c.role}>{t.role}</Text>
            <Text style={c.institution}>{t.institution}</Text>
          </View>
        </Animated.View>

        <Pressable onPress={() => go(idx + 1)} hitSlop={10} style={({ pressed }) => [c.arrow, c.arrowRight, pressed && c.arrowPressed]}>
          <Ionicons name="chevron-forward" size={20} color={INDIC.amber} />
        </Pressable>
      </View>

      {/* Pagination dots */}
      <View style={c.dots}>
        {TESTIMONIALS.map((_, i) => (
          <Pressable key={i} onPress={() => go(i)} hitSlop={8}>
            <View style={[c.dot, i === idx ? c.dotActive : c.dotIdle]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function TestimonialsFAQ() {
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<number | null>(0);
  const filtered = FAQS.filter((f) => cat === 'All' || f.cat === cat);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(open === i ? null : i);
  };

  return (
    <View>
      {/* Testimonials */}
      <View style={[tf.section, { backgroundColor: INDIC.white }]}>
        <SectionHeader
          label="Built With Educators" labelColor={INDIC.burnt}
          headingLead="Designed with our" headingAccent="founding cohort" accentColor={INDIC.burnt} headingColor={INDIC.slate900}
          sub="We're building Book Buddy alongside deans, faculty, and students. These are the needs they voiced — the product is built to meet them."
          subColor={INDIC.slate600}
        />
        <TestimonialCarousel />
        <Text style={tf.tNote}>Illustrative voices from design-partner interviews · launching 2026</Text>
      </View>

      {/* FAQ */}
      <View style={[tf.section, { backgroundColor: INDIC.cream }]}>
        <SectionHeader
          label="FAQ" labelColor={INDIC.teal}
          headingLead="Frequently Asked" headingAccent="Questions"
          sub="Everything you need to know about deploying Book Buddy for your institution."
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tf.catRow}>
          {CATEGORIES.map((cName) => {
            const on = cat === cName;
            return (
              <Pressable key={cName} onPress={() => { setCat(cName); setOpen(null); }} style={[tf.catChip, on && tf.catChipOn]}>
                <Text style={[tf.catText, { color: on ? '#fff' : INDIC.brown }]}>{cName}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: spacing(2.5) }}>
          {filtered.map((f, i) => {
            const isOpen = open === i;
            return (
              <Pressable key={f.q} onPress={() => toggle(i)} style={tf.faqCard}>
                <View style={tf.faqQRow}>
                  <Text style={tf.faqQ}>{f.q}</Text>
                  <Ionicons name={isOpen ? 'remove' : 'add'} size={20} color={INDIC.burnt} />
                </View>
                {isOpen && <Text style={tf.faqA}>{f.a}</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const c = StyleSheet.create({
  stage: { justifyContent: 'center' },
  card: {
    backgroundColor: INDIC.cream, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(184,134,11,0.3)',
    paddingVertical: spacing(7), paddingHorizontal: spacing(6), alignItems: 'center',
    marginHorizontal: spacing(5),
    shadowColor: INDIC.goldDark, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 3,
  },
  stars: { flexDirection: 'row', gap: 4, marginBottom: spacing(4) },
  quote: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 16, lineHeight: 25, color: '#5D4037', textAlign: 'center', marginBottom: spacing(5) },
  diamondRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing(6), opacity: 0.7 },
  diamondLine: { height: 1, width: 44, backgroundColor: INDIC.gold },
  diamond: { width: 6, height: 6, backgroundColor: INDIC.saffron, transform: [{ rotate: '45deg' }], marginHorizontal: 8 },
  author: { alignItems: 'center' },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: INDIC.indigoNight, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing(3), shadowColor: INDIC.indigoNight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 5,
  },
  avatarText: { fontFamily: fonts.heading, fontSize: 24, color: '#fff' },
  name: { fontFamily: fonts.heading, fontSize: 17, color: INDIC.indigoNight },
  role: { fontFamily: fonts.label, fontSize: 13, color: '#5D4037', marginTop: 2 },
  institution: { fontFamily: fonts.body, fontSize: 13, color: '#795548', opacity: 0.85, marginTop: 1 },

  arrow: {
    position: 'absolute', zIndex: 20, top: '50%', marginTop: -22,
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
    shadowColor: INDIC.amber, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  arrowLeft: { left: -4 },
  arrowRight: { right: -4 },
  arrowPressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },

  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing(2), marginTop: spacing(6) },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 28, backgroundColor: INDIC.amber },
  dotIdle: { width: 8, backgroundColor: 'rgba(217,119,6,0.25)' },
});

const tf = StyleSheet.create({
  section: { paddingVertical: spacing(9), paddingHorizontal: spacing(5) },
  tNote: { fontFamily: fonts.body, fontSize: 11, fontStyle: 'italic', color: INDIC.slate400, textAlign: 'center', marginTop: spacing(5) },

  catRow: { gap: spacing(2), paddingBottom: spacing(5), paddingHorizontal: spacing(1) },
  catChip: { paddingHorizontal: spacing(3.5), paddingVertical: spacing(2), borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(93,64,55,0.18)', backgroundColor: 'rgba(255,255,255,0.7)' },
  catChipOn: { backgroundColor: INDIC.burnt, borderColor: INDIC.burnt },
  catText: { fontFamily: fonts.label, fontSize: 12.5 },

  faqCard: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(184,134,11,0.25)', padding: spacing(4) },
  faqQRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(3) },
  faqQ: { flex: 1, fontFamily: fonts.label, fontSize: 15, color: INDIC.slate900 },
  faqA: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: INDIC.brown, marginTop: spacing(3) },
});
