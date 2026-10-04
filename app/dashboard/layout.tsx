"use client"

import type React from "react"

import { SidebarProvider } from "@/components/sidebar-provider"
import { AppShell } from "@/components/shell/app-shell"
import { useAuthStore } from "@/store/useAuthStore"
import { Icon } from "@/components/ui/icon"

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { isAuthenticated, isLoading } = useAuthStore()

  // NOTE: Auth redirects to /login are handled by middleware.ts (single source of truth).
  // No client-side redirect here — this prevents the infinite loop.

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bb-bg">
        <div className="text-center" role="status">
          <Icon name="loader" size={40} className="mx-auto mb-4 animate-spin" />
          <p className="font-medium text-bb-muted">Verifying authentication…</p>
        </div>
      </div>
    )
  }

  // Don't render the dashboard if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // One shell for every role: the sidebar, tab bar and header follow the dashboard
  // section in the URL (see lib/nav.ts).
  return (
    <SidebarProvider>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  )
}
