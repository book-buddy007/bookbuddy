/**
 * Book Buddy by VPD — typography for the Expo app (mobile/), matching the web design system:
 *   • Display  — Bricolage Grotesque 600–800 (headings, numbers)
 *   • UI       — Familjen Grotesk 400–700 (body text, labels, buttons)
 *   • Reading  — Newsreader 400–600 (book text, transcripts, quotes)
 *
 * Web loads these with next/font/google and exposes them as --bb-font-display/ui/reading.
 * Mobile loads the same Google Fonts files through @expo-google-fonts/* in
 * mobile/app/_layout.tsx; `native` is the fontFamily string each package registers.
 */

export const families = {
  display: {
    name: 'Bricolage Grotesque',
    webVar: '--bb-font-display',
    native: {
      '600': 'BricolageGrotesque_600SemiBold',
      '700': 'BricolageGrotesque_700Bold',
      '800': 'BricolageGrotesque_800ExtraBold',
    },
  },
  body: {
    name: 'Familjen Grotesk',
    webVar: '--bb-font-ui',
    native: {
      '400': 'FamiljenGrotesk_400Regular',
      '500': 'FamiljenGrotesk_500Medium',
      '600': 'FamiljenGrotesk_600SemiBold',
      '700': 'FamiljenGrotesk_700Bold',
    },
  },
  reading: {
    name: 'Newsreader',
    webVar: '--bb-font-reading',
    native: {
      '400': 'Newsreader_400Regular',
      '500': 'Newsreader_500Medium',
      '600': 'Newsreader_600SemiBold',
    },
  },
} as const;

/** Semantic roles → { family (web), native (RN fontFamily), weight }. */
export const typography = {
  display: { family: families.display.name, native: families.display.native['800'], weight: '800' },
  heading: { family: families.display.name, native: families.display.native['700'], weight: '700' },
  body:    { family: families.body.name,    native: families.body.native['400'],    weight: '400' },
  label:   { family: families.body.name,    native: families.body.native['600'],    weight: '600' },
  reading: { family: families.reading.name, native: families.reading.native['400'], weight: '400' },
} as const;

/** Shared type scale (px) so headings/line-heights match across platforms. */
export const scale = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60,
} as const;
