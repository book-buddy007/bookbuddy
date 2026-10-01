"use client"

import * as React from "react"
import Link from "next/link"
import type { Citation } from "@/hooks/useBookChat"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CitationChip } from "@/components/ui/varta"

export const citationLabel = (c: Citation) => (c.pageNumber != null ? `p. ${c.pageNumber}` : "Source")

interface VartaSourcePanelProps {
  citation: Citation | null
  /** Other citations from the same answer ("Also cited"). */
  others: Citation[]
  bookId: string
  onSelect: (index: number) => void
  /** inline = compact card inside an answer (tablet/phone); panel = the desktop right column. */
  variant?: "panel" | "inline"
  className?: string
}

/**
 * The cited excerpt in the reading face (Newsreader) with the cited text highlighted, an
 * "Open in reader" action and the other sources from the same answer.
 */
export function VartaSourcePanel({ citation, others, bookId, onSelect, variant = "panel", className }: VartaSourcePanelProps) {
  const readerHref = `/reader?bookId=${encodeURIComponent(bookId)}${
    citation?.pageNumber != null ? `&page=${citation.pageNumber}` : ""
  }`

  if (!citation) {
    return variant === "panel" ? (
      <div className={cn("flex h-full flex-col p-6", className)}>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-faint">Source</p>
        <p className="mt-3 text-sm text-bb-muted">Select a page citation under an answer to see the passage Varta used.</p>
      </div>
    ) : null
  }

  const body = (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">
        {variant === "panel" ? "Source" : "From your textbook"}
      </p>
      <p className="mt-2 text-sm font-semibold text-bb-text">
        {[citation.chapterTitle, citation.pageNumber != null ? `Page ${citation.pageNumber}` : null].filter(Boolean).join(" · ") || "Excerpt"}
      </p>
      {citation.textPreview ? (
        <blockquote className="mt-3 font-reading text-[17px] leading-[1.7] text-bb-text">
          <mark className="rounded-[4px] bg-bb-highlight px-0.5 text-inherit [box-decoration-break:clone]">{citation.textPreview}</mark>
        </blockquote>
      ) : (
        <p className="mt-3 text-sm text-bb-muted">No excerpt is stored for this citation.</p>
      )}
      <Button asChild size={variant === "panel" ? "md" : "sm"} variant="secondary" className="mt-4">
        <Link href={readerHref}>Open in reader</Link>
      </Button>
      {others.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-bb-faint">Also cited</p>
          <div className="flex flex-wrap gap-2">
            {others.map((c) => (
              <CitationChip key={c.chunkId} label={citationLabel(c)} onClick={() => typeof c.index === "number" && onSelect(c.index)} />
            ))}
          </div>
        </div>
      )}
    </>
  )

  return variant === "panel" ? (
    <div className={cn("h-full overflow-y-auto p-6", className)}>{body}</div>
  ) : (
    <div className={cn("mt-3 rounded-2xl bg-bb-bg p-4", className)}>{body}</div>
  )
}
