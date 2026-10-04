"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Icon, type BBIconName } from "@/components/ui/icon"

export interface NavItem {
  label: string
  /** May carry a query (`/catalog?format=AUDIOBOOK`); the query must match for the item to be active. */
  href: string
  icon: BBIconName
  badge?: string | number
  /** exact: only active on the exact path (dashboard roots). Default: prefix match. */
  match?: "exact" | "prefix"
  /** AI surface (Varta, Sanchika): the active state is cobalt gloss instead of blaze gloss. */
  ai?: boolean
}

/** Active-state gloss: blaze for actions, cobalt for AI items. */
export const NAV_GLOSS = {
  blaze: "bg-bb-primary text-white shadow-glow-blaze",
  ai: "bg-bb-grad-cobalt text-white shadow-glow-cobalt",
} as const

/**
 * Pick the single best-matching item for the current URL. Longest path wins, and an item
 * whose query matches beats a sibling that shares its path (Library vs Listen on /catalog).
 */
export function pickActiveHref(items: NavItem[], pathname: string | null, search = ""): string | undefined {
  if (!pathname) return undefined
  const have = new URLSearchParams(search)
  let best: NavItem | undefined
  let bestScore = -1
  for (const item of items) {
    const [path, qs] = item.href.split("?")
    const pathHit = item.match === "exact" ? pathname === path : pathname === path || pathname.startsWith(path + "/")
    if (!pathHit) continue
    let score = path.length * 10
    if (qs) {
      let ok = true
      new URLSearchParams(qs).forEach((v, k) => {
        if (have.get(k) !== v) ok = false
      })
      if (!ok) continue
      score += 5
    }
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return best?.href
}

/** Active href for a nav list, tracking the live query string without needing a Suspense boundary. */
export function useActiveHref(items: NavItem[]) {
  const pathname = usePathname()
  const [search, setSearch] = React.useState("")
  React.useEffect(() => {
    const s = window.location.search
    setSearch((prev) => (prev === s ? prev : s))
  })
  return pickActiveHref(items, pathname, search)
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: NavItem[]
  onNavigate?: () => void
  /** Optional heading rendered above the list (role name, section title). */
  heading?: string
  /**
   * full: 44px labelled rows (sidebar, 272px). rail: 50px squircles with tooltips (80px rail).
   * switch: the quieter "Switch dashboard" rows with an arrow-up-right.
   */
  variant?: "full" | "rail" | "switch"
}

const focusRing = "focus-visible:outline-none focus-visible:shadow-focus"

/**
 * Sidebar navigation list. The active row is a blaze gloss pill with white text and an `onfill`
 * icon; AI items (Varta, Sanchika) use cobalt gloss. Idle rows are muted with a soft icon and a
 * surface-2 hover. Headings are 11px uppercase faint.
 */
export function SidebarNav({ items, onNavigate, heading, variant = "full", className, ...props }: SidebarNavProps) {
  const activeHref = useActiveHref(items)

  if (variant === "rail") {
    return (
      <nav aria-label={heading ?? "Primary"} className={cn("flex flex-col items-center gap-1.5", className)} {...props}>
        {items.map((item) => {
          const active = item.href === activeHref
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl",
                "transition-[background-color,box-shadow,transform] [transition-duration:250ms] ease-bb",
                focusRing,
                active
                  ? cn(item.ai ? NAV_GLOSS.ai : NAV_GLOSS.blaze, "scale-[1.04]")
                  : "text-bb-muted hover:bg-bb-surface-2 hover:text-bb-text"
              )}
            >
              <Icon name={item.icon} size={22} tone={active ? "onfill" : "soft"} />
            </Link>
          )
        })}
      </nav>
    )
  }

  if (variant === "switch") {
    return (
      <nav aria-label={heading ?? "Switch dashboard"} className={cn("flex flex-col gap-[3px]", className)} {...props}>
        {heading && <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-bb-faint">{heading}</p>}
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-[14px] px-2.5 text-sm font-semibold text-bb-muted [@media(pointer:coarse)]:h-11",
              "transition-colors duration-bb-micro hover:bg-bb-surface-2 hover:text-bb-text",
              focusRing
            )}
          >
            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <Icon name="arrow-up-right" size={14} tone="line" className="text-bb-faint" />
          </Link>
        ))}
      </nav>
    )
  }

  return (
    <nav aria-label={heading ?? "Primary"} className={cn("flex flex-col gap-[3px]", className)} {...props}>
      {heading && <p className="px-3 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-bb-faint">{heading}</p>}
      {items.map((item) => {
        const active = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-3 rounded-[14px] px-2.5 text-[15px]",
              "transition-[background-color,box-shadow,color] [transition-duration:250ms] ease-bb",
              focusRing,
              active
                ? cn(item.ai ? NAV_GLOSS.ai : NAV_GLOSS.blaze, "font-bold")
                : "font-semibold text-bb-muted hover:bg-bb-surface-2 hover:text-bb-text"
            )}
          >
            <span
              className={cn(
                "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px]",
                active && "bg-white/[.16]"
              )}
            >
              <Icon name={item.icon} size={20} tone={active ? "onfill" : "soft"} />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-extrabold",
                  active ? "bg-white/[.22] text-white" : "bg-bb-info-soft text-bb-info-ink"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
