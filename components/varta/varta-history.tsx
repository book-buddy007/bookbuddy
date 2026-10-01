"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { timeAgo, type VartaActivity } from "@/components/varta/use-varta-data"

type Chat = VartaActivity["recentChats"][number]

const DAY = 864e5
function group(chats: Chat[]) {
  const now = Date.now()
  const g: { label: string; items: Chat[] }[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ]
  for (const c of chats) {
    const age = now - new Date(c.createdAt).getTime()
    g[age < DAY ? 0 : age < 7 * DAY ? 1 : 2].items.push(c)
  }
  return g.filter((x) => x.items.length > 0)
}

interface VartaHistoryProps {
  chats: Chat[]
  loading?: boolean
  activeBookId?: string
  onSelect: (bookId: string) => void
  onNew: () => void
  className?: string
}

/** Navy history rail: "New chat" (gloss), search, and conversations grouped by recency with a book tag. */
export function VartaHistory({ chats, loading, activeBookId, onSelect, onNew, className }: VartaHistoryProps) {
  const [q, setQ] = React.useState("")
  const filtered = React.useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? chats.filter((c) => c.preview.toLowerCase().includes(s) || c.bookTitle.toLowerCase().includes(s)) : chats
  }, [chats, q])

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-4 bg-bb-navy p-4 text-white", className)}>
      <Button onClick={onNew} className="w-full" size="md">
        <Icon name="plus" size={18} fillLayer={false} /> New chat
      </Button>
      <label className="relative block">
        <span className="sr-only">Search conversations</span>
        <Icon name="search" size={18} fillLayer={false} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search chats"
          className="h-11 w-full rounded-full border-[1.5px] border-transparent bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus-visible:border-bb-accent focus-visible:outline-none focus-visible:shadow-focus"
        />
      </label>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {loading ? (
          <p className="px-1 text-sm text-white/60">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-1 text-sm text-white/60">{q ? "No chats match." : "Your conversations will appear here."}</p>
        ) : (
          group(filtered).map((g) => (
            <section key={g.label}>
              <h3 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.1em] text-white/50">{g.label}</h3>
              <ul className="space-y-1">
                {g.items.map((c, i) => (
                  <li key={`${c.bookId}-${c.createdAt}-${i}`}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.bookId)}
                      className={cn(
                        "w-full rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:shadow-focus",
                        c.bookId === activeBookId ? "bg-white/15" : "hover:bg-white/10"
                      )}
                    >
                      <span className="line-clamp-2 text-sm font-medium leading-snug">{c.preview}</span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <span className="max-w-[70%] truncate rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                          {c.bookTitle}
                        </span>
                        <span className="text-[11px] text-white/50">{timeAgo(c.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
