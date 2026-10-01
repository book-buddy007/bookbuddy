"use client"

import * as React from "react"
import { AppShellFrame } from "@/components/shell/app-shell"
import { isDashRole, type DashRole } from "@/lib/nav"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore"

/**
 * Dev-only preview of the app shell with a mock user, so every role's chrome can be
 * reviewed without a login:  /design-system/shell?role=student|teacher|librarian|admin|super-admin
 */
export default function ShellPreviewPage() {
  const [role, setRole] = React.useState<DashRole>("student")
  React.useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const r = q.get("role")
    if (isDashRole(r)) setRole(r)
    // ?audio=1 loads a sample book into the player store so the mini player shows.
    if (q.get("audio") === "1") {
      const s = useAudioPlayerStore.getState()
      s.loadBook("demo", "Concepts of Physics", "H. C. Verma", "", [
        {
          id: "c1", bookId: "demo", title: "Laws of motion", sortOrder: 1,
          sections: [{ id: "s1", chapterId: "c1", title: "7.2 Newton's first law", sortOrder: 1, sectionType: "SECTION", durationSeconds: 600, tracks: [] }],
        },
      ], null)
      s.setPosition(210)
    }
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
