"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Segmented } from "@/components/ui/segmented"

export type ReaderMode = "read" | "pdf" | "listen"

interface ReaderTopBarProps {
  title: string
  chapter?: string
  mode: ReaderMode
  /** Which modes the book actually offers; the others are hidden. */
  modes: ReaderMode[]
  onMode: (m: ReaderMode) => void
  onBack: () => void
  onSearch?: () => void
  searchActive?: boolean
  bookmarked: boolean
  onBookmark: () => void
  onDisplay: () => void
  displayActive?: boolean
  onVarta: () => void
  className?: string
}

const MODE_LABEL: Record<ReaderMode, string> = { read: "Read", pdf: "PDF", listen: "Listen" }

const iconBtn =
  "flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--rd-ink)] transition-colors duration-bb-micro hover:bg-[color:var(--rd-track)] focus-visible:outline-none focus-visible:shadow-focus"

/**
 * 66px reader bar: back + title/chapter, a Read / PDF / Listen switch in the centre, then
 * search, bookmark, Aa and the "Ask Varta" pill. Colours come from the reader theme
 * (`--rd-*`, set by data-reader on the reader root), not from the app theme.
 */
export function ReaderTopBar({
  title, chapter, mode, modes, onMode, onBack, onSearch, searchActive, bookmarked, onBookmark, onDisplay, displayActive, onVarta, className,
}: ReaderTopBarProps) {
  return (
    <header
      className={cn(
        "absolute inset-x-0 top-0 z-40 flex h-[66px] items-center gap-2 border-b px-3 pt-[var(--bb-safe-top)] sm:px-5",
        "border-[color:var(--rd-border)] bg-[color:var(--rd-bg)] text-[color:var(--rd-ink)]",
        className
      )}
      style={{ height: "calc(66px + var(--bb-safe-top))" }}
    >
      <button type="button" onClick={onBack} aria-label="Back to library" className={iconBtn}>
        <Icon name="chevron-left" size={22} fillLayer={false} />
      </button>
      <div className="min-w-0 flex-1 md:flex-none md:basis-1/3">
        <p className="truncate text-[15px] font-semibold leading-tight">{title}</p>
        {chapter && <p className="truncate text-[13px] leading-tight text-[color:var(--rd-sub)]">{chapter}</p>}
      </div>

      <div className="hidden flex-1 justify-center md:flex">
        {modes.length > 1 && (
          <Segmented<ReaderMode>
            aria-label="Reading mode"
            value={mode}
            onValueChange={onMode}
            options={modes.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
          />
        )}
      </div>

      <div className="ml-auto flex items-center gap-0.5 md:ml-0 md:basis-1/3 md:justify-end">
        {onSearch && (
          <button type="button" onClick={onSearch} aria-label="Search in book" aria-pressed={searchActive} className={cn(iconBtn, searchActive && "bg-[color:var(--rd-track)]")}>
            <Icon name="search" size={22} />
          </button>
        )}
        <button type="button" onClick={onBookmark} aria-label={bookmarked ? "Remove bookmark from this page" : "Bookmark this page"} aria-pressed={bookmarked} className={iconBtn}>
          <Icon name="bookmark" size={22} fillLayer={bookmarked} />
        </button>
        <button type="button" onClick={onDisplay} aria-label="Text and display settings" aria-pressed={displayActive} className={cn(iconBtn, "font-reading text-lg font-semibold", displayActive && "bg-[color:var(--rd-track)]")}>
          Aa
        </button>
        <button
          type="button"
          onClick={onVarta}
          className="ml-1 hidden h-10 items-center gap-2 rounded-full bg-bb-primary px-4 text-sm font-semibold text-white shadow-gloss focus-visible:outline-none focus-visible:shadow-focus sm:inline-flex"
        >
          <Icon name="varta" size={18} fillLayer={false} /> Ask Varta
        </button>
      </div>
    </header>
  )
}
