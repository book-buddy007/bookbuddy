"use client"

import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { CardHeading, DashCard, Pill } from "@/components/dashboard/cards/dash-card"

export interface ReviewConcept {
  id: string
  label: string
  bookTitle?: string
  page?: number | null
}

/** Sanchika: the next concept to revisit as a stacked flashcard, plus the student's real counts. */
export function SanchikaCard({
  due,
  highlights,
  flashcards,
  explanations,
  loading,
  index = 0,
}: {
  due: ReviewConcept[]
  highlights: number
  flashcards: number
  explanations: number
  loading?: boolean
  index?: number
}) {
  const next = due[0]
  return (
    <DashCard index={index}>
      <CardHeading
        icon="flashcards"
        title="Sanchika"
        aside={due.length > 0 ? <Pill tone="cobalt">{due.length} to review</Pill> : undefined}
      />
      {loading ? (
        <Skeleton className="h-[130px] w-full rounded-[18px]" />
      ) : next ? (
        <div className="relative mb-1 mr-3.5 mt-1 h-[130px]">
          <div className="absolute inset-0 translate-x-3.5 -translate-y-2.5 rotate-[5deg] rounded-[18px] border border-bb-border bg-bb-surface-2" />
          <div className="absolute inset-0 translate-x-[7px] -translate-y-[5px] rotate-[2.5deg] rounded-[18px] border border-bb-border bg-bb-surface-2" />
          <div className="absolute inset-0 flex flex-col justify-between rounded-[18px] bg-[linear-gradient(170deg,#FF8A3D,#FF4D00_60%,#D93A00)] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_18px_30px_-16px_rgba(255,77,0,.7)]">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
              {next.page ? `From p. ${next.page}` : next.bookTitle ? `From ${next.bookTitle}` : "Revisit"}
            </span>
            <span className="font-reading text-lg leading-[1.3]">{next.label}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-bb-muted">Highlights and flashcards you make while reading collect here for review.</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Highlights", highlights, "bg-bb-surface-2 text-bb-text"],
          ["Flashcards", flashcards, "bg-bb-accent-soft text-bb-accent-ink"],
          ["Answers", explanations, "bg-bb-info-soft text-bb-info-ink"],
        ].map(([label, n, cls]) => (
          <div key={label as string} className={`rounded-2xl px-2 py-3 text-center ${cls}`}>
            <div className="font-display text-2xl font-extrabold">{n as number}</div>
            <div className="text-[11px]">{label}</div>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/student/review"
        className="flex items-center gap-1.5 self-start text-sm font-bold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
      >
        Start review <Icon name="arrow-right" size={16} tone="line" />
      </Link>
    </DashCard>
  )
}
