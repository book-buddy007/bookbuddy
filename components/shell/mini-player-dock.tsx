"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore"
import { MiniPlayer } from "@/components/ui/mini-player"
import { getSharedAudio } from "@/lib/audio-engine"

/**
 * The mini player, fed by the global audiobook store and driving the shared audio
 * element (lib/audio-engine). Renders nothing until a book is loaded, and hides on the
 * player page itself (the full-screen "Now playing" view). AppShell docks it above the
 * tab bar on phones and floats it bottom-right from tablet up (`skips` adds ±15 s there).
 */
export function MiniPlayerDock({ skips = false, className }: { skips?: boolean; className?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const bookId = useAudioPlayerStore((s) => s.bookId)
  const bookTitle = useAudioPlayerStore((s) => s.bookTitle)
  const bookAuthor = useAudioPlayerStore((s) => s.bookAuthor)
  const coverUrl = useAudioPlayerStore((s) => s.coverUrl)
  const isPlaying = useAudioPlayerStore((s) => s.isPlaying)
  const setPlaying = useAudioPlayerStore((s) => s.setPlaying)
  const position = useAudioPlayerStore((s) => s.positionSeconds)
  const chapters = useAudioPlayerStore((s) => s.chapters)
  const currentSectionId = useAudioPlayerStore((s) => s.currentSectionId)

  if (!bookId || pathname?.startsWith("/player")) return null

  const section = chapters?.flatMap((c) => c.sections).find((s) => s.id === currentSectionId)
  const duration = section?.durationSeconds || section?.tracks?.[0]?.durationSeconds || 0
  const progress = duration > 0 ? (position / duration) * 100 : 0
  const openPlayer = () => router.push(`/player?bookId=${bookId}`)

  const skip = (sec: number) => {
    const audio = getSharedAudio()
    if (!audio?.src) return
    const end = Number.isFinite(audio.duration) ? audio.duration : Infinity
    audio.currentTime = Math.min(end, Math.max(0, audio.currentTime + sec))
  }

  return (
    <MiniPlayer
      className={className}
      title={bookTitle || "Audiobook"}
      subtitle={section?.title || bookAuthor}
      coverUrl={coverUrl}
      playing={isPlaying}
      progress={progress}
      onToggle={() => {
        /* Drive the real element; AudioSessionBridge mirrors its play/pause events into
           the store. Flipping only the store flag, as this used to, showed "playing"
           after the audio had stopped with the player page. */
        const audio = getSharedAudio()
        if (!audio?.src) {
          setPlaying(false)
          openPlayer()
          return
        }
        if (audio.paused) audio.play().catch(() => setPlaying(false))
        else audio.pause()
      }}
      onOpen={openPlayer}
      onSkipBack={skips ? () => skip(-15) : undefined}
      onSkipForward={skips ? () => skip(15) : undefined}
    />
  )
}
