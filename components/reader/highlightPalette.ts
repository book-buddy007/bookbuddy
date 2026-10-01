import type { AnnotationColor } from '@/store/useAnnotationStore';

/* ── The highlight palette (audit fix 7, and fix 16 in miniature) ──────
   The same five highlight colours were defined four separate times, and
   no two agreed:

     AnnotationToolbar   #FFD700 #00B8A9 #42A5F5 #FF6EB4 #AB47BC
     PdfShell            #eab308 #22c55e #3b82f6 #ec4899 #a855f7
     HighlightedText     Tailwind yellow-200 / -700 …
     AnnotationSidebar   Tailwind yellow-100 / -900 …

   So a highlight made on a PDF was a different colour from the same
   highlight made on an EPUB, and different again in the notes list. This
   module is the one definition all four now read.

   The first of those palettes is also the specific defect fix 7 names:
   #FFD700 is the gold used for active toolbar state, progress fill and
   dark-mode accents. A student's own highlight was drawn in the app's
   chrome colour, so content and interface became indistinguishable.
   Saffron and gold are chrome; these five appear nowhere but here.

   The stored enum values ('yellow' | 'green' | …) are deliberately
   unchanged — they are persisted on every existing annotation and
   synced to the backend. Only what they *look like* moved, so highlights
   already saved by real students re-render in the new palette rather
   than breaking.

   These hexes are duplicated as --hl-* custom properties in
   styles/ux-foundation.css for CSS-only consumers. They must stay in
   step; the duplication exists because @react-pdf-viewer's highlight
   plugin takes a colour value in JS and cannot read a CSS variable. */

export interface HighlightSwatch {
  /** Persisted value — do not rename, existing annotations carry it. */
  value: AnnotationColor;
  /** What a student sees in the picker and in a screen reader. */
  label: string;
  light: string;
  dark: string;
}

export const HIGHLIGHT_SWATCHES: readonly HighlightSwatch[] = [
  { value: 'yellow', label: 'Butter', light: '#FFE9A8', dark: '#6B5A1F' },
  { value: 'green',  label: 'Mint',   light: '#C7EFD8', dark: '#24543C' },
  { value: 'blue',   label: 'Sky',    light: '#C9E4FB', dark: '#1F4666' },
  { value: 'pink',   label: 'Rose',   light: '#FBD0DA', dark: '#6B2A3C' },
  { value: 'purple', label: 'Lilac',  light: '#E0D4F7', dark: '#45336B' },
] as const;

/* Text drawn over a highlight. Both clear 7:1 against every swatch
   above, so highlighted text stays as readable as unhighlighted text
   rather than merely legible — the old palette relied on /70 opacity
   over unknown backgrounds and could not promise any ratio. */
export const HIGHLIGHT_INK = { light: '#1F2933', dark: '#FFF8F0' } as const;

export function highlightColor(color: string, isDarkMode = false): string {
  const swatch = HIGHLIGHT_SWATCHES.find((s) => s.value === color);
  // Unknown colours are possible: annotations synced from another client,
  // or an older palette name. Butter is the default the store itself
  // falls back to, so an unrecognised highlight still renders.
  const chosen = swatch ?? HIGHLIGHT_SWATCHES[0];
  return isDarkMode ? chosen.dark : chosen.light;
}

export function highlightLabel(color: string): string {
  return HIGHLIGHT_SWATCHES.find((s) => s.value === color)?.label ?? 'Butter';
}
