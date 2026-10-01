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
}

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
  /** Icon-only below the `lg` breakpoint (tablet rail); labels show from `lg` up. */
  collapseBelowLg?: boolean
}

/**
 * Sidebar navigation list. 44px rows, radius 12, 20px duotone icons. The active row is
 * the navy gradient with white text; its icon keeps the orange fill layer.
 */
export function SidebarNav({ items, onNavigate, heading, collapseBelowLg, className, ...props }: SidebarNavProps) {
  const activeHref = useActiveHref(items)
  return (
    <nav aria-label={heading ?? "Primary"} className={cn("flex flex-col gap-1", className)} {...props}>
      {heading && (
        <p
          className={cn(
            "px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.1em] text-bb-faint",
            collapseBelowLg && "hidden lg:block"
          )}
        >
          {heading}
        </p>
      )}
      {items.map((item) => {
        const active = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapseBelowLg ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold",
              "transition-[background-color,color] duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus",
              collapseBelowLg && "justify-center lg:justify-start",
              active ? "bg-bb-navy text-white shadow-[var(--bb-shadow-navy)]" : "text-bb-text hover:bg-bb-surface-2"
            )}
          >
            <Icon name={item.icon} size={20} className="shrink-0" />
            <span className={cn("min-w-0 flex-1 truncate", collapseBelowLg && "sr-only lg:not-sr-only")}>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  collapseBelowLg && "hidden lg:inline",
                  active ? "bg-white/15 text-white" : "bg-bb-accent-soft text-bb-accent-ink"
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
