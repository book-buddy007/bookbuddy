"use client"

import * as React from "react"
import Link from "next/link"
import apiClient from "@/lib/apiClient"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/components/ui/use-mobile"

interface Notification {
  id: string | number
  title: string
  message?: string
  body?: string
  isRead?: boolean
}

/**
 * Bell + unread badge. A popover on tablet/desktop and a bottom sheet on phones.
 * Data flow is unchanged from the previous per-role headers: GET /notifications, optimistic
 * PATCH /notifications/:id/read and POST /notifications/read-all.
 */
export function NotificationBell({ enabled = true, settingsHref = "/settings" }: { enabled?: boolean; settingsHref?: string }) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState<Notification[]>([])
  const [unread, setUnread] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) return
    apiClient
      .get("/notifications")
      .then((res) => {
        const data: Notification[] = res.data?.data || res.data || []
        setItems(data)
        // Use the count the API computes; Prisma's field is `isRead`, not `read`.
        setUnread(typeof res.data?.unreadCount === "number" ? res.data.unreadCount : data.filter((n) => !n.isRead).length)
      })
      .catch(() => {
        setItems([])
        setUnread(0)
      })
  }, [enabled])

  const markRead = async (id: Notification["id"]) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    setUnread((c) => Math.max(0, c - 1))
    try {
      await apiClient.patch(`/notifications/${id}/read`)
    } catch {
      /* corrected on next load */
    }
  }

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnread(0)
    try {
      await apiClient.post("/notifications/read-all")
    } catch {
      /* corrected on next load */
    }
  }

  const trigger = (
    <button
      type="button"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      onClick={isMobile ? () => setOpen(true) : undefined}
      className="relative flex h-11 w-11 items-center justify-center rounded-full bg-bb-surface text-bb-text shadow-e1 transition-colors hover:bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus"
    >
      <Icon name="bell" size={21} />
      {unread > 0 && (
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 h-[9px] w-[9px] rounded-full bg-bb-blaze shadow-[0_0_0_2px_var(--bb-surface),0_0_10px_#FF4D00]"
        />
      )}
    </button>
  )

  const list = (
    <>
      <div className="flex items-center justify-between px-5 py-4">
        <h3 className="font-display text-lg font-extrabold tracking-[-0.03em]">Notifications</h3>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-[13px] font-semibold text-bb-accent-ink hover:underline">
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-[60dvh] divide-y divide-bb-surface-2 overflow-y-auto border-y border-bb-surface-2 md:max-h-80">
        {items.length > 0 ? (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-bb-hover"
            >
              <span aria-hidden className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-bb-accent")} />
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold", n.isRead && "text-bb-muted")}>{n.title}</span>
                <span className="mt-0.5 block text-[13px] text-bb-muted">{n.message || n.body}</span>
              </span>
            </button>
          ))
        ) : (
          <p className="px-5 py-8 text-center text-sm text-bb-muted">You&apos;re all caught up.</p>
        )}
      </div>
      <Link
        href={settingsHref}
        onClick={() => setOpen(false)}
        className="block px-5 py-3 text-center text-[13px] font-semibold text-bb-accent-ink hover:bg-bb-hover"
      >
        Notification preferences
      </Link>
    </>
  )

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <div aria-hidden className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-bb-border" />
            {list}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] rounded-bb-lg p-0">
        {list}
      </PopoverContent>
    </Popover>
  )
}
