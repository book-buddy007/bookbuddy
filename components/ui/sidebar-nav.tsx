"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Icon, type BBIconName } from "@/components/ui/icon"

export interface NavItem {
  label: string
  href: string
  icon: BBIconName
  badge?: string | number
  /** exact: only highlight on the exact path (use for dashboard roots). Default: prefix match. */
  match?: "exact" | "prefix"
}

export function isNavActive(pathname: string | null, item: Pick<NavItem, "href" | "match">) {
  if (!pathname) return false
  if (item.match === "exact") return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + "/")
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: NavItem[]
  onNavigate?: () => void
  /** Optional heading rendered above the list (role name, section title). */
  heading?: string
}

/**
 * Sidebar navigation list. 44px rows, radius 12, 20px duotone icons. The active row is
 * the navy gradient with white text; its icon keeps the orange fill layer.
 */
export function SidebarNav({ items, onNavigate, heading, className, ...props }: SidebarNavProps) {
  const pathname = usePathname()
  return (
    <nav aria-label={heading ?? "Primary"} className={cn("flex flex-col gap-1", className)} {...props}>
      {heading && (
        <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.1em] text-bb-faint">{heading}</p>
      )}
      {items.map((item) => {
        const active = isNavActive(pathname, item)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold",
              "transition-[background-color,color] duration-[120ms] focus-visible:outline-none focus-visible:shadow-focus",
              active
                ? "bg-bb-navy text-white shadow-[var(--bb-shadow-navy)]"
                : "text-bb-text hover:bg-bb-surface-2"
            )}
          >
            <Icon name={item.icon} size={20} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
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
