/**
 * Book Buddy by VPD — CANONICAL DESIGN TOKENS (single source of truth)
 * ---------------------------------------------------------------------------
 * Consumed by BOTH:
 *   • Web  (app/)     — mapped into CSS variables in app/globals.css + Tailwind
 *   • Mobile (mobile/) — consumed by src/ThemeProvider.tsx + StyleSheet
 *
 * Decision (confirmed): token-driven with BOTH light + dark. "Parity" means an
 * identical token set + identical screen structure/copy across platforms; each
 * platform keeps its default mode (web = light, mobile = dark) but can switch.
 *
 * Framework-agnostic on purpose: plain strings only, no React Native or web
 * imports, so it is safe to bundle in either target.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RECONCILIATION NOTES (why these hexes — please sanity-check the ⚠ ones):
 *   Web has NO single palette today; colors come from three conflicting sources:
 *     1. shadcn vars in globals.css  → generic BLUE (--primary: 207 100% 45%)
 *     2. home.module.css             → LIGHT Indic override (saffron #d97706, gold #b45309)
 *     3. styles/indic-design-system.css → saffron #FF6B35 / deep-saffron #FF9933 / gold #FFD700
 *   …plus inline hero hexes: teal #006A6E, deep-blue #0D1B6E, gold #FCD34D, pink #E91E8C.
 *   The old mobile tokens used saffron #FF9933 + indigo #6366F1 (indigo is NOT
 *   used anywhere on web). Below reconciles these into ONE brand palette:
 *     • Primary brand action  = SAFFRON / burnt-orange (web's identity)   ⚠ was indigo on mobile
 *     • Cool secondary accent = TEAL #006A6E (web's hero accent)          ⚠ new — replaces indigo as secondary
 *     • indigo kept as a tertiary/link accent for continuity.
 *   Change any value here and it propagates to both apps.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface TokenSchema {
  bg: {
    page: string;       // app / page background
    card: string;       // primary card / surface
    surfaceAlt: string; // secondary surface (inputs, subtle panels)
    glass: string;      // translucent overlay surface
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;    // text on saffron/teal fills
  };
  border: {
    default: string;
    gold: string;
    teal: string;
    indigo: string;
  };
  accent: {
    // Primary brand action (buttons, active states) — saffron family
    saffron: string;
    saffronDeep: string; // burnt-orange, web's actual CTA fill (#B45309)
    saffronDark: string; // amber-600 hover (#D97706)
    // Warm highlights
    gold: string;
    goldHi: string;      // bright highlight (#FCD34D)
    // Cool secondary / brand teal
    teal: string;
    tealDeep: string;
    deepBlue: string;    // web hero deep indigo-blue (#0D1B6E)
    // Tertiary / links (legacy mobile accent)
    indigo: string;
    indigoDark: string;
    // Decorative
    pink: string;
    // Semantic
    danger: string;
    success: string;
    warning: string;
  };
  gradient: {
    heroFrom: string;
    heroTo: string;
  };
}

export const tokens: Record<'light' | 'dark', TokenSchema> = {
  // ── LIGHT — Web "Indic parchment" (default on web) ──────────────────────
  light: {
    bg: {
      page: '#F8FAFC',       // home.module.css --night-ink (light override)
      card: '#FFFDE7',       // saffron-cream card
      surfaceAlt: '#F1F5F9',
      glass: 'rgba(255, 253, 231, 0.95)',
    },
    text: {
      primary: '#0F172A',    // slate-900 (web hero headline)
      secondary: '#334155',
      muted: '#64748B',
      inverse: '#FFFFFF',
    },
    border: {
      default: '#E2E8F0',
      gold: '#D97706',
      teal: 'rgba(0, 106, 110, 0.35)',
      indigo: '#818CF8',
    },
    accent: {
      saffron: '#FF9933',
      saffronDeep: '#B45309', // web primary CTA fill
      saffronDark: '#92400E', // web CTA hover
      gold: '#D97706',
      goldHi: '#FCD34D',
      teal: '#006A6E',        // web hero brand teal
      tealDeep: '#0F5A5D',
      deepBlue: '#0D1B6E',
      indigo: '#6366F1',
      indigoDark: '#4F46E5',
      pink: '#E91E8C',
      danger: '#E11D48',
      success: '#059669',
      warning: '#D97706',
    },
    gradient: {
      heroFrom: '#EEF2FF',
      heroTo: '#FFF8E1',
    },
  },

  // ── DARK — Mobile "night slate glass" (default on mobile) ────────────────
  dark: {
    bg: {
      page: '#0B1120',
      card: '#151C2C',
      surfaceAlt: '#1E2740',
      glass: 'rgba(21, 28, 44, 0.85)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1',
      muted: '#94A3B8',
      inverse: '#0B1120',
    },
    border: {
      default: '#2A3350',
      gold: 'rgba(245, 197, 66, 0.35)',
      teal: 'rgba(45, 212, 191, 0.35)',
      indigo: 'rgba(99, 102, 241, 0.35)',
    },
    accent: {
      // Hues stay constant across modes (brand identity); only tuned where a
      // dark surface needs a brighter value for contrast.
      saffron: '#FF9933',
      saffronDeep: '#F97316',
      saffronDark: '#D97706',
      gold: '#F5C542',
      goldHi: '#FDE047',
      teal: '#2DD4BF',        // brightened teal for dark bg
      tealDeep: '#14B8A6',
      deepBlue: '#4F46E5',
      indigo: '#6366F1',
      indigoDark: '#4F46E5',
      pink: '#F472B6',
      danger: '#F43F5E',
      success: '#10B981',
      warning: '#F59E0B',
    },
    gradient: {
      heroFrom: '#151C2C',
      heroTo: '#0B1120',
    },
  },
};

export type ThemeMode = keyof typeof tokens;
export type Tokens = TokenSchema;
