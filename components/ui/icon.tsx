// Book Buddy icon set v3 — "2b: line + soft fill, glossy active". Data: shared/design/bb-icons.json
// (the v3 handoff set plus the v2 utility glyphs the handoff does not redraw).
import * as React from "react"
import ICONS from "@/shared/design/bb-icons.json"

type Glyph = { stroke: string; soft: string; solid: string; hue: "a" | "b" }
const SET = ICONS as Record<string, Glyph>

/** Old v2 names → v3 glyphs. Keeps legacy call sites rendering while they migrate. */
const LEGACY: Record<string, string> = {
  read: "book-open", audiobook: "headphones", sanchika: "flashcards", highlight: "highlighter", goals: "target",
  contents: "list", streak: "flame", class: "users", profile: "user", subscription: "card", branding: "palette",
  overdue: "clock", admin: "shield", pdf: "file", edit: "annotate", flashcard: "flashcards", theme: "moon",
  "shield-check": "shield", x: "close", settings2: "settings",
}

export type BBIconName = keyof typeof ICONS | keyof typeof LEGACY | (string & {})
export type IconTone = "line" | "soft" | "active" | "onfill"

// Gradient surfaces (primary/cobalt buttons) turn every glyph inside them white without each call
// site passing tone="onfill": they set --ic-soft / --ic-soft-o / --ic-solid, which the soft layers
// below read (falling back to the accent colours).

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name" | "ref"> {
  name: BBIconName
  /** Pixel size (width and height). Tailwind `h-* w-*` classes override it. */
  size?: number | string
  /** soft (default) · line · active (accent stroke) · onfill (white, for gradient chips/buttons) */
  tone?: IconTone
  /** a = blaze (default), b = cobalt (AI). Defaults per glyph (Varta, sparkles, brain, lightbulb are b). */
  hue?: "a" | "b"
  /** Legacy v2 prop: false renders the plain line tone. */
  fillLayer?: boolean
  strokeWidth?: number
  /** Accessible label. Icons are decorative (aria-hidden) unless a title is given. */
  title?: string
}

/**
 * The one icon component. A 1.5 stroke in currentColor with a 16% accent fill on the key
 * shape. Inks follow the surrounding text colour, so light/dark theming comes for free;
 * the accent reads --ic-accent / --ic-accent-b.
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 24, tone, hue, fillLayer, strokeWidth, className, title, style, ...rest },
  ref
) {
  const g = SET[name as string] ?? SET[LEGACY[name as string] ?? ""]
  if (!g) {
    if (process.env.NODE_ENV !== "production") console.warn("[Icon] unknown name:", name)
    return null
  }
  const t: IconTone = tone ?? (fillLayer === false ? "line" : "soft")
  const h = hue ?? g.hue
  const acc = h === "b" ? "var(--ic-accent-b, #3B5BDB)" : "var(--ic-accent, #FF4D00)"
  const px = typeof size === "number" ? size : parseFloat(size)
  const sw = strokeWidth ?? (px <= 18 ? 1.7 : px >= 40 ? 1.35 : 1.5)
  const ink = t === "active" ? acc : t === "onfill" ? "#fff" : "currentColor"
  const softFill = t === "onfill" ? "#fff" : `var(--ic-soft, ${acc})`
  const solidFill = t === "line" ? "currentColor" : t === "onfill" ? "#fff" : `var(--ic-solid, ${acc})`
  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      style={{ display: "block", overflow: "visible", flex: "none", ...style }}
      {...rest}
    >
      {t !== "line" && g.soft && (
        <g style={{ fill: softFill, opacity: t === "onfill" ? 0.24 : "var(--ic-soft-o, 0.16)" }} stroke="none" dangerouslySetInnerHTML={{ __html: g.soft }} />
      )}
      {g.stroke && (
        <g style={{ stroke: ink }} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" dangerouslySetInnerHTML={{ __html: g.stroke }} />
      )}
      {g.solid && <g style={{ fill: solidFill }} stroke="none" dangerouslySetInnerHTML={{ __html: g.solid }} />}
    </svg>
  )
})

/** Props accepted by the lucide-compatible wrappers in `components/ui/icons.tsx`. */
export type CompatIconProps = Omit<IconProps, "name" | "strokeWidth"> & {
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
}

/** Build a drop-in replacement for a lucide-react icon backed by a design-system glyph. */
export function createIcon(name: BBIconName, displayName: string) {
  const Component = React.forwardRef<SVGSVGElement, CompatIconProps>(function CompatIcon(
    { strokeWidth: _sw, absoluteStrokeWidth: _abs, ...props },
    ref
  ) {
    return <Icon ref={ref} name={name} {...props} />
  })
  Component.displayName = displayName
  return Component
}
