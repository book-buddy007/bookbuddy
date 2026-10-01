"use client"

import * as React from "react"
import { AppShellFrame } from "@/components/shell/app-shell"
import { isDashRole, type DashRole } from "@/lib/nav"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"

/**
 * Dev-only preview of the app shell with a mock user, so every role's chrome can be
 * reviewed without a login:  /design-system/shell?role=student|teacher|librarian|admin|super-admin
 */
export default function ShellPreviewPage() {
  const [role, setRole] = React.useState<DashRole>("student")
  React.useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("role")
    if (isDashRole(r)) setRole(r)
  }, [])

  return (
    <AppShellFrame
      section={role}
      user={{ name: "Aarav Mehta", email: "aarav@example.com", role, accountType: "institutional" }}
      onLogout={() => undefined}
      disableNotifications
    >
      <PageHeader eyebrow={role} title="Shell preview" description="Mock content inside the shared app shell." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard variant="featured" title="Books borrowed" value="1,284" icon="library" />
        <StatCard title="Overdue" value={23} icon="overdue" />
        <StatCard title="Readers" value="842" icon="class" />
        <StatCard title="Hours listened" value="96" icon="audiobook" />
      </div>
    </AppShellFrame>
  )
}
