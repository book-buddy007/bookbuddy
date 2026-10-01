"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { isNavActive, type NavItem } from "@/components/ui/sidebar-nav"

interface BottomTabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: NavItem[]
  /** Rendered directly above the tabs inside the same fixed dock (the MiniPlayer). */
  above?: React.ReactNode
}

/**
 * Phone dock: a persistent slot for the MiniPlayer above an 84px tab bar (plus the home
 * indicator inset). Active tab shows the orange fill layer; inactive tabs are faint with
 * no fill. Hidden from md up, where the sidebar takes over.
 */
export function BottomTabBar({ items, above, className, ...props }: BottomTabBarProps) {
  const pathname = usePathname()
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-40 md:hidden", className)} {...props}>
      {above && <div className="px-3 pb-2">{above}</div>}
      <nav
        aria-label="Primary"
        className="border-t border-bb-border bg-bb-surface/95 pb-[var(--bb-safe-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex h-[84px] max-w-xl items-stretch justify-around px-2 pt-2">
          {items.map((item) => {
            const active = isNavActive(pathname, item)
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full min-h-11 flex-col items-center justify-start gap-1 rounded-xl pt-1.5 text-[11px] font-semibold",
                    "focus-visible:outline-none focus-visible:shadow-focus",
                    active ? "text-bb-text" : "text-bb-faint"
                  )}
                >
                  <Icon name={item.icon} size={26} fillLayer={active} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
