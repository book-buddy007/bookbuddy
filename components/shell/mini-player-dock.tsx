"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore"
import { MiniPlayer } from "@/components/ui/mini-player"

/**
 * Persistent phone mini player, fed by the global audiobook player store. Renders nothing
 * until a book has been loaded into the player, and stays hidden on the player page itself
 * (which is the full-screen "Now playing" view).
 */
export function MiniPlayerDock() {
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

  return (
    <MiniPlayer
      title={bookTitle || "Audiobook"}
      subtitle={section?.title || bookAuthor}
      coverUrl={coverUrl}
      playing={isPlaying}
      progress={progress}
      onToggle={() => setPlaying(!isPlaying)}
      onOpen={() => router.push(`/player?bookId=${bookId}`)}
    />
  )
}
