"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { useReducedMotion } from "@/components/landing/use-landing"
import { cn } from "@/lib/utils"

const QUOTES = [
  { who: "Dean of Academics", text: "We need to move thousands of students to digital textbooks without standing up new infrastructure." },
  { who: "Head of Sciences", text: "Varta matters because it answers only from the books we upload, and cites the page." },
  { who: "Postgraduate student", text: "Annotating a PDF and turning those highlights into flashcards would halve my revision time." },
]

const FAQS: [string, string][] = [
  ["How does AI-embedded reading work?", "When you upload a PDF or EPUB, Varta indexes its exact content. A student's doubt is answered strictly from that text, with clickable citations to the page."],
  ["What is Sanchika?", "The personal study archive in Book Buddy. It collects every highlight, annotation, Varta explanation and flashcard across all of a student's books."],
  ["Is student data private and tenant-isolated?", "Yes. Each institution is isolated; reading data is never shared across institutions or used to train public models."],
  ["Can we bring our existing PDFs and books?", "Yes. Bulk-upload PDFs and EPUBs; scanned PDFs are OCR'd so they are searchable and AI-ready."],
  ["Does it support text-to-speech?", "Every book gets natural-voice narration, and students can switch between reading and listening without losing their place."],
  ["What about mobile?", "Books reflow for phones and tablets in the browser, and Book Buddy installs as an app."],
]

const ROTATE_MS = 6000

/** Founding-cohort quotes (auto-rotating, with progress bars) beside the FAQ accordion. */
export function TestimonialsFaqSection() {
  const reduced = useReducedMotion()
  const [q, setQ] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const [open, setOpen] = React.useState(0)

  React.useEffect(() => {
    if (reduced || paused) return
    const id = window.setTimeout(() => setQ((v) => (v + 1) % QUOTES.length), ROTATE_MS)
    return () => window.clearTimeout(id)
  }, [q, reduced, paused])

  return (
    <section id="faq" className="bg-bb-bg py-[120px]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-16 px-[clamp(20px,4vw,56px)]">
        <div className="flex flex-col gap-7" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <span className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-bb-accent-ink">
            <Icon name="quote" size={18} /> Built with our founding cohort
          </span>
          <div className="relative min-h-[max(220px,calc(560px-60vw))]" aria-live={paused ? "polite" : "off"}>
            {QUOTES.map((item, i) => (
              <figure
                key={item.who}
                aria-hidden={i !== q}
                className="absolute inset-0 m-0 flex flex-col gap-[18px]"
                style={{
                  opacity: i === q ? 1 : 0,
                  transform: i === q || reduced ? "none" : "translateY(14px)",
                  transition: reduced ? "none" : "opacity .6s, transform .7s cubic-bezier(.2,.8,.2,1)",
                  pointerEvents: i === q ? "auto" : "none",
                }}
              >
                <blockquote className="m-0 font-reading text-[clamp(24px,2.4vw,32px)] leading-[1.3] tracking-[-0.01em] [text-wrap:pretty]">“{item.text}”</blockquote>
                <figcaption className="text-[15px] text-bb-muted">
                  <span className="font-bold text-bb-text">{item.who}</span> · design-partner persona
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="flex gap-2">
            {QUOTES.map((item, i) => (
              <button
                key={item.who}
                type="button"
                onClick={() => setQ(i)}
                aria-label={`Show quote from ${item.who}`}
                aria-current={i === q}
                className="relative h-1 flex-1 rounded bg-bb-border p-0 before:absolute before:inset-x-0 before:-inset-y-5 before:content-[''] focus-visible:outline-none focus-visible:shadow-focus"
              >
                <span
                  key={i === q ? `a${q}` : `i${i}`}
                  className="block h-full rounded bg-[linear-gradient(90deg,#FFB37A,#FF4D00)]"
                  style={{
                    width: i <= q || reduced ? "100%" : "0%",
                    animation: i === q && !reduced && !paused ? `bbfill ${ROTATE_MS}ms linear` : undefined,
                  }}
                />
              </button>
            ))}
          </div>
          <span className="text-[13px] text-bb-muted">Illustrative voices from design-partner interviews.</span>
        </div>

        <div className="flex flex-col">
          <h2 className="mb-5 font-display text-[clamp(32px,3.6vw,46px)] font-extrabold leading-none tracking-[-0.035em]">Questions, answered</h2>
          {FAQS.map(([question, answer], i) => {
            const isOpen = open === i
            return (
              <div key={question} className="border-t border-bb-border last:border-b">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  className="grid w-full grid-cols-[40px_minmax(0,1fr)_28px] items-center gap-3 py-5 text-left focus-visible:outline-none focus-visible:shadow-focus"
                >
                  <span className={cn("font-display text-[15px] font-extrabold", isOpen ? "text-bb-accent-ink" : "text-bb-faint")}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-lg font-bold">{question}</span>
                  <span
                    className={cn("flex h-7 w-7 items-center justify-center rounded-full transition-[transform,background-color] [transition-duration:350ms]", isOpen ? "rotate-45 bg-bb-accent-soft" : "bg-bb-surface-2")}
                  >
                    <Icon name="plus" size={16} />
                  </span>
                </button>
                <div
                  id={`faq-${i}`}
                  role="region"
                  className="grid transition-[grid-template-rows] [transition-duration:450ms] ease-bb"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <p className="mb-[22px] ml-[52px] max-w-[560px] text-bb-muted">{answer}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
