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

const BARS = 34
// Fixed pseudo-random bar heights (4–16px): the same silhouette every render.
const HEIGHTS = Array.from({ length: BARS }, (_, i) => 4 + Math.round(Math.abs(Math.sin(i * 1.9)) * 12))

/** Small waveform: bars up to `progress` are lit cobalt; they only animate while playing. */
function Waveform({ playing, progress }: { playing: boolean; progress: number }) {
  const lit = Math.round((Math.min(100, Math.max(0, progress)) / 100) * BARS)
  return (
    <div aria-hidden className="flex h-[18px] items-center gap-0.5 overflow-hidden">
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={cn("w-0.5 shrink-0 rounded-sm", i < lit ? "bg-[#7D97FF]" : "bg-white/[.22]")}
          style={{
            height: h,
            animation: playing ? `bbwave ${0.7 + (i % 5) * 0.12}s ease-in-out ${i * 0.03}s infinite alternate` : undefined,
          }}
        />
      ))}
    </div>
  )
}

const iconBtn =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#A9B4D0] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:shadow-focus"

/**
 * Persistent player: dark glass card (--bb-glass-dark, radius 22), a cover tile, title with a
 * small waveform, optional skips and a cobalt gloss play button. Tapping the body opens the
 * full-screen "Now playing" view.
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
      className={cn(
        "relative overflow-hidden rounded-[22px] border border-white/10 bg-[var(--bb-glass-dark)] text-[#F2F4F8]",
        "shadow-[0_24px_40px_-20px_rgba(10,15,36,.8)] backdrop-blur-[18px]",
        className
      )}
      {...props}
    >
      <div className="flex min-h-16 items-center gap-3 py-2.5 pl-2.5 pr-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:shadow-focus"
          aria-label={`Open player: ${title}`}
        >
          <BookCover title={title} subject={subject} coverUrl={coverUrl} width={34} height={46} className="shadow-none" />
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="truncate text-sm font-bold">{title}</span>
            {subtitle ? <span className="truncate text-xs text-[#A9B4D0]">{subtitle}</span> : null}
            <Waveform playing={playing} progress={progress} />
          </span>
        </button>
        {onSkipBack && (
          <button type="button" onClick={onSkipBack} aria-label="Back 15 seconds" className={iconBtn}>
            <Icon name="rewind" size={20} tone="line" />
          </button>
        )}
        {onSkipForward && (
          <button type="button" onClick={onSkipForward} aria-label="Forward 15 seconds" className={iconBtn}>
            <Icon name="skip-forward" size={20} tone="line" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bb-grad-cobalt text-white shadow-glow-cobalt focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name={playing ? "pause" : "play"} size={18} tone="onfill" />
        </button>
      </div>
    </div>
  )
}
