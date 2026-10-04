"use client"

import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { Skeleton } from "@/components/ui/skeleton"
import { CardHeading, DashCard } from "@/components/dashboard/cards/dash-card"

export interface LatestHighlight {
  text: string
  bookId: string
  bookTitle?: string
  page?: number | null
}

/** The most recent highlight from the book the student read last, set in the reading face. */
export function LatestHighlightCard({
  highlight,
  loading,
  index = 0,
}: {
  highlight?: LatestHighlight | null
  loading?: boolean
  index?: number
}) {
  return (
    <DashCard index={index}>
      <CardHeading icon="highlighter" title="Latest highlight" />
      {loading ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : highlight ? (
        <>
          <p className="font-reading text-[19px] leading-[1.55] [overflow-wrap:anywhere] line-clamp-5">
            <span className="bg-[linear-gradient(transparent_55%,#FFE3A3_55%)] px-0.5 text-bb-ink dark:rounded-[3px] dark:bg-none dark:bg-[#FFE3A3]">{highlight.text}</span>
          </p>
          <div className="flex items-center justify-between gap-3 text-[13px] text-bb-muted">
            <span className="min-w-0 truncate">
              {[highlight.bookTitle, highlight.page ? `p. ${highlight.page}` : null].filter(Boolean).join(" · ")}
            </span>
            <span className="flex shrink-0 gap-1.5">
              <Link
                href={`/varta?bookId=${highlight.bookId}`}
                aria-label="Ask Varta about this book"
                className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus"
              >
                <Icon name="varta" size={16} />
              </Link>
              <Link
                href={`/reader?bookId=${highlight.bookId}${highlight.page ? `&page=${highlight.page}` : ""}`}
                aria-label="Open in the reader"
                className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus"
              >
                <Icon name="book-open" size={16} />
              </Link>
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-bb-muted">Highlight a passage while you read and your latest one shows up here.</p>
      )}
    </DashCard>
  )
}
