"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import apiClient from "@/lib/apiClient"
import { getSharedAudio, sectionKey } from "@/lib/audio-engine"
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore"

/**
 * Keeps an audiobook going while the player is minimised.
 *
 * On /player the full player owns the shared audio element (its own listeners,
 * media-session handlers, sleep timer and progress sync). Everywhere else this
 * component does the same jobs in a smaller way, so the mini player tells the
 * truth and playback behaves the same:
 * - mirrors play / pause / position into the store,
 * - advances to the next section at the end of a track (using the URL the player
 *   prefetched, or a fresh one), honouring "sleep at end of section",
 * - runs the sleep timer, syncs progress every 30 s, and answers the OS media controls.
 * Renders nothing.
 */
export function AudioSessionBridge() {
  const pathname = usePathname()
  const onPlayer = !!pathname?.startsWith("/player")
  const bookId = useAudioPlayerStore((s) => s.bookId)
  const isPlaying = useAudioPlayerStore((s) => s.isPlaying)
  const sleepTimerRemaining = useAudioPlayerStore((s) => s.sleepTimerRemaining)
  const active = !onPlayer && !!bookId

  // Audio element → store
  React.useEffect(() => {
    const audio = getSharedAudio()
    if (!audio || !active) return
    const store = useAudioPlayerStore.getState

    const onTime = () => store().setPosition(audio.currentTime)
    const onPlay = () => store().setPlaying(true)
    const onPause = () => store().setPlaying(false)
    const onEnded = async () => {
      const s = store()
      if (s.sleepAtSectionEnd) {
        s.setSleepAtSectionEnd(false)
        s.setPlaying(false)
        return
      }
      const next = s.getNextSection()
      if (!next) {
        s.setPlaying(false)
        return
      }
      let url = s.getCachedUrl(next.id, s.activeGender)
      if (!url) {
        try {
          const res = await apiClient.get(`/audiobooks/sections/${next.id}/presign?gender=${s.activeGender}`)
          url = res.data?.url
          if (url) s.cacheUrl(sectionKey(next.id, s.activeGender), url)
        } catch {
          /* fall through: stop rather than pretend */
        }
      }
      if (!url) {
        s.setPlaying(false)
        return
      }
      s.setCurrentSection(next.id)
      audio.src = url
      audio.dataset.sectionKey = sectionKey(next.id, s.activeGender)
      audio.playbackRate = s.playbackRate
      audio.play().catch(() => s.setPlaying(false))
    }
    const onError = () => store().setPlaying(false)

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)
    // Reconcile once: the element is the truth.
    store().setPlaying(!audio.paused)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
    }
  }, [active])

  // OS media controls (lock screen, headphones)
  React.useEffect(() => {
    const audio = getSharedAudio()
    if (!audio || !active || !("mediaSession" in navigator)) return
    const set = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try { navigator.mediaSession.setActionHandler(action, fn) } catch { /* unsupported action */ }
    }
    set("play", () => { audio.play().catch(() => undefined) })
    set("pause", () => audio.pause())
    set("seekbackward", () => { audio.currentTime = Math.max(0, audio.currentTime - 15) })
    set("seekforward", () => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 15) })
    return () => {
      ;(["play", "pause", "seekbackward", "seekforward"] as MediaSessionAction[]).forEach((a) => set(a, null))
    }
  }, [active])

  // Sleep timer
  React.useEffect(() => {
    if (!active || sleepTimerRemaining === null || !isPlaying) return
    const id = setInterval(() => {
      if (useAudioPlayerStore.getState().tickSleepTimer()) getSharedAudio()?.pause()
    }, 1000)
    return () => clearInterval(id)
  }, [active, sleepTimerRemaining, isPlaying])

  // Progress sync, same endpoint and cadence as the player
  React.useEffect(() => {
    if (!active || !isPlaying) return
    const id = setInterval(() => {
      const s = useAudioPlayerStore.getState()
      if (!s.bookId || !s.currentSectionId) return
      apiClient
        .put(`/audiobooks/${s.bookId}/progress`, {
          sectionId: s.currentSectionId,
          positionSeconds: s.positionSeconds,
          activeGender: s.activeGender,
          showTranscript: s.showTranscript,
          playbackRate: s.playbackRate,
        })
        .catch(() => undefined)
    }, 30000)
    return () => clearInterval(id)
  }, [active, isPlaying])

  return null
}
