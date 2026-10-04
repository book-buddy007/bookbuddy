"use client"

import * as React from "react"
import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { DashCard } from "@/components/dashboard/cards/dash-card"

const EXAMPLES = [
  "Why is water's specific heat so high?",
  "Difference between latent and specific heat?",
  "Give me 3 exam questions from this chapter",
]

const CHIPS = ["Explain this chapter simply", "Quiz me on what I just read", "Summarise my highlights"]

/** Types the example questions into the pill, one after another (static when motion is reduced). */
function useTypedExample() {
  const [qi, setQi] = React.useState(0)
  const [ci, setCi] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)

  React.useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  React.useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      setCi((c) => {
        if (c < EXAMPLES[qi].length + 24) return c + 1
        setQi((q) => (q + 1) % EXAMPLES.length)
        return 0
      })
    }, 60)
    return () => window.clearInterval(id)
  }, [qi, reduced])

  if (reduced) return { text: EXAMPLES[0], caret: false }
  const q = EXAMPLES[qi]
  return { text: q.slice(0, Math.min(ci, q.length)), caret: ci < q.length || ci % 2 === 0 }
}

/**
 * The AI card (spans 2): a cobalt Varta entry point. The pill is a link into Varta (the book the
 * student is reading when there is one) with the example questions typing into it.
 */
export function AskVartaCard({ bookId, index = 0 }: { bookId?: string; index?: number }) {
  const { text, caret } = useTypedExample()
  const href = bookId ? `/varta?bookId=${bookId}` : "/varta"

  return (
    <DashCard variant="ai" wide index={index} className="gap-4 p-6">
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 font-display text-[22px] font-extrabold tracking-[-0.02em]">
          <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white/[.16] shadow-[inset_0_1px_0_rgba(255,255,255,.4)]">
            <Icon name="varta" size={22} tone="onfill" />
          </span>
          Ask Varta
        </span>
        <span className="text-[13px] text-[#DCE8FF]">Answers only from your books, with page citations</span>
      </div>

      <Link
        href={href}
        aria-label="Ask Varta a question"
        className="relative flex h-14 items-center gap-2.5 rounded-full bg-white/[.96] pl-[18px] pr-2 text-bb-ink shadow-[0_12px_30px_-12px_rgba(10,15,36,.6)] focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon name="search" size={20} tone="line" />
        <span className="min-w-0 flex-1 truncate text-[#4A5470]">
          {text}
          <span
            aria-hidden
            className="ml-0.5 inline-block h-[18px] w-0.5 bg-bb-cobalt-light align-middle"
            style={{ opacity: caret ? 1 : 0 }}
          />
        </span>
        <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-bb-primary shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_8px_16px_-6px_rgba(255,77,0,.8)]">
          <Icon name="arrow-right" size={18} tone="onfill" />
        </span>
      </Link>

      <div className="relative flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <Link
            key={c}
            href={href}
            className="flex h-[34px] items-center rounded-full border border-white/[.22] bg-white/[.14] px-3.5 text-[13px] font-semibold transition-colors hover:bg-white/[.22] focus-visible:outline-none focus-visible:shadow-focus"
          >
            {c}
          </Link>
        ))}
      </div>
    </DashCard>
  )
}
