import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@/components/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, fonts, ColorTokens } from '@/theme';
import { useThemeColors } from '@/ThemeProvider';
import { brand, nav, landing, features } from '@shared/design/content';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { ReadingModes } from '@/components/landing/ReadingModes';
import { StatsBand, SecureBharat, CtaFooter } from '@/components/landing/StatsSecureCta';
import { DeepDive } from '@/components/landing/DeepDive';
import { VartaDeepDive, PdfStudio } from '@/components/landing/VartaPdf';
import { TestimonialsFAQ } from '@/components/landing/TestimonialsFAQ';
import { BrandWatermark } from '@/components/landing/BrandWatermark';
import { ScrollAnimatedCard } from '@/components/landing/ScrollAnimatedCard';

/**
 * Landing — mirrors the web hero (components/landing/hero-section.tsx) +
 * FeaturesSection (components/landing/features-section.tsx). Copy comes from
 * shared/design/content.ts; palette from the shared light "Indic" tokens.
 *
 * Platform translations vs web:
 *  • CSS grid (2-col hero) → stacked Flexbox (narrow viewport).
 *  • Hover selection toolbar / hover lift → static; press states on buttons.
 *  • Ambient radial orbs and the brand watermark → low-opacity Views / SVG (no CSS gradients).
 */

// Per-feature icon + halo color. Copy is shared; styling is platform-native.
const FEATURE_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  library:    { icon: 'book',                 color: '#D93A00' },
  varta:      { icon: 'chatbubble-ellipses',  color: '#1E3A8A' },
  pdf:        { icon: 'brush',                 color: '#D98300' },
  sanchika:   { icon: 'bookmark',             color: '#F4B3C2' },
  dashboards: { icon: 'grid',                  color: '#0A0F24' },
  secure:     { icon: 'shield-checkmark',      color: '#E5283A' },
};

export default function LandingScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const scrollRef = React.useRef<any>(null);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Subhead highlights "Varta" in teal (mirrors web's <strong> teal span).
  const [subLead, subTail] = landing.subhead.split('Varta');

  return (
    <View style={s.screen}>
      {/* ── Sticky Top Header (persistent over content) ───────────────── */}
      <View style={[s.stickyHeader, { paddingTop: insets.top + spacing(2) }]}>
        <View style={s.brandRow}>
          <View style={s.brandBadge}>
            <Ionicons name="school" size={18} color="#FFFFFF" />
          </View>
          <Text style={s.brandTitle}>{brand.name}</Text>
        </View>
        <Pressable
          onPress={() => router.push(nav.signIn.route as any)}
          style={({ pressed }) => [s.stickySignInBtn, pressed && s.pressedDim]}
        >
          <Ionicons name="log-in-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={s.stickySignInText}>{nav.signIn.label}</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingTop: insets.top + spacing(18),
            paddingBottom: insets.bottom + spacing(20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero (Full-bleed opener) ────────────────────────────────── */}
        <View style={s.topPad}>
          <View style={s.hero}>
            {/* Brand watermark behind the hero */}
            <BrandWatermark size={340} opacity={0.38} style={s.heroWatermark} />

            {/* Ambient orbs — saffron top-right, teal bottom-left */}
            <View style={[s.orb, s.orbSaffron]} />
            <View style={[s.orb, s.orbTeal]} />

            {/* Badge */}
            <View style={s.badge}>
              <Ionicons name="shield-checkmark" size={14} color={c.saffronDark} />
              <Text style={s.badgeText}>{landing.eyebrow}</Text>
            </View>

            {/* Headline */}
            <Text style={s.headline}>
              {landing.headline.lead}{' '}
              <Text style={s.headlineAccent}>{landing.headline.accent}</Text>
            </Text>

            {/* Subhead */}
            <Text style={s.subhead}>
              {subLead}
              <Text style={s.subheadAccent}>Varta</Text>
              {subTail}
            </Text>

            {/* CTAs — hybrid funnel */}
            <View style={s.ctaGroup}>
              <CtaButton
                variant="primary" c={c}
                icon="log-in-outline" label={landing.ctas.primary.label}
                onPress={() => router.push(landing.ctas.primary.route as any)}
              />
              <CtaButton
                variant="outline" c={c}
                icon="person-add-outline" label={landing.ctas.secondary.label}
                onPress={() => router.push(landing.ctas.secondary.route as any)}
              />
              <View style={s.ctaRow}>
                <CtaButton
                  variant="ghost" c={c} compact
                  icon="compass-outline" label={landing.ctas.tertiary.label}
                  onPress={() => router.push(landing.ctas.tertiary.route as any)}
                />
                <CtaButton
                  variant="ghost" c={c} compact
                  icon="rocket-outline" label={landing.ctas.demo.label}
                  onPress={() => router.push(landing.ctas.demo.route as any)}
                />
              </View>
            </View>

            {/* Built-for row */}
            <View style={s.builtForRow}>
              <Text style={s.builtForLabel}>BUILT FOR:</Text>
              {landing.builtFor.map((item, i) => (
                <React.Fragment key={item}>
                  {i > 0 && <Text style={s.builtForDot}>•</Text>}
                  <Text style={s.builtForItem}>{item}</Text>
                </React.Fragment>
              ))}
            </View>

            {/* Reader + Varta mock (mirrors web's right-side UI mockup) */}
            <View style={s.mock}>
              <View style={s.mockHeader}>
                <View style={s.mockDots}>
                  <View style={[s.mockDot, { backgroundColor: '#FFC2C9' }]} />
                  <View style={[s.mockDot, { backgroundColor: '#FFB547' }]} />
                  <View style={[s.mockDot, { backgroundColor: '#7FE3A5' }]} />
                </View>
                <Text style={s.mockTag}>Book Buddy READER</Text>
              </View>
              <View style={s.mockBody}>
                <Text style={s.mockChapter}>Chapter 4: Neural Networks</Text>
                <View style={[s.mockLine, { width: '100%' }]} />
                <View style={[s.mockLine, { width: '92%' }]} />
                <View style={[s.mockLine, s.mockLineHi, { width: '100%' }]} />
                <View style={[s.mockLine, { width: '80%' }]} />
              </View>
              <View style={s.mockChat}>
                <View style={s.mockChatHeader}>
                  <Ionicons name="chatbubble-ellipses" size={13} color={c.teal} />
                  <Text style={s.mockChatTitle}>Varta</Text>
                </View>
                <View style={s.mockBubbleUser}>
                  <Text style={s.mockBubbleUserText}>Explain backpropagation simply.</Text>
                </View>
                <View style={s.mockBubbleAi}>
                  <Text style={s.mockBubbleAiText}>
                    Backpropagation is how the network learns from its mistakes.{'\n'}
                    <Text style={s.mockCitation}>↳ Source: Page 142, Para 3</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Features Showcase Card (Elevated Mobile Card) ─────────────── */}
        <ScrollAnimatedCard scrollY={scrollY}>
          <View style={s.featuresHeader}>
            <Text style={s.featuresLabel}>{features.label}</Text>
            <Text style={s.featuresHeading}>
              {features.headingLead}{' '}
              <Text style={s.featuresHeadingAccent}>{features.headingAccent}</Text>
            </Text>
            <Text style={s.featuresSub}>{features.subhead}</Text>
          </View>

          <View style={s.featureGrid}>
            {features.items.map((f) => {
              const fs = FEATURE_STYLE[f.key];
              return (
                <View key={f.key} style={s.featureCard}>
                  <View style={s.featureCardTop}>
                    <View style={[s.featureIconHalo, { backgroundColor: fs.color }]}>
                      <Ionicons name={fs.icon} size={26} color="#FFFFFF" />
                    </View>
                    <View style={s.featureTagPill}>
                      <Text style={s.featureTagText}>{f.tag}</Text>
                    </View>
                  </View>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <View style={s.diamondRow}>
                    <View style={s.diamondLineShort} />
                    <View style={s.diamond} />
                    <View style={s.diamondLineLong} />
                  </View>
                  <Text style={s.featureDesc}>{f.description}</Text>
                </View>
              );
            })}
          </View>
        </ScrollAnimatedCard>

        {/* ── Reading Modes Card ───────────────────────────────────────── */}
        <ScrollAnimatedCard scrollY={scrollY}>
          <ReadingModes />
        </ScrollAnimatedCard>

        {/* ── Stats Band (Full-bleed edge-to-edge band) ───────────────── */}
        <StatsBand />

        {/* ── Deep Dive Showcase Card ──────────────────────────────────── */}
        <ScrollAnimatedCard scrollY={scrollY}>
          <DeepDive />
        </ScrollAnimatedCard>

        {/* ── Varta Deep Dive Card ──────────────────────────────────── */}
        <ScrollAnimatedCard scrollY={scrollY}>
          <VartaDeepDive />
        </ScrollAnimatedCard>

        {/* ── PDF Studio Card ──────────────────────────────────────────── */}
        <ScrollAnimatedCard scrollY={scrollY}>
          <PdfStudio />
        </ScrollAnimatedCard>

        {/* ── Secure Bharat Card ───────────────────────────────────────── */}
        <ScrollAnimatedCard scrollY={scrollY}>
          <SecureBharat />
        </ScrollAnimatedCard>

        {/* ── Testimonials FAQ & Closing Sections ──────────────────────── */}
        <TestimonialsFAQ />
        <CtaFooter />
      </Animated.ScrollView>

      {/* ── Fixed Bottom Navigation Bar ──────────────────────────────── */}
      <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, spacing(2)) }]}>
        {/* Left: Home */}
        <Pressable
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={({ pressed }) => [s.bottomNavItem, pressed && s.pressedDim]}
        >
          <Ionicons name="home-outline" size={22} color={c.textMuted} />
          <Text style={s.bottomNavLabel}>Home</Text>
        </Pressable>

        {/* Center: Catalog (Primary Guest Action) */}
        <Pressable
          onPress={() => router.push('/(tabs)')}
          style={({ pressed }) => [s.bottomNavCatalogBtn, pressed && s.pressedDim]}
        >
          <Ionicons name="book" size={20} color="#FFFFFF" />
          <Text style={s.bottomNavCatalogText}>Catalog</Text>
        </Pressable>

        {/* Right: Login / Sign Up (Outlined secondary weight — visually distinct from top filled pill) */}
        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={({ pressed }) => [s.bottomNavSignInOutlineBtn, pressed && s.pressedDim]}
        >
          <Ionicons name="person-circle-outline" size={18} color="#FF4D00" />
          <Text style={s.bottomNavSignInOutlineText}>Sign In</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ── Local CTA button (high-contrast Indic styling with cross-platform glow) ─────────── */
function CtaButton({
  variant, label, icon, onPress, c, compact,
}: {
  variant: 'primary' | 'outline' | 'ghost';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  c: ColorTokens;
  compact?: boolean;
}) {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  // High contrast palette alignment:
  // Primary: Saffron #FF4D00 + white text
  // Outline: Solid White #FFFFFF + 2px Teal border #1E3A8A + bold Teal text
  // Ghost: Solid White/Parchment + border
  const bg = isPrimary ? '#FF4D00' : isOutline ? '#FFFFFF' : 'rgba(255,255,255,0.85)';
  const border = isPrimary ? 'transparent' : isOutline ? '#1E3A8A' : c.border;
  const fg = isPrimary ? '#FFFFFF' : isOutline ? '#1E3A8A' : c.text;

  return (
    <View style={{ position: 'relative', flex: compact ? 1 : undefined }}>
      {/* Cross-platform back-layer colored glow for primary Saffron button */}
      {isPrimary && (
        <View
          style={{
            position: 'absolute',
            top: 4,
            bottom: -4,
            left: 8,
            right: 8,
            backgroundColor: 'rgba(255, 77, 0, 0.35)',
            borderRadius: radius.md,
            zIndex: -1,
          }}
        />
      )}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            height: 52,
            borderRadius: radius.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing(4),
            backgroundColor: bg,
            borderWidth: isPrimary ? 0 : 2,
            borderColor: border,
            shadowColor: isOutline ? '#1E3A8A' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isOutline ? 0.08 : 0.12,
            shadowRadius: 6,
            elevation: isPrimary ? 4 : 2,
          },
          pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        ]}
      >
        <Ionicons name={icon} size={19} color={fg} style={{ marginRight: spacing(2) }} />
        <Text
          style={{
            color: fg,
            fontFamily: isPrimary || isOutline ? fonts.heading : fonts.label,
            fontSize: compact ? 13 : 15,
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */
function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    scrollContent: { paddingBottom: 0 },
    topPad: { paddingHorizontal: spacing(5) },
    pressedDim: { opacity: 0.7 },

    /* Sticky Top Header */
    stickyHeader: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing(4),
      paddingBottom: spacing(3),
      borderBottomWidth: 1,
      borderBottomColor: c.borderGold,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandBadge: {
      width: 34, height: 34, borderRadius: radius.sm,
      backgroundColor: c.saffronDeep, alignItems: 'center', justifyContent: 'center',
      shadowColor: c.saffron, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
    },
    brandTitle: { color: c.text, fontSize: 20, fontFamily: fonts.heading, letterSpacing: -0.4 },
    stickySignInBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.saffronDeep,
      paddingHorizontal: spacing(3.5),
      paddingVertical: spacing(2),
      borderRadius: radius.full,
      shadowColor: c.saffron,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    stickySignInText: { color: '#FFFFFF', fontFamily: fonts.label, fontSize: 13, fontWeight: '700' },

    /* Fixed Bottom Navigation Bar */
    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: c.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: spacing(2.5),
      paddingHorizontal: spacing(4),
      borderTopWidth: 1,
      borderTopColor: c.borderGold,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 8,
    },
    bottomNavItem: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing(3),
    },
    bottomNavLabel: {
      color: c.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      marginTop: 2,
    },
    bottomNavCatalogBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#1E3A8A',
      paddingHorizontal: spacing(5),
      paddingVertical: spacing(2.5),
      borderRadius: radius.full,
      shadowColor: '#1E3A8A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    bottomNavCatalogText: {
      color: '#FFFFFF',
      fontFamily: fonts.heading,
      fontSize: 14,
      fontWeight: '700',
    },
    bottomNavSignInOutlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing(3.5),
      paddingVertical: spacing(2),
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: '#FF4D00',
      backgroundColor: '#FFFFFF',
    },
    bottomNavSignInOutlineText: {
      color: '#FF4D00',
      fontFamily: fonts.heading,
      fontSize: 13,
      fontWeight: '700',
    },

    /* Hero */
    hero: {
      position: 'relative', overflow: 'hidden',
      borderRadius: radius.xl, paddingVertical: spacing(6), paddingHorizontal: spacing(1),
      alignItems: 'center', marginBottom: spacing(9),
    },
    heroWatermark: { position: 'absolute', top: -30, alignSelf: 'center', zIndex: 0 },
    orb: { position: 'absolute', width: 260, height: 260, borderRadius: 130, opacity: 0.5 },
    orbSaffron: { top: -120, right: -100, backgroundColor: 'rgba(255,138,61,0.16)' },
    orbTeal: { bottom: -40, left: -110, backgroundColor: 'rgba(10,15,36,0.12)' },

    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: spacing(3), paddingVertical: spacing(1.5), borderRadius: radius.full,
      backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: 'rgba(255,77,0,0.3)',
      marginBottom: spacing(4),
    },
    badgeText: { color: '#B83300', fontFamily: fonts.label, fontSize: 12 },

    headline: {
      color: c.text, fontFamily: fonts.heading, fontSize: 32, lineHeight: 40,
      textAlign: 'center', letterSpacing: -0.5, marginBottom: spacing(4),
    },
    headlineAccent: {
      color: '#FF4D00',
      fontFamily: fonts.display,
      fontSize: 36,
      letterSpacing: -0.5,
    },

    subhead: {
      color: c.textSecondary, fontFamily: fonts.body, fontSize: 15, lineHeight: 23,
      textAlign: 'center', marginBottom: spacing(6),
    },
    subheadAccent: { color: c.teal, fontFamily: fonts.label },

    ctaGroup: { width: '100%', gap: spacing(3) },
    ctaRow: { flexDirection: 'row', gap: spacing(3) },

    builtForRow: {
      flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
      justifyContent: 'center', gap: 8, marginTop: spacing(6),
    },
    builtForLabel: { color: c.textMuted, fontFamily: fonts.label, fontSize: 11, letterSpacing: 1 },
    builtForItem: { color: c.textSecondary, fontFamily: fonts.label, fontSize: 13 },
    builtForDot: { color: c.textMuted, fontSize: 12 },

    /* Reader mock */
    mock: {
      width: '100%', marginTop: spacing(8),
      backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: radius.xl,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden',
      shadowColor: '#0A0F24', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 30, elevation: 6,
    },
    mockHeader: {
      height: 38, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.35)',
      backgroundColor: 'rgba(255,255,255,0.6)', flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', paddingHorizontal: spacing(3),
    },
    mockDots: { flexDirection: 'row', gap: 6 },
    mockDot: { width: 10, height: 10, borderRadius: 5 },
    mockTag: { fontSize: 9, letterSpacing: 1.5, color: '#4a5470', fontFamily: fonts.label },
    mockBody: { padding: spacing(4), backgroundColor: '#F2F4F8' },
    mockChapter: {
      fontFamily: fonts.heading, fontSize: 16, color: '#18213C',
      borderBottomWidth: 1, borderBottomColor: '#DCE1EA', paddingBottom: spacing(2), marginBottom: spacing(3),
    },
    mockLine: { height: 10, borderRadius: 4, backgroundColor: '#DCE1EA', marginBottom: spacing(2) },
    mockLineHi: { backgroundColor: '#FFE3A3' },
    mockChat: { borderTopWidth: 1, borderTopColor: '#DCE1EA', backgroundColor: '#F2F4F8', padding: spacing(3) },
    mockChatHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing(2.5) },
    mockChatTitle: { fontFamily: fonts.label, fontSize: 12, color: '#18213C' },
    mockBubbleUser: {
      alignSelf: 'flex-end', backgroundColor: '#1E3A8A', borderRadius: 12, borderTopRightRadius: 2,
      paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.5), maxWidth: '85%', marginBottom: spacing(2),
    },
    mockBubbleUserText: { color: '#FFFFFF', fontFamily: fonts.body, fontSize: 11 },
    mockBubbleAi: {
      alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE1EA',
      borderRadius: 12, borderTopLeftRadius: 2, paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.5), maxWidth: '95%',
    },
    mockBubbleAiText: { color: '#2a3556', fontFamily: fonts.body, fontSize: 11, lineHeight: 16 },
    mockCitation: { color: '#FF4D00', fontFamily: fonts.label, fontSize: 11 },

    /* Features */
    featuresHeader: { alignItems: 'center', marginBottom: spacing(6) },
    featuresLabel: { color: c.saffronDeep, fontFamily: fonts.label, fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
    featuresHeading: { color: c.deepBlue, fontFamily: fonts.heading, fontSize: 28, marginTop: spacing(1.5), textAlign: 'center' },
    featuresHeadingAccent: { color: c.saffronDeep },
    featuresSub: { color: c.textSecondary, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: spacing(2) },

    featureGrid: { gap: spacing(4) },
    featureCard: {
      backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.borderGold,
      padding: spacing(5),
      shadowColor: '#0A0F24', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 2,
    },
    featureCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing(4) },
    featureIconHalo: {
      width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
    },
    featureTagPill: {
      paddingHorizontal: spacing(3), paddingVertical: spacing(1),
      backgroundColor: 'rgba(42,53,86,0.05)', borderRadius: radius.full,
      borderWidth: 1, borderColor: 'rgba(42,53,86,0.15)',
    },
    featureTagText: { fontSize: 10, letterSpacing: 0.5, color: '#0A0F24', fontFamily: fonts.label, textTransform: 'uppercase' },
    featureTitle: { color: c.deepBlue, fontFamily: fonts.heading, fontSize: 20, marginBottom: spacing(3) },
    diamondRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing(3) },
    diamondLineShort: { height: 1, width: 28, backgroundColor: '#D98300', opacity: 0.5 },
    diamond: { width: 6, height: 6, backgroundColor: '#FF4D00', transform: [{ rotate: '45deg' }], marginHorizontal: 6 },
    diamondLineLong: { height: 1, width: 44, backgroundColor: '#D98300', opacity: 0.5 },
    featureDesc: { color: '#0A0F24', fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },

    /* Footer */
    footer: { alignItems: 'center', marginTop: spacing(9) },
    footerText: { color: c.textMuted, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  });
}
