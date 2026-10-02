/**
 * Book Buddy by VPD — design tokens for the Expo app (mobile/).
 * ---------------------------------------------------------------------------
 * The values are the navy + blaze design system (the web app's styles/bb-tokens.css):
 * navy #0A0F24, blaze #FF4D00, cloud #F2F4F8, cobalt #1E3A8A, with light and dark modes.
 *
 * The SHAPE is the one the mobile app was written against (saffron / teal / gold / indigo
 * slot names from the earlier "Indic" palette). Renaming every slot would touch ~90 files,
 * so the slots are kept and re-pointed at their design-system equivalents:
 *
 *   accent.saffron*  → blaze scale (primary action)     accent.teal*   → cobalt / periwinkle
 *   accent.gold*     → amber / cream (warm highlight)    accent.indigo* → cobalt-light (links)
 *   accent.deepBlue  → navy                              accent.pink    → highlight rose
 *   border.gold/teal/indigo → soft blaze / cobalt / periwinkle hairlines
 *
 * New mobile code should prefer the semantic slots (bg, text, border.default,
 * accent.saffron for the primary action, accent.danger/success/warning).
 * Framework-agnostic on purpose: plain strings only.
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
    inverse: string;    // text on blaze / navy fills
  };
  border: {
    default: string;
    gold: string;
    teal: string;
    indigo: string;
  };
  accent: {
    // Primary action: blaze
    saffron: string;
    saffronDeep: string;
    saffronDark: string;
    // Warm highlights: amber / cream
    gold: string;
    goldHi: string;
    // Cool secondary: cobalt
    teal: string;
    tealDeep: string;
    deepBlue: string;    // navy
    // Links / tertiary
    indigo: string;
    indigoDark: string;
    // Decorative (highlight rose)
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
  // ── LIGHT — cloud background, white cards, navy ink ─────────────────────
  light: {
    bg: {
      page: '#F2F4F8',
      card: '#FFFFFF',
      surfaceAlt: '#E6EAF1',
      glass: 'rgba(255, 255, 255, 0.86)',
    },
    text: {
      primary: '#0A0F24',
      secondary: '#4A5470',
      muted: '#8E9AB8',
      inverse: '#FFFFFF',
    },
    border: {
      default: '#DCE1EA',
      gold: 'rgba(255, 77, 0, 0.28)',
      teal: 'rgba(30, 58, 138, 0.25)',
      indigo: 'rgba(59, 91, 219, 0.3)',
    },
    accent: {
      saffron: '#FF4D00',
      saffronDeep: '#D93A00',
      saffronDark: '#B83300',
      gold: '#D98300',
      goldHi: '#FFE3A3',
      teal: '#1E3A8A',
      tealDeep: '#0F1F5C',
      deepBlue: '#0A0F24',
      indigo: '#3B5BDB',
      indigoDark: '#1E3A8A',
      pink: '#F4B3C2',
      danger: '#E5283A',
      success: '#0E9A4A',
      warning: '#D98300',
    },
    gradient: {
      heroFrom: '#0A0F24',
      heroTo: '#1E3A8A',
    },
  },

  // ── DARK — navy background (the app's default) ──────────────────────────
  dark: {
    bg: {
      page: '#0A0F24',
      card: '#121A33',
      surfaceAlt: '#18213C',
      glass: 'rgba(18, 26, 51, 0.86)',
    },
    text: {
      primary: '#F2F4F8',
      secondary: '#A9B4D0',
      muted: '#8E9AB8',
      inverse: '#FFFFFF',
    },
    border: {
      default: '#2A3556',
      gold: 'rgba(255, 138, 61, 0.35)',
      teal: 'rgba(91, 124, 255, 0.35)',
      indigo: 'rgba(125, 151, 255, 0.35)',
    },
    accent: {
      // Brighter steps where a navy surface needs more contrast.
      saffron: '#FF4D00',
      saffronDeep: '#FF8A3D',
      saffronDark: '#D93A00',
      gold: '#FFB547',
      goldHi: '#FFE3A3',
      teal: '#5B7CFF',
      tealDeep: '#3B5BDB',
      deepBlue: '#1E3A8A',
      indigo: '#7D97FF',
      indigoDark: '#5B7CFF',
      pink: '#F4B3C2',
      danger: '#FF5468',
      success: '#3DDC84',
      warning: '#FFB547',
    },
    gradient: {
      heroFrom: '#121A33',
      heroTo: '#0A0F24',
    },
  },
};

export type ThemeMode = keyof typeof tokens;
export type Tokens = TokenSchema;
