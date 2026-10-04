"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { NAV_GLOSS, useActiveHref, type NavItem } from "@/components/ui/sidebar-nav"

interface BottomTabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: NavItem[]
  /** Rendered directly above the tabs inside the same fixed dock (the MiniPlayer). */
  above?: React.ReactNode
  /** Adds a trailing "More" tab that calls this (opens the full nav sheet). */
  onMore?: () => void
}

const tabBase =
  "flex h-full min-h-11 w-full flex-col items-center justify-end gap-1 rounded-xl text-[11px] focus-visible:outline-none focus-visible:shadow-focus"

/** The icon disc: 34px and flat when idle, a 50px gloss circle that springs up 14px when active. */
function Disc({ icon, active, ai }: { icon: NavItem["icon"]; active: boolean; ai?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "transition-[transform,background-color,box-shadow,width,height] [transition-duration:350ms] ease-spring",
        "motion-reduce:transition-none",
        active ? cn("h-[50px] w-[50px] -translate-y-3.5", ai ? NAV_GLOSS.ai : NAV_GLOSS.blaze) : "h-[34px] w-[34px] text-bb-muted"
      )}
    >
      <Icon name={icon} size={22} tone={active ? "onfill" : "soft"} />
    </span>
  )
}

/**
 * Phone dock: a persistent slot for the MiniPlayer above a floating frosted tab bar (inset 12px,
 * radius 26, 70px). The active tab rises into a gloss circle (cobalt for AI items); labels are
 * 11px. Hidden from md up, where the sidebar takes over.
 */
export function BottomTabBar({ items, above, onMore, className, ...props }: BottomTabBarProps) {
  const activeHref = useActiveHref(items)
  const count = items.length + (onMore ? 1 : 0)
  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-[calc(12px+var(--bb-safe-bottom))] z-40 flex flex-col gap-2 md:hidden",
        className
      )}
      {...props}
    >
      {above && <div className="empty:hidden">{above}</div>}
      <nav
        aria-label="Primary"
        className="grid h-[70px] items-end rounded-[26px] border border-bb-border px-1.5 pb-2 shadow-[0_20px_40px_-20px_rgba(10,15,36,.5)] [-webkit-backdrop-filter:var(--bb-glass-filter)] [backdrop-filter:var(--bb-glass-filter)] bg-[var(--bb-glass-surface)]"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = item.href === activeHref
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(tabBase, active ? "font-extrabold text-bb-text" : "font-semibold text-bb-muted")}
            >
              <Disc icon={item.icon} active={active} ai={item.ai} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        {onMore && (
          <button type="button" onClick={onMore} className={cn(tabBase, "font-semibold text-bb-muted")}>
            <Disc icon="more" active={false} />
            <span>More</span>
          </button>
        )}
      </nav>
    </div>
  )
}
