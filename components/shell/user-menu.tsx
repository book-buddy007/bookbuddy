"use client"

import * as React from "react"
import Link from "next/link"
import type { User } from "@/store/useAuthStore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icon } from "@/components/ui/icon"
import { ThemeToggle } from "@/components/theme-toggle"
import { ROLE_LABEL, normaliseRole } from "@/lib/nav"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function userInitials(name?: string | null) {
  return name ? name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase() : "BB"
}

/** The slice of the session user the shell needs; keeps the shell testable without the auth store. */
export type ShellUser = Pick<User, "name" | "email" | "role"> & Partial<Pick<User, "avatar" | "accountType">>

/**
 * Avatar inside the blaze-to-cobalt gradient ring (--bb-grad-ring). `className` sizes the whole
 * ring (e.g. "h-11 w-11"); the photo or initials sit in a 2px-inset disc.
 */
export function UserAvatar({ user, className }: { user?: ShellUser | null; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 rounded-full bg-bb-ring p-0.5", className)}>
      <Avatar className="h-full w-full bg-bb-surface">
        <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} alt="" />
        <AvatarFallback className="bg-bb-surface text-[0.8em] font-extrabold text-bb-text">{userInitials(user?.name)}</AvatarFallback>
      </Avatar>
    </span>
  )
}

/** Avatar dropdown (tablet/desktop): profile, settings, theme, sign out. Phones use the "More" sheet. */
export function UserMenu({ user, profileHref, onLogout }: { user: ShellUser; profileHref: string; onLogout: () => void }) {
  const dashRole = normaliseRole(user.role)
  const role = dashRole ? ROLE_LABEL[dashRole] : user.role

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex h-11 w-11 items-center justify-center rounded-full shadow-[0_8px_16px_-8px_rgba(255,77,0,.6)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:shadow-focus"
        >
          <UserAvatar user={user} className="h-11 w-11" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{user.name || "Your account"}</p>
          <p className="truncate text-xs text-bb-muted">{user.email}</p>
          {role && <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">{role}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profileHref}>
            <Icon name="user" size={18} /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Icon name="settings" size={18} /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-1.5 py-1.5" onClick={(e) => e.stopPropagation()}>
          <ThemeToggle className="w-full [&>button]:flex-1 [&>button]:px-2" />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onLogout} className="text-bb-danger-ink focus:bg-bb-danger-soft focus:text-bb-danger-ink">
          <Icon name="logout" size={18} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
