"use client"

import Link from "next/link"
import { BookCover } from "@/components/ui/book-cover"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { DashCard, useEntered } from "@/components/dashboard/cards/dash-card"

export interface ContinueReadingBook {
  id: string
  title: string
  author?: string
  coverUrl?: string | null
  subject?: string | null
  /** 0–100 */
  percent: number
  /** Current page, when the student has opened the book. */
  page?: number
  hasAudio?: boolean
}

/** Featured stage card (spans 2): the book the student read last, with Resume / Listen. */
export function ContinueReadingCard({
  book,
  loading,
  index = 0,
}: {
  book?: ContinueReadingBook | null
  loading?: boolean
  index?: number
}) {
  const entered = useEntered()

  if (loading) {
    return (
      <DashCard variant="stage" wide index={index} className="min-h-[200px] p-[26px]">
        <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] items-center gap-6">
          <Skeleton className="aspect-[3/4] w-full rounded-[14px] bg-white/10" />
          <div className="space-y-3">
            <Skeleton className="h-3 w-32 bg-white/10" />
            <Skeleton className="h-7 w-3/4 bg-white/10" />
            <Skeleton className="h-2 w-full bg-white/10" />
          </div>
        </div>
      </DashCard>
    )
  }

  const glow =
    "before:-right-[120px] before:-top-[140px] before:h-[380px] before:w-[380px] before:bg-[image:radial-gradient(circle,rgba(255,77,0,.35),rgba(59,91,219,.25)_45%,transparent_70%)]"

  if (!book) {
    return (
      <DashCard variant="stage" wide index={index} className={`p-[26px] ${glow}`}>
        <div className="relative flex flex-col gap-3.5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#FF8A3D]">
            <Icon name="book-open" size={16} /> Continue reading
          </span>
          <div>
            <p className="font-display text-[clamp(22px,2.4vw,28px)] font-extrabold leading-[1.1] tracking-[-0.03em]">
              Pick your first book
            </p>
            <p className="mt-1 text-sm text-[#A9B4D0]">Open any title and your place is saved here, ready to resume.</p>
          </div>
          <div>
            <Link
              href="/catalog"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/[.18] bg-white/5 px-[18px] font-semibold text-[#F2F4F8] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus"
            >
              Browse library <Icon name="arrow-right" size={18} tone="line" />
            </Link>
          </div>
        </div>
      </DashCard>
    )
  }

  const pct = Math.min(100, Math.max(0, Math.round(book.percent)))
  return (
    <DashCard variant="stage" wide index={index} className={`p-[26px] ${glow}`}>
      <div className="relative grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] items-center gap-6">
        <BookCover title={book.title} subject={book.subject} coverUrl={book.coverUrl} width={120} style={{ width: "100%", maxWidth: 120, height: "auto", aspectRatio: "3 / 4" }} />
        <div className="flex min-w-0 flex-col gap-3.5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#FF8A3D]">
            <Icon name="book-open" size={16} /> Continue reading
          </span>
          <div>
            <p className="font-display text-[clamp(22px,2.4vw,28px)] font-extrabold leading-[1.1] tracking-[-0.03em] [text-wrap:balance]">
              {book.title}
            </p>
            <p className="mt-1 text-sm text-[#A9B4D0]">
              {[book.author, book.page ? `Page ${book.page}` : null, `${pct}% complete`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[.12]">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#FF8A3D,#FF4D00)] shadow-[0_0_12px_rgba(255,77,0,.7)] transition-[width] [transition-duration:1200ms] delay-300 ease-bb"
                style={{ width: entered ? `${pct}%` : "0%" }}
              />
            </span>
            <span className="font-bold tabular-nums">{pct}%</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild size="lg" className="h-11 px-5 text-[15px]">
              <Link href={`/reader?bookId=${book.id}`}>
                <Icon name="book-open" size={18} /> Resume
              </Link>
            </Button>
            {book.hasAudio && (
              <Link
                href={`/player?bookId=${book.id}`}
                className="flex h-11 items-center gap-2 rounded-full border border-white/[.18] bg-white/5 px-[18px] font-semibold text-[#F2F4F8] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus"
              >
                <Icon name="headphones" size={18} /> Listen instead
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashCard>
  )
}
