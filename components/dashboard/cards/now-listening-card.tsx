"use client"

import Link from "next/link"
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore"
import { getSharedAudio } from "@/lib/audio-engine"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { CardHeading, DashCard } from "@/components/dashboard/cards/dash-card"

const BARS = 28
const HEIGHTS = Array.from({ length: BARS }, (_, i) => 6 + Math.round(Math.abs(Math.sin(i * 1.9)) * 20))

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/** What the student is listening to, read from the global audio store. Empty when nothing is loaded. */
export function NowListeningCard({ index = 0 }: { index?: number }) {
  const bookId = useAudioPlayerStore((s) => s.bookId)
  const bookTitle = useAudioPlayerStore((s) => s.bookTitle)
  const isPlaying = useAudioPlayerStore((s) => s.isPlaying)
  const setPlaying = useAudioPlayerStore((s) => s.setPlaying)
  const position = useAudioPlayerStore((s) => s.positionSeconds)
  const rate = useAudioPlayerStore((s) => s.playbackRate)
  const chapters = useAudioPlayerStore((s) => s.chapters)
  const currentSectionId = useAudioPlayerStore((s) => s.currentSectionId)

  if (!bookId) {
    return (
      <DashCard index={index}>
        <CardHeading icon="headphones" title="Now listening" />
        <p className="text-sm text-bb-muted">Nothing playing. Start an audiobook and it appears here.</p>
        <Link
          href="/catalog?format=AUDIOBOOK"
          className="flex items-center gap-1.5 self-start text-sm font-bold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
        >
          Browse audiobooks <Icon name="arrow-right" size={16} tone="line" />
        </Link>
      </DashCard>
    )
  }

  const section = chapters?.flatMap((c) => c.sections).find((s) => s.id === currentSectionId)
  const duration = section?.durationSeconds || section?.tracks?.[0]?.durationSeconds || 0
  const lit = duration > 0 ? Math.round((Math.min(1, position / duration)) * BARS) : 0

  const toggle = () => {
    const audio = getSharedAudio()
    if (!audio?.src) {
      setPlaying(false)
      window.location.assign(`/player?bookId=${bookId}`)
      return
    }
    if (audio.paused) audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }

  return (
    <DashCard index={index}>
      <CardHeading icon="headphones" title="Now listening" />
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-bb-grad-cobalt shadow-[inset_0_1px_0_rgba(255,255,255,.45),0_12px_22px_-8px_rgba(59,91,219,.85)] focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name={isPlaying ? "pause" : "play"} size={22} tone="onfill" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link href={`/player?bookId=${bookId}`} className="truncate font-bold hover:underline focus-visible:outline-none focus-visible:shadow-focus">
            {section?.title || bookTitle || "Audiobook"}
          </Link>
          <div aria-hidden className="flex h-[30px] items-center gap-[3px] overflow-hidden">
            {HEIGHTS.map((h, i) => (
              <span
                key={i}
                className={cn("w-[3px] shrink-0 rounded-[3px]", i < lit ? "bg-bb-cobalt-light" : "bg-bb-border")}
                style={{
                  height: h,
                  animation: isPlaying ? `bbwave ${0.7 + (i % 5) * 0.12}s ease-in-out ${i * 0.03}s infinite alternate` : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[13px] tabular-nums text-bb-muted">
        <span>{duration > 0 ? `${clock(position)} / ${clock(duration)}` : clock(position)}</span>
        <span className="rounded-full bg-bb-surface-2 px-2 py-0.5 font-bold">{rate}×</span>
      </div>
    </DashCard>
  )
}
