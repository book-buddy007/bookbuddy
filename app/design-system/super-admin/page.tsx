"use client"

import * as React from "react"
import { AddUserSheet } from "@/app/dashboard/super-admin/users/components/AddUserSheet"
import { PurgeBookDialog } from "@/app/dashboard/super-admin/catalog/PurgeBookDialog"
import { SubscriptionForm } from "@/app/dashboard/super-admin/subscriptions/components/SubscriptionForm"

/**
 * Dev-only preview of super-admin dialogs (the real pages need a super-admin login):
 * /design-system/super-admin?show=user|purge|subscription
 * Submitting does nothing here.
 */
export default function SuperAdminDialogsPreview() {
  const [show, setShow] = React.useState<string | null>(null)
  React.useEffect(() => {
    setShow(new URLSearchParams(window.location.search).get("show") ?? "user")
  }, [])
  const close = () => setShow(null)

  return (
    <main className="min-h-dvh bg-bb-bg p-8 text-bb-text">
      <p className="text-sm text-bb-muted">Super-admin dialog preview. Use ?show=user|purge|subscription.</p>
      <AddUserSheet open={show === "user"} onOpenChange={(o) => !o && close()} institutions={[]} onSubmit={async () => undefined} />
      <PurgeBookDialog open={show === "purge"} onOpenChange={(o) => !o && close()} book={{ id: "demo", title: "Concepts of Physics", author: "H. C. Verma" }} />
      <SubscriptionForm open={show === "subscription"} onClose={close} onSubmit={() => undefined} isLoading={false} tenants={[]} plans={[]} />
    </main>
  )
}
