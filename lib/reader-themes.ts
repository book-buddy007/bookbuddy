/**
 * eBook reader themes. The values mirror the `[data-reader=…]` blocks in
 * styles/bb-tokens.css; they are repeated here because epub.js renders each chapter in an
 * iframe, which cannot read the parent page's CSS variables.
 */
export type ReaderThemeKey = "paper" | "sepia" | "night"

export interface ReaderPalette {
  key: ReaderThemeKey
  label: string
  bg: string
  ink: string
  sub: string
  highlight: string
  panel: string
  border: string
  track: string
}

export const READER_PALETTES: Record<ReaderThemeKey, ReaderPalette> = {
  paper: { key: "paper", label: "Paper", bg: "#FBFBFD", ink: "#0A0F24", sub: "#4A5470", highlight: "#FFE3A3", panel: "#FFFFFF", border: "#E6EAF1", track: "#EEF1F6" },
  sepia: { key: "sepia", label: "Sepia", bg: "#F6EEDF", ink: "#3B2F22", sub: "#75634C", highlight: "#EBCB8B", panel: "#FBF5EA", border: "#E3D5BC", track: "#EDE2CC" },
  night: { key: "night", label: "Night", bg: "#0A0F24", ink: "#E6EAF1", sub: "#A9B4D0", highlight: "rgba(255,181,71,0.32)", panel: "#121A33", border: "#1A2340", track: "#1A2340" },
}

/** The persisted reader store keeps the legacy names; the design calls them Paper / Sepia / Night. */
export type StoreReaderTheme = "light" | "dark" | "eye-comfort"

export const toReaderKey = (theme: StoreReaderTheme | string): ReaderThemeKey =>
  theme === "dark" ? "night" : theme === "eye-comfort" ? "sepia" : "paper"

export const fromReaderKey = (key: ReaderThemeKey): StoreReaderTheme =>
  key === "night" ? "dark" : key === "sepia" ? "eye-comfort" : "light"

/** Text sizes offered in the Display panel (desktop). Tablet reads +2, phone −2 around these. */
export const READER_TEXT_SIZES = [17, 19, 21, 23] as const

export const READER_FONTS = [
  { value: "Newsreader", label: "Newsreader", stack: "'Newsreader', Georgia, serif" },
  { value: "Familjen Grotesk", label: "Familjen", stack: "'Familjen Grotesk', system-ui, sans-serif" },
] as const

/** Resolve whatever font name the store holds (it may still be a legacy one) to a design stack. */
export function readerFontStack(name: string): string {
  const hit = READER_FONTS.find((f) => f.value === name)
  if (hit) return hit.stack
  return /inter|sans/i.test(name) ? READER_FONTS[1].stack : READER_FONTS[0].stack
}

/** Google Fonts stylesheet injected into each epub iframe so the reading faces load there too. */
export const READER_FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&display=swap"
