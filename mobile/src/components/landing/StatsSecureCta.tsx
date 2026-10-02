import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { useRouter } from 'expo-router';
import { fonts, radius, spacing } from '@/theme';
import { brand, landing } from '@shared/design/content';
import { INDIC, SectionHeader } from './primitives';

/* ═══════════════ StatsBand (mirrors stats-band.tsx) ═══════════════ */
const STATS = [
  { value: '4', label: 'Reading Modes' },
  { value: '6', label: 'PDF Studio Tools' },
  { value: '100%', label: 'Citation-Backed AI' },
  { value: '99.9%', label: 'Uptime Target' },
];

export function StatsBand() {
  return (
    <View style={[st.section, { backgroundColor: INDIC.white }]}>
      <View style={st.foundingWrap}>
        <View style={st.foundingPill}>
          <Ionicons name="sparkles" size={14} color={INDIC.burnt} />
          <Text style={st.foundingText}>Launching 2026 · Founding institutions onboarding now</Text>
        </View>
      </View>
      <View style={st.grid}>
        {STATS.map((s) => (
          <View key={s.label} style={st.card}>
            <Text style={st.num}>{s.value}</Text>
            <View style={st.labelRow}>
              <View style={st.tick} />
              <Text style={st.cardLabel}>{s.label}</Text>
              <View style={st.tick} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════ SecureBharat (mirrors secure-bharat-section.tsx) ═══════════════ */
const PILLARS = [
  { icon: 'business' as const, title: 'Multi-tenant isolation', desc: "Every institution's data lives in its own logical boundary. One breach can never cross tenants." },
  { icon: 'git-network' as const, title: 'Branch hierarchy', desc: 'Model campuses, branches, and departments — assign books and seats per branch.' },
  { icon: 'key' as const, title: 'Role-based access', desc: 'Granular roles for admins, faculty, librarians, and students. Least-privilege by default.' },
  { icon: 'lock-closed' as const, title: 'SSO ready', desc: 'Single sign-on so students use one institutional identity across the campus stack.' },
];
const TRUST = [
  { icon: 'people' as const, text: 'Per-institution roles' },
  { icon: 'document-attach' as const, text: 'DPDP-ready data handling' },
  { icon: 'lock-closed' as const, text: 'Encrypted at rest & in transit' },
  { icon: 'shield-checkmark' as const, text: 'Audit-logged access' },
];

export function SecureBharat() {
  return (
    <View style={[st.section, { backgroundColor: INDIC.deepBlue }]}>
      <View style={st.secureHeader}>
        <View style={st.labelRow}>
          <Ionicons name="shield-checkmark" size={16} color={INDIC.gold} />
          <Text style={[st.secureLabel]}>Secure for Bharat</Text>
        </View>
        <Text style={st.secureHeading}>
          Enterprise-grade. <Text style={{ color: INDIC.gold }}>Built for institutions.</Text>
        </Text>
        <Text style={st.secureSub}>
          From a single coaching centre to a multi-campus university — the same architecture scales
          without ever mixing one institution's data with another's.
        </Text>
      </View>

      <View style={st.pillarGrid}>
        {PILLARS.map((p) => (
          <View key={p.title} style={st.pillarCard}>
            <View style={st.pillarIcon}>
              <Ionicons name={p.icon} size={22} color={INDIC.white} />
            </View>
            <Text style={st.pillarTitle}>{p.title}</Text>
            <Text style={st.pillarDesc}>{p.desc}</Text>
          </View>
        ))}
      </View>

      <View style={st.trustStrip}>
        {TRUST.map((t) => (
          <View key={t.text} style={st.trustItem}>
            <Ionicons name={t.icon} size={15} color={INDIC.gold} />
            <Text style={st.trustText}>{t.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════ CtaFooter (mirrors cta-footer-section.tsx + footer) ═══════════════ */
export function CtaFooter() {
  const router = useRouter();
  return (
    <View>
      <View style={[st.section, { backgroundColor: INDIC.cream, alignItems: 'center' }]}>
        <Text style={st.ctaHeading}>
          Bring an AI-Powered Library to Your <Text style={{ color: INDIC.burnt }}>Institution</Text>
        </Text>
        <Text style={st.ctaSub}>
          Join leading schools and universities. Book a live demo to see how{' '}
          <Text style={{ color: INDIC.teal, fontFamily: fonts.label }}>Varta</Text> and our
          multi-tenant architecture can transform your campus reading experience today.
        </Text>
        <View style={st.ctaBtns}>
          <Pressable
            onPress={() => router.push(landing.ctas.demo.route as any)}
            style={({ pressed }) => [st.ctaPrimary, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="rocket" size={18} color={INDIC.white} />
            <Text style={st.ctaPrimaryText}>Book a Live Demo</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(landing.ctas.secondary.route as any)}
            style={({ pressed }) => [st.ctaOutline, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="call" size={17} color={INDIC.teal} />
            <Text style={st.ctaOutlineText}>Talk to Product Team</Text>
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View style={st.footer}>
        <View style={st.footerBrandRow}>
          <View style={st.footerBadge}>
            <Ionicons name="school" size={16} color={INDIC.white} />
          </View>
          <Text style={st.footerBrand}>{brand.name}</Text>
        </View>
        <Text style={st.footerTagline}>{brand.tagline}</Text>
        <Text style={st.footerCopy}>© 2026 {brand.name} · Secure Bharat Digital Library</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  section: { paddingVertical: spacing(9), paddingHorizontal: spacing(5) },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  /* Stats */
  foundingWrap: { alignItems: 'center', marginBottom: spacing(6) },
  foundingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1,
    paddingHorizontal: spacing(4), paddingVertical: spacing(2.5), borderRadius: radius.full,
    backgroundColor: INDIC.cream2, borderWidth: 1, borderColor: 'rgba(255,77,0,0.25)',
  },
  foundingText: { color: INDIC.burntDark, fontFamily: fonts.label, fontSize: 12.5, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), justifyContent: 'center' },
  card: {
    width: '47%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(184,134,11,0.2)', paddingVertical: spacing(5),
    alignItems: 'center',
    shadowColor: INDIC.goldDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  num: { color: INDIC.teal, fontFamily: fonts.heading, fontSize: 38, marginBottom: spacing(2) },
  cardLabel: { color: INDIC.brown, fontFamily: fonts.label, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  tick: { height: 1, width: 14, backgroundColor: 'rgba(184,134,11,0.4)' },

  /* Secure */
  secureHeader: { alignItems: 'center', marginBottom: spacing(7) },
  secureLabel: { color: INDIC.gold, fontFamily: fonts.label, fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  secureHeading: { color: INDIC.white, fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, textAlign: 'center', marginTop: spacing(2) },
  secureSub: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.body, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: spacing(2.5) },
  pillarGrid: { gap: spacing(3.5) },
  pillarCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg, padding: spacing(5),
  },
  pillarIcon: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: INDIC.burnt,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing(3),
  },
  pillarTitle: { color: INDIC.white, fontFamily: fonts.heading, fontSize: 17, marginBottom: spacing(1.5) },
  pillarDesc: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  trustStrip: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing(4), marginTop: spacing(7) },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.label, fontSize: 13 },

  /* CTA */
  ctaHeading: { color: INDIC.slate900, fontFamily: fonts.heading, fontSize: 30, lineHeight: 37, textAlign: 'center', marginBottom: spacing(4) },
  ctaSub: { color: INDIC.slate700, fontFamily: fonts.body, fontSize: 15, lineHeight: 23, textAlign: 'center', marginBottom: spacing(7) },
  ctaBtns: { width: '100%', gap: spacing(3) },
  ctaPrimary: {
    height: 54, borderRadius: radius.md, backgroundColor: INDIC.burnt, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: spacing(2),
    shadowColor: INDIC.burnt, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 4,
  },
  ctaPrimaryText: { color: INDIC.white, fontFamily: fonts.label, fontSize: 16 },
  ctaOutline: {
    height: 54, borderRadius: radius.md, backgroundColor: 'rgba(30,58,138,0.06)', borderWidth: 1.5,
    borderColor: 'rgba(30,58,138,0.5)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(2),
  },
  ctaOutlineText: { color: INDIC.teal, fontFamily: fonts.label, fontSize: 16 },

  /* Footer */
  footer: { backgroundColor: INDIC.slate900, paddingVertical: spacing(8), paddingHorizontal: spacing(5), alignItems: 'center' },
  footerBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing(2) },
  footerBadge: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: INDIC.burnt, alignItems: 'center', justifyContent: 'center' },
  footerBrand: { color: INDIC.white, fontFamily: fonts.heading, fontSize: 18 },
  footerTagline: { color: INDIC.slate400, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginBottom: spacing(3) },
  footerCopy: { color: INDIC.slate500, fontFamily: fonts.body, fontSize: 11, textAlign: 'center' },
});
