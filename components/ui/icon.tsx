import * as React from "react"
import { bbIcons, type BBIconName } from "@/lib/bb-icons"

export type { BBIconName }

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name" | "ref"> {
  name: BBIconName
  /** Pixel size (width and height). Tailwind `h-* w-*` classes override it. */
  size?: number | string
  /** Hide the orange fill layer (inactive tab-bar items, disabled states). */
  fillLayer?: boolean
  /** Accessible label. Icons are decorative (aria-hidden) unless a title is given. */
  title?: string
}

/**
 * The one icon component. Duotone: an accent-orange fill layer at 0.9 opacity under a
 * currentColor stroke (1.8, round caps). Inks follow the surrounding text colour, so
 * light/dark theming comes for free.
 */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 24, fillLayer = true, title, className, ...rest },
  ref
) {
  const glyph = bbIcons[name]
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
      {...rest}
    >
      {fillLayer && glyph.fill ? <path d={glyph.fill} fill="var(--bb-accent)" opacity={0.9} /> : null}
      {glyph.stroke ? (
        <path
          d={glyph.stroke}
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : null}
    </svg>
  )
})

/** Props accepted by the lucide-compatible wrappers in `components/ui/icons.tsx`. */
export type CompatIconProps = Omit<IconProps, "name"> & {
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
