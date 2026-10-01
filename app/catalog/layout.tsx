import type React from "react"
import { AppShell } from "@/components/shell/app-shell"

// Signed-in users get the app shell (sidebar / tab bar); public visitors see the bare page.
export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
