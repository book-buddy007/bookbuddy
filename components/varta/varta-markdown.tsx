"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import type { Citation } from "@/hooks/useBookChat"
import { CITE_HREF_RE, buildCiteMaps, linkifyCitations } from "@/lib/varta-citations"
import { cn } from "@/lib/utils"

interface VartaMarkdownProps {
  content: string
  citations?: Citation[]
  /** Called with the citation index when an inline [Pg. n] pill is pressed. */
  onCite?: (index: number) => void
  activeIndex?: number | null
  className?: string
}

/** Answer body: markdown + math, with `[n]` markers rendered as inline page pills. */
export function VartaMarkdown({ content, citations, onCite, activeIndex, className }: VartaMarkdownProps) {
  const { byIndex, byChunkId } = React.useMemo(() => buildCiteMaps(citations), [citations])
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-inherit prose-p:my-2 prose-headings:font-display prose-headings:text-inherit prose-strong:text-inherit prose-li:my-0.5 prose-a:text-bb-accent-ink dark:prose-invert",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ node: _node, ...props }) => {
            const m = props.href?.match(CITE_HREF_RE)
            const cite = m ? byIndex.get(parseInt(m[1], 10)) : undefined
            if (cite && typeof cite.index === "number" && cite.pageNumber != null) {
              const idx = cite.index
              return (
                <button
                  type="button"
                  onClick={() => onCite?.(idx)}
                  title={cite.textPreview ? `Page ${cite.pageNumber} — ${cite.textPreview}` : `Page ${cite.pageNumber}`}
                  className={cn(
                    "mx-0.5 inline-flex h-6 items-center rounded-full px-2 align-baseline text-xs font-semibold no-underline transition-colors",
                    activeIndex === idx
                      ? "bg-bb-accent-soft text-bb-accent-ink ring-[1.5px] ring-bb-accent"
                      : "bg-bb-bg text-bb-text hover:bg-bb-surface-2"
                  )}
                >
                  p. {cite.pageNumber}
                </button>
              )
            }
            return <a {...props} target="_blank" rel="noreferrer" />
          },
        }}
      >
        {linkifyCitations(content, byIndex, byChunkId)}
      </ReactMarkdown>
    </div>
  )
}
