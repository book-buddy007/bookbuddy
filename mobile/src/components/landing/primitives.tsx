import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts, radius, spacing } from '@/theme';

/**
 * Landing primitives + the literal "Indic" palette used across the marketing
 * sections. These mirror the web landing, which is light-only and uses literal
 * hexes per section — so the mobile landing uses the same literals to match web
 * exactly, independent of the app's light/dark token theme.
 */
export const INDIC = {
  saffron: '#FF9933',
  burnt: '#B45309',
  burntDark: '#92400E',
  amber: '#D97706',
  gold: '#FCD34D',
  goldDark: '#B8860B',
  teal: '#006A6E',
  tealDark: '#004D40',
  deepBlue: '#0D1B6E',
  indigoNight: '#1A237E',
  red: '#C62828',
  purple: '#9333EA',
  brown: '#3E2723',
  cream: '#FFFDE7',
  cream2: '#FEF3C7',
  white: '#FFFFFF',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  green600: '#16A34A',
} as const;

/** Centered section header: eyebrow label + heading (with accent) + subhead. */
export function SectionHeader({
  label,
  labelColor = INDIC.burnt,
  labelIcon,
  headingLead,
  headingAccent,
  accentColor = INDIC.burnt,
  headingColor = INDIC.deepBlue,
  sub,
  subColor = INDIC.brown,
}: {
  label: string;
  labelColor?: string;
  labelIcon?: keyof typeof Ionicons.glyphMap;
  headingLead: string;
  headingAccent?: string;
  accentColor?: string;
  headingColor?: string;
  sub: string;
  subColor?: string;
}) {
  return (
    <View style={ph.headerWrap}>
      <View style={ph.labelRow}>
        {labelIcon && <Ionicons name={labelIcon} size={16} color={labelColor} />}
        <Text style={[ph.label, { color: labelColor }]}>{label}</Text>
      </View>
      <Text style={[ph.heading, { color: headingColor }]}>
        {headingLead}
        {headingAccent ? <Text style={{ color: accentColor }}> {headingAccent}</Text> : null}
      </Text>
      <Text style={[ph.sub, { color: subColor }]}>{sub}</Text>
    </View>
  );
}

/** Small rounded pill badge with an icon (mirrors web's inline-flex badges). */
export function Badge({
  icon,
  text,
  color,
  bg = 'rgba(255,255,255,0.9)',
  border,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  text: string;
  color: string;
  bg?: string;
  border?: string;
}) {
  return (
    <View style={[ph.badge, { backgroundColor: bg, borderColor: border ?? `${color}33` }]}>
      {icon && <Ionicons name={icon} size={14} color={color} />}
      <Text style={[ph.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

const ph = StyleSheet.create({
  headerWrap: { alignItems: 'center', marginBottom: spacing(7) },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fonts.label, fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
  heading: { fontFamily: fonts.heading, fontSize: 27, lineHeight: 33, textAlign: 'center', marginTop: spacing(2) },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: spacing(2.5) },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: spacing(3), paddingVertical: spacing(1.5),
    borderRadius: radius.full, borderWidth: 1,
  },
  badgeText: { fontFamily: fonts.label, fontSize: 13 },
});

/** Shared section wrapper: vertical rhythm + optional background color. */
export function Section({
  children,
  bg = 'transparent',
  style,
}: {
  children: React.ReactNode;
  bg?: string;
  style?: any;
}) {
  return <View style={[{ backgroundColor: bg, paddingVertical: spacing(9), paddingHorizontal: spacing(5) }, style]}>{children}</View>;
}
