import type React from "react"

// The student chrome (sidebar rail, header search, notifications, bottom tab bar) now
// comes from the shared AppShell mounted in app/dashboard/layout.tsx.
export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
