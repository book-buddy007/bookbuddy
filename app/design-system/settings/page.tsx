"use client"

import { AppShellFrame } from "@/components/shell/app-shell"
import SettingsPage from "@/app/settings/page"

/** Dev-only preview of /settings inside the shell. Signed out, so sessions show their error state. */
export default function SettingsPreview() {
  return (
    <AppShellFrame
      section="student"
      user={{ name: "Aarav Mehta", email: "aarav@example.com", role: "student", accountType: "institutional" }}
      onLogout={() => undefined}
      disableNotifications
    >
      <SettingsPage />
    </AppShellFrame>
  )
}
