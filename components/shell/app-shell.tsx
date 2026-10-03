"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { cn } from "@/lib/utils"
import { BrandLockup, BrandMark } from "@/components/ui/brand-mark"
import { NAV_GLOSS, SidebarNav, useActiveHref, type NavItem } from "@/components/ui/sidebar-nav"
import { BottomTabBar } from "@/components/ui/bottom-tab-bar"
import { SearchInput } from "@/components/ui/search-input"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/shell/notification-bell"
import { UserAvatar, UserMenu, type ShellUser } from "@/components/shell/user-menu"
import { MiniPlayerDock } from "@/components/shell/mini-player-dock"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { ROLE_LABEL, accessibleSections, navForRole, normaliseRole, sectionFromPath, type DashRole } from "@/lib/nav"

const SECTION_ICON: Record<DashRole, NavItem["icon"]> = {
  student: "book-open",
  teacher: "users",
  librarian: "library",
  admin: "shield",
  "super-admin": "institution",
}

/** localStorage key for the sidebar's collapsed state ("1" = collapsed to the 80px rail). */
const COLLAPSED_KEY = "bb-shell-collapsed"

const glass =
  "bg-[var(--bb-glass-surface)] [-webkit-backdrop-filter:var(--bb-glass-filter)] [backdrop-filter:var(--bb-glass-filter)]"

interface AppShellFrameProps {
  children: React.ReactNode
  /** Signed-in user, or null for public visitors (then only the content renders). */
  user: ShellUser | null
  onLogout: () => void | Promise<void>
  /** Skip the notifications fetch (design-system preview with a mock user). */
  disableNotifications?: boolean
  /** Force a dashboard section. Defaults to the one in the URL, then the user's own role. */
  section?: DashRole
}

/** The "More" sheet's 3-column grid of icon tiles. */
function NavTiles({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  const activeHref = useActiveHref(items)
  return (
    <nav aria-label="All sections" className="grid grid-cols-3 gap-2.5">
      {items.map((item) => {
        const active = item.href === activeHref
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-2 rounded-[20px] px-1.5 py-3.5 text-xs font-bold focus-visible:outline-none focus-visible:shadow-focus",
              active ? (item.ai ? NAV_GLOSS.ai : NAV_GLOSS.blaze) : "bg-bb-surface-2 text-bb-muted"
            )}
          >
            <Icon name={item.icon} size={24} tone={active ? "onfill" : "soft"} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * The authenticated app frame.
 *  - desktop (lg+): 272px frosted sidebar, collapsible to an 80px rail (button or the `[` key,
 *                   remembered in localStorage)
 *  - tablet (md):   the 80px rail, same items
 *  - phone:         floating frosted tab bar with the MiniPlayer docked above it; the full nav,
 *                   theme and sign-out live in a "More" sheet opened from the avatar.
 * With no signed-in user (public catalog browsing) only the content renders — the
 * children stay mounted in the same place so nothing remounts when the session resolves.
 */
export function AppShellFrame({ children, user, onLogout, section, disableNotifications }: AppShellFrameProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [collapsed, setCollapsed] = React.useState(false)
  // The padding transition only runs after the stored state has been applied, so a collapsed
  // sidebar does not animate in from expanded on every page load.
  const [animate, setAnimate] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => setMoreOpen(false), [pathname])

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1")
    } catch {
      /* private mode: stay expanded */
    }
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const inField = !!t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)
      if (e.key === "[" && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
        toggleCollapsed()
      } else if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        if (searchRef.current) {
          e.preventDefault()
          searchRef.current.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggleCollapsed])

  const chrome = !!user
  const resolved: DashRole = section ?? sectionFromPath(pathname) ?? (normaliseRole(user?.role) ?? "student")
  const nav = navForRole(resolved, { independent: user?.accountType === "INDEPENDENT" })
  const others = accessibleSections(user?.role).filter((s) => s !== resolved)
  const switchItems: NavItem[] = others.map((s) => ({
    label: ROLE_LABEL[s],
    href: navForRole(s).home,
    icon: SECTION_ICON[s],
    match: "exact",
  }))
  const profileHref = resolved === "student" ? "/dashboard/student/profile" : "/settings"

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/catalog?search=${encodeURIComponent(q)}` : "/catalog")
  }

  return (
    <div className="relative min-h-dvh w-full min-w-0 flex-1 bg-bb-bg text-bb-text">
      {chrome && (
        <>
          {/* Soft corner glows behind the frosted chrome. */}
          <div aria-hidden className="pointer-events-none fixed -left-[10%] -top-[20%] z-0 h-[60%] w-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(59,91,219,.16),transparent)]" />
          <div aria-hidden className="pointer-events-none fixed -bottom-1/4 -right-[10%] z-0 h-[60%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(255,77,0,.12),transparent)]" />

          {/* Sidebar (lg+, expanded) */}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col border-r border-bb-border",
              glass,
              !collapsed && "lg:flex"
            )}
            aria-label="Sidebar"
          >
            <div className="flex h-[72px] shrink-0 items-center gap-2.5 px-6">
              <Link href={nav.home} aria-label="Book Buddy home" className="rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
                <BrandLockup size={20} />
              </Link>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Collapse sidebar"
                title="Collapse sidebar  ["
                className="-mr-2.5 ml-auto flex h-9 w-9 items-center justify-center rounded-[11px] text-bb-muted transition-colors hover:bg-bb-surface-2 hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus"
              >
                <Icon name="panel-left-close" size={20} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3.5 pb-3.5 pt-1">
              <SidebarNav items={nav.items} heading={ROLE_LABEL[resolved]} />
              {switchItems.length > 0 && (
                <>
                  <div aria-hidden className="mx-2.5 mb-1 mt-3 h-px bg-bb-border" />
                  <SidebarNav items={switchItems} heading="Switch dashboard" variant="switch" />
                </>
              )}
            </div>
            {user && (
              <div className="mx-3.5 mb-3.5 flex shrink-0 items-center gap-3 rounded-[18px] bg-bb-surface p-3 shadow-e1">
                <UserAvatar user={user} className="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{user.name || "Your account"}</p>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-bb-accent-ink">{ROLE_LABEL[resolved]}</p>
                </div>
                <Link
                  href="/settings"
                  aria-label="Settings"
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-bb-surface-2 text-bb-muted transition-colors hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus"
                >
                  <Icon name="settings" size={18} />
                </Link>
              </div>
            )}
          </aside>

          {/* Rail (md always; lg+ when the sidebar is collapsed) */}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-1.5 border-r border-bb-border py-[18px] md:flex",
              glass,
              !collapsed && "lg:hidden"
            )}
            aria-label="Sidebar"
          >
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              title="Expand sidebar  ["
              className="mb-1 hidden h-10 w-10 items-center justify-center rounded-xl bg-bb-surface text-bb-muted shadow-e1 transition-colors hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus lg:flex"
            >
              <Icon name="panel-left" size={20} />
            </button>
            <Link href={nav.home} aria-label="Book Buddy home" className="mb-3.5 rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
              <BrandMark height={22} />
            </Link>
            <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto">
              <SidebarNav items={nav.items} variant="rail" heading={ROLE_LABEL[resolved]} />
            </div>
            {user && (
              <Link href={profileHref} aria-label="Profile" title="Profile" className="mt-auto rounded-full focus-visible:outline-none focus-visible:shadow-focus">
                <UserAvatar user={user} className="h-[42px] w-[42px] text-[13px]" />
              </Link>
            )}
          </aside>
        </>
      )}

      <div
        className={cn(
          "relative z-[1]",
          chrome && "md:pl-20",
          chrome && (collapsed ? "lg:pl-20" : "lg:pl-[272px]"),
          chrome && animate && "md:transition-[padding-left] md:duration-[240ms] md:ease-bb"
        )}
      >
        {chrome && user && (
          <header className={cn("sticky top-0 z-20 border-b border-bb-border pt-[var(--bb-safe-top)]", glass)}>
            <div className="mx-auto flex h-[62px] w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 md:h-[72px] md:px-10 lg:px-14">
              <Link href={nav.home} aria-label="Book Buddy home" className="md:hidden">
                <BrandLockup size={18} />
              </Link>
              <form role="search" onSubmit={onSearch} className="hidden max-w-[520px] flex-1 md:block">
                <SearchInput
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search the library"
                  placeholder="Search the library"
                  shortcut
                  className="h-11"
                />
              </form>
              <div className="ml-auto flex items-center gap-1.5">
                <Link
                  href="/catalog"
                  aria-label="Search the library"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-bb-text focus-visible:outline-none focus-visible:shadow-focus md:hidden"
                >
                  <Icon name="search" size={22} tone="line" />
                </Link>
                <NotificationBell enabled={chrome && !disableNotifications} settingsHref="/settings" />
                <div className="hidden md:block">
                  <UserMenu user={user} profileHref={profileHref} onLogout={onLogout} />
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-label="Open menu"
                  className="flex h-11 w-11 items-center justify-center rounded-full shadow-[0_8px_16px_-8px_rgba(255,77,0,.6)] focus-visible:outline-none focus-visible:shadow-focus md:hidden"
                >
                  <UserAvatar user={user} className="h-11 w-11" />
                </button>
              </div>
            </div>
          </header>
        )}

        <main className={cn(chrome && "mx-auto w-full max-w-[1600px] px-4 pb-48 pt-5 sm:px-6 md:px-10 md:pb-12 md:pt-7 lg:px-14")}>
          {chrome && pathname === nav.home && <InstallPrompt className="mb-6" />}
          {children}
        </main>
      </div>

      {chrome && user && (
        <>
          <BottomTabBar
            items={nav.tabs}
            above={<MiniPlayerDock />}
            onMore={nav.tabs.length < 5 ? () => setMoreOpen(true) : undefined}
          />
          {/* Tablet / desktop: the tab bar is hidden, so the mini player floats bottom-right.
              Playback continues after leaving the player, so it needs a control at every width. */}
          <div className="fixed bottom-5 right-5 z-40 hidden w-[340px] md:block xl:w-[380px]">
            <MiniPlayerDock skips />
          </div>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetContent side="bottom" className="md:hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div aria-hidden className="mx-auto -mt-2 mb-3 h-[5px] w-10 rounded-full bg-bb-border" />
              <div className="mb-4 flex items-center gap-3 pr-12">
                <UserAvatar user={user} className="h-[46px] w-[46px]" />
                <div className="min-w-0">
                  <p className="truncate font-bold">{user.name || "Your account"}</p>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-bb-accent-ink">{ROLE_LABEL[resolved]}</p>
                </div>
              </div>
              <NavTiles items={nav.items} onNavigate={() => setMoreOpen(false)} />
              {switchItems.length > 0 && (
                <SidebarNav className="mt-3" items={switchItems} heading="Switch dashboard" variant="switch" onNavigate={() => setMoreOpen(false)} />
              )}
              <div className="mt-5 space-y-3">
                <ThemeToggle fullWidth />
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/settings"
                    onClick={() => setMoreOpen(false)}
                    className="flex h-[46px] items-center justify-center gap-2 rounded-[14px] bg-bb-surface-2 text-sm font-bold focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    <Icon name="settings" size={18} /> Settings
                  </Link>
                  <Button variant="danger-soft" className="h-[46px] rounded-[14px]" onClick={() => onLogout()}>
                    <Icon name="logout" size={18} tone="line" /> Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}

/** Store-backed shell used by the real routes. */
export function AppShell({ children, section }: { children: React.ReactNode; section?: DashRole }) {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  return (
    <AppShellFrame
      user={user}
      section={section}
      onLogout={async () => {
        await logout()
        router.push("/login")
      }}
    >
      {children}
    </AppShellFrame>
  )
}
