/**
 * Book Buddy by VPD — CANONICAL TYPOGRAPHY (single source of truth)
 * ---------------------------------------------------------------------------
 * The gap today:
 *   • Web loads  Yatra One (display) + Plus Jakarta Sans (body) via next/font,
 *     and Noto Sans Devanagari for Hindi.
 *   • Mobile loads NO custom fonts — it falls back to the system face
 *     (San Francisco on iOS, Roboto on Android). That's the whole mismatch.
 *
 * To converge on the SAME FONT FILE (not just the same name — metrics differ
 * between next/font and system fallbacks), the wiring step will:
 *   • Ship the actual .ttf files under shared/design/fonts/.
 *   • Web:    load via next/font/local pointing at those files (replacing the
 *             next/font/google import in app/layout.tsx) OR keep next/font/google
 *             (same family, self-hosted) — decision noted below.
 *   • Mobile: load the same .ttf via expo-font useFonts() in app/_layout.tsx,
 *             then set fontFamily from `families` below.
 *
 * `webVar` = the CSS variable each family is exposed as on web (already wired in
 * app/layout.tsx). `native` = the fontFamily string mobile registers, which is
 * the export key from the matching @expo-google-fonts package (same TTF file
 * that next/font/google serves on web).
 */

export const families = {
  display: {
    name: 'Yatra One',
    webVar: '--font-display',
    // from @expo-google-fonts/yatra-one — single weight (400); its heavy design reads bold.
    native: { '400': 'YatraOne_400Regular' },
  },
  body: {
    name: 'Plus Jakarta Sans',
    webVar: '--font-body',
    // from @expo-google-fonts/plus-jakarta-sans
    native: {
      '400': 'PlusJakartaSans_400Regular',
      '500': 'PlusJakartaSans_500Medium',
      '600': 'PlusJakartaSans_600SemiBold',
      '700': 'PlusJakartaSans_700Bold',
      '800': 'PlusJakartaSans_800ExtraBold',
    },
  },
} as const;

/** Semantic roles → { family (web), native (RN fontFamily), weight }. */
export const typography = {
  display: { family: families.display.name, native: families.display.native['400'], weight: '400' },
  heading: { family: families.body.name,    native: families.body.native['800'],    weight: '800' },
  body:    { family: families.body.name,    native: families.body.native['400'],    weight: '400' },
  label:   { family: families.body.name,    native: families.body.native['600'],    weight: '600' },
} as const;

/** Shared type scale (px) so headings/line-heights match across platforms. */
export const scale = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60,
} as const;
