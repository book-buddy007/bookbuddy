import { tokens, ThemeMode, Tokens, TokenSchema } from './tokens';
import { typography, families, scale } from '@shared/design/typography';

/**
 * Flattened, screen-friendly color set derived from the canonical tokens.
 * Mobile defaults to LIGHT to match the web app's appearance (the product
 * requirement is that mobile looks/behaves exactly like web). Dark remains
 * available via the ThemeProvider toggle.
 *
 * PRIMARY brand action = saffron / burnt-orange (web's identity), NOT indigo.
 */
export interface ColorTokens {
  bg: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  surface: string;
  surfaceAlt: string;
  surfaceGlass: string;
  border: string;
  borderGold: string;
  borderTeal: string;
  borderIndigo: string;
  text: string;
  textMuted: string;
  textSecondary: string;
  textInverse: string;
  // Primary action (buttons / active states) — saffron family
  primary: string;
  primaryDark: string;
  primaryText: string;
  // Warm brand
  saffron: string;
  saffronDeep: string;
  saffronDark: string;
  saffronLight: string;
  gold: string;
  goldText: string;
  // Cool brand
  teal: string;
  tealDeep: string;
  deepBlue: string;
  indigo: string;
  indigoDark: string;
  // Decorative + semantic
  pink: string;
  danger: string;
  success: string;
  warning: string;
}

/** Derive the flat ColorTokens for a given mode from the canonical tokens. */
export function makeColors(mode: ThemeMode): ColorTokens {
  const t = tokens[mode];
  return {
    bg: t.bg.page,
    bgGradientStart: t.gradient.heroFrom,
    bgGradientEnd: t.gradient.heroTo,
    surface: t.bg.card,
    surfaceAlt: t.bg.surfaceAlt,
    surfaceGlass: t.bg.glass,
    border: t.border.default,
    borderGold: t.border.gold,
    borderTeal: t.border.teal,
    borderIndigo: t.border.indigo,
    text: t.text.primary,
    textMuted: t.text.muted,
    textSecondary: t.text.secondary,
    textInverse: t.text.inverse,
    primary: t.accent.saffronDeep,
    primaryDark: t.accent.saffronDark,
    primaryText: t.text.inverse,
    saffron: t.accent.saffron,
    saffronDeep: t.accent.saffronDeep,
    saffronDark: t.accent.saffronDark,
    saffronLight: mode === 'light' ? '#FEF3C7' : 'rgba(255,153,51,0.15)',
    gold: t.accent.gold,
    goldText: t.accent.goldHi,
    teal: t.accent.teal,
    tealDeep: t.accent.tealDeep,
    deepBlue: t.accent.deepBlue,
    indigo: t.accent.indigo,
    indigoDark: t.accent.indigoDark,
    pink: t.accent.pink,
    danger: t.accent.danger,
    success: t.accent.success,
    warning: t.accent.warning,
  };
}

/**
 * Static default color set — LIGHT to match web. Screens that haven't yet been
 * migrated to the reactive `useThemeColors()` hook import this. Ported screens
 * should prefer the hook so the light/dark toggle works.
 */
export const colors: ColorTokens = makeColors('light');

export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

/** Font families for RN (registered via expo-font in app/_layout.tsx). */
export const fonts = {
  display: typography.display.native,   // Yatra One
  heading: typography.heading.native,   // Plus Jakarta Sans (bold)
  body: typography.body.native,         // Plus Jakarta Sans
  label: typography.label.native,
};

export { tokens, typography, families, scale };
export type { ThemeMode, Tokens, TokenSchema };
