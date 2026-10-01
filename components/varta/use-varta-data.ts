"use client"

import { useEffect, useState } from "react"

export interface Labelled {
  label: string
  mastery: number
}

export interface VartaActivity {
  scope: "book" | "global"
  book: { id: string; title: string; author: string } | null
  stats: {
    questionsAsked: number
    modeBreakdown: Record<string, number>
    quiz: { answered: number; correct: number; accuracy: number | null }
    mastery: { average: number | null; tracked: number; strongest: Labelled[]; weakest: Labelled[] }
  }
  usage: {
    series: { date: string; varta: number; quiz: number }[]
    trial: {
      isTrial: boolean
      isPaid: boolean
      trialEndsAt: string | null
      remaining: { varta: number; quiz: number; limit: number } | null
    }
  }
  recentChats: { bookId: string; bookTitle: string; mode: string; preview: string; createdAt: string }[]
  recentQuizzes: {
    bookId: string
    bookTitle: string
    chapterTitle: string
    citedPage: number | null
    prompt: string
    correct: boolean
    answeredAt: string
  }[]
}

/** The signed-in student's Varta chat + quiz activity, for one book or across all books. */
export function useVartaActivity(bookId?: string) {
  const [data, setData] = useState<VartaActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/students/me/varta-activity${bookId ? `?bookId=${encodeURIComponent(bookId)}` : ""}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(() => setError("Could not load your Varta activity."))
      .finally(() => setLoading(false))
  }, [bookId])

  return { data, loading, error }
}

export interface VartaBook {
  id: string
  title: string
  author: string
  coverUrl: string | null
}

/** Books that have Varta (embedded AI content) enabled. */
export function useVartaBooks() {
  const [books, setBooks] = useState<VartaBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/books?limit=100&status=PUBLISHED", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || !Array.isArray(json?.data)) return
        setBooks(
          json.data
            .filter((b: any) => Array.isArray(b.bookFormats) && b.bookFormats.some((f: any) => f.type === "AI_EMBED"))
            .map((b: any) => ({
              id: String(b.id),
              title: b.title ?? "Untitled",
              author: b.author ?? "Unknown author",
              coverUrl: b.coverUrl ?? null,
            }))
        )
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return { books, loading }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString()
}
