"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { Chip } from "@/components/ui/chip"
import { cn } from "@/lib/utils"

interface FAQItem {
  question: string
  answer: string
  category?: string
}

interface FAQAccordionProps {
  faqs: FAQItem[]
  categories?: string[]
}

/** Category chips + a single-open accordion (native button semantics, aria-expanded). */
export function FAQAccordion({ faqs, categories = [] }: FAQAccordionProps) {
  const [open, setOpen] = useState<string | null>(null)
  const [category, setCategory] = useState<string>(categories[0] || "All")

  const visible = category === "All" || !category ? faqs : faqs.filter((f) => f.category === category)

  return (
    <div className="mx-auto max-w-4xl">
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2" role="group" aria-label="FAQ categories">
          {categories.map((c) => (
            <Chip key={c} selected={category === c} onClick={() => setCategory(c)} className="h-9 px-5 text-sm">
              {c}
            </Chip>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {visible.map((f) => {
          const isOpen = open === f.question
          const id = `faq-${f.question.replace(/\W+/g, "-").toLowerCase()}`
          return (
            <div key={f.question} className="overflow-hidden rounded-[18px] bg-bb-surface shadow-e1">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : f.question)}
                aria-expanded={isOpen}
                aria-controls={id}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-6 py-4 text-left focus-visible:outline-none focus-visible:shadow-focus"
              >
                <span className="text-lg font-semibold">{f.question}</span>
                <Icon name="chevron-down" size={22} fillLayer={false} className={cn("shrink-0 transition-transform duration-bb-ui", isOpen && "rotate-180")} />
              </button>
              <div id={id} role="region" hidden={!isOpen} className="px-6 pb-5 text-base leading-relaxed text-bb-muted">
                {f.answer}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
