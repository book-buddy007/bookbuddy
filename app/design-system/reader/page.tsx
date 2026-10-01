"use client"

import * as React from "react"
import { ReaderTopBar } from "@/components/reader/ReaderTopBar"
import { ReaderDisplayContent } from "@/components/reader/ReaderDisplayContent"
import { EpubSelectionPopover } from "@/components/reader/EpubSelectionPopover"
import { READER_PALETTES, readerFontStack, type ReaderThemeKey } from "@/lib/reader-themes"
import { useReaderStore } from "@/store/useReaderStore"
import { toReaderKey } from "@/lib/reader-themes"
import { ReaderBottomBar } from "@/components/reader/ReaderBottomBar"

/** Dev-only preview of the reader chrome (top bar, Display panel, selection popover, text). */
export default function ReaderPreviewPage() {
  const { theme, fontSize, fontFamily, lineHeight } = useReaderStore()
  const key: ReaderThemeKey = toReaderKey(theme)
  const p = READER_PALETTES[key]
  const [bookmarked, setBookmarked] = React.useState(false)
  const [page, setPage] = React.useState(42)

  return (
    <div data-reader={key} className="relative min-h-dvh overflow-hidden" style={{ background: p.bg, color: p.ink }}>
      <ReaderTopBar
        title="Concepts of Physics"
        chapter="Chapter 7 · Laws of motion"
        mode="read"
        modes={["read", "pdf", "listen"]}
        onMode={() => undefined}
        onBack={() => undefined}
        onSearch={() => undefined}
        bookmarked={bookmarked}
        onBookmark={() => setBookmarked((b) => !b)}
        onDisplay={() => undefined}
        onVarta={() => undefined}
      />
      <div className="mx-auto grid max-w-5xl gap-10 px-5 pb-16 pt-[96px] lg:grid-cols-[1fr_320px]">
        <article className="relative mx-auto max-w-[640px]" style={{ fontFamily: readerFontStack(fontFamily), fontSize, lineHeight }}>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">Chapter 7</p>
          <h1 className="font-reading text-[46px] font-medium leading-tight tracking-[-0.015em]">Laws of motion</h1>
          <p className="mt-6">
            A body continues in its state of rest or uniform motion unless a force acts on it. This is
            the idea Newton set down first, and every other law in the chapter leans on it.{" "}
            <mark style={{ background: p.highlight, color: "inherit" }}>The heavier object does not fall faster</mark>, because the
            extra pull of gravity is exactly cancelled by the extra inertia.
          </p>
          <EpubSelectionPopover
            state={{ text: "x", cfiRange: "", x: 260, y: 150, bottom: 175 }}
            container={null}
            onHighlight={() => undefined}
            onNote={() => undefined}
            onListen={() => undefined}
            onAskVarta={() => undefined}
            onClose={() => undefined}
          />
        </article>
        {/* Mock PDF page: the canvas layer takes the Sepia / Night filters */}
        <div className="rpv-core__inner-pages rounded-[22px] p-4 lg:col-span-2">
          <div className="rpv-core__canvas-layer !static mx-auto max-w-[420px] bg-white p-6 text-[#111] shadow-e1">
            <p className="font-bold">PDF page {page}</p>
            <p className="mt-2 text-sm">Black text on a white bitmap, with a <span style={{ color: "#d00" }}>red</span> and <span style={{ color: "#06c" }}>blue</span> figure label.</p>
          </div>
        </div>
        <aside className="rounded-[22px] border p-5" style={{ background: p.panel, borderColor: p.border }}>
          <ReaderDisplayContent />
        </aside>
      </div>
      <ReaderBottomBar currentPage={page} totalPages={240} minutesLeft={95} percentComplete={Math.round((page / 240) * 100)} onListen={() => undefined} onSeek={setPage} />
    </div>
  )
}
