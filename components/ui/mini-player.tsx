"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { BookCover } from "@/components/ui/book-cover"

export interface MiniPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  subject?: string | null
  coverUrl?: string | null
  playing: boolean
  /** 0–100 position through the current chapter. */
  progress?: number
  onToggle: () => void
  /** Tap the card body to expand into the full-screen player. */
  onOpen?: () => void
  onSkipBack?: () => void
  onSkipForward?: () => void
}

/**
 * Persistent phone player above the tab bar: navy, radius 20, 64px tall, with a thin
 * orange progress line. Tapping the body opens the full-screen "Now playing" view.
 */
export function MiniPlayer({
  title,
  subtitle,
  subject,
  coverUrl,
  playing,
  progress = 0,
  onToggle,
  onOpen,
  onSkipBack,
  onSkipForward,
  className,
  ...props
}: MiniPlayerProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-[20px] bg-bb-navy text-white shadow-e2", className)}
      {...props}
    >
      <div className="flex h-16 items-center gap-3 pl-3 pr-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:shadow-focus rounded-xl"
          aria-label={`Open player: ${title}`}
        >
          <BookCover title={title} subject={subject} coverUrl={coverUrl} width={34} height={46} className="shadow-none" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{title}</span>
            {subtitle && <span className="block truncate text-xs text-white/65">{subtitle}</span>}
          </span>
        </button>
        {onSkipBack && (
          <button type="button" onClick={onSkipBack} aria-label="Back 15 seconds" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus">
            <Icon name="rewind" size={22} className="text-white" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bb-primary text-white shadow-gloss focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name={playing ? "pause" : "play"} size={22} fillLayer={false} />
        </button>
        {onSkipForward && (
          <button type="button" onClick={onSkipForward} aria-label="Forward 30 seconds" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus">
            <Icon name="fast-forward" size={22} className="text-white" />
          </button>
        )}
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] bg-white/15">
        <div className="h-full bg-bb-progress" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </div>
  )
}
