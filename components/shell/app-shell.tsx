"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { cn } from "@/lib/utils"
import { BrandLockup, BrandMark } from "@/components/ui/brand-mark"
import { SidebarNav, type NavItem } from "@/components/ui/sidebar-nav"
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

/**
 * The authenticated app frame.
 *  - desktop (lg+): 272px sidebar with labels
 *  - tablet (md):   72px icon rail, same items
 *  - phone:         bottom tab bar with the MiniPlayer docked above it; the full nav,
 *                   theme and sign-out live in a "More" sheet opened from the avatar.
 * With no signed-in user (public catalog browsing) only the content renders — the
 * children stay mounted in the same place so nothing remounts when the session resolves.
 */
export function AppShellFrame({ children, user, onLogout, section, disableNotifications }: AppShellFrameProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  React.useEffect(() => setMoreOpen(false), [pathname])

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
    <div className="min-h-dvh bg-bb-bg text-bb-text">
      {chrome && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col border-r border-bb-border bg-bb-surface md:flex lg:w-[272px]">
          <Link
            href={nav.home}
            aria-label="Book Buddy home"
            className="flex h-[72px] shrink-0 items-center justify-center px-4 focus-visible:outline-none focus-visible:shadow-focus lg:justify-start lg:px-6"
          >
            <BrandMark height={22} className="lg:hidden" />
            <BrandLockup size={20} className="hidden lg:inline-flex" />
          </Link>
          <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
            <SidebarNav items={nav.items} heading={ROLE_LABEL[resolved]} collapseBelowLg />
            {switchItems.length > 0 && <SidebarNav items={switchItems} heading="Switch dashboard" collapseBelowLg />}
          </div>
        </aside>
      )}

      <div className={cn(chrome && "md:pl-[76px] lg:pl-[272px]")}>
        {chrome && user && (
          <header className="sticky top-0 z-20 border-b border-bb-border bg-bb-bg/85 pt-[var(--bb-safe-top)] backdrop-blur">
            <div className="mx-auto flex h-[68px] w-full max-w-[1600px] items-center gap-3 px-5 sm:px-6 md:px-10 lg:px-14">
              <Link href={nav.home} aria-label="Book Buddy home" className="md:hidden">
                <BrandLockup size={18} />
              </Link>
              <form role="search" onSubmit={onSearch} className="hidden max-w-xl flex-1 md:block">
                <SearchInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search the library"
                  placeholder="Search the library"
                />
              </form>
              <div className="ml-auto flex items-center gap-1.5">
                <NotificationBell enabled={chrome && !disableNotifications} settingsHref="/settings" />
                <div className="hidden md:block">
                  <UserMenu user={user} profileHref={profileHref} onLogout={onLogout} />
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-label="Open menu"
                  className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:shadow-focus md:hidden"
                >
                  <UserAvatar user={user} className="h-9 w-9" />
                </button>
              </div>
            </div>
          </header>
        )}

        <main className={cn(chrome && "mx-auto w-full max-w-[1600px] px-5 pb-40 pt-6 sm:px-6 md:px-10 md:pb-12 lg:px-14")}>
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
          <div className="fixed bottom-5 right-5 z-40 hidden w-[380px] md:block">
            <MiniPlayerDock skips />
          </div>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetContent side="bottom" className="md:hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div aria-hidden className="mx-auto -mt-2 mb-4 h-1.5 w-10 rounded-full bg-bb-border" />
              <div className="mb-4 flex items-center gap-3">
                <UserAvatar user={user} className="h-11 w-11" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name || "Your account"}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">{ROLE_LABEL[resolved]}</p>
                </div>
              </div>
              <SidebarNav items={nav.items} onNavigate={() => setMoreOpen(false)} />
              {switchItems.length > 0 && (
                <SidebarNav className="mt-3" items={switchItems} heading="Switch dashboard" onNavigate={() => setMoreOpen(false)} />
              )}
              <div className="mt-5 space-y-3 border-t border-bb-border pt-4">
                <ThemeToggle fullWidth />
                <div className="grid grid-cols-2 gap-3">
                  <Button asChild variant="outline" size="md">
                    <Link href="/settings" onClick={() => setMoreOpen(false)}>
                      <Icon name="settings" size={18} /> Settings
                    </Link>
                  </Button>
                  <Button variant="danger-soft" onClick={() => onLogout()}>
                    <Icon name="logout" size={18} /> Sign out
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
