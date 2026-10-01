import type React from "react"

// The super-admin chrome (sidebar sections, header, theme toggle) now comes from the
// shared AppShell mounted in app/dashboard/layout.tsx; nav items live in lib/nav.ts.
export default function SuperAdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
