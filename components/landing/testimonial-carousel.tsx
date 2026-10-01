"use client"

import { useEffect, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

interface Testimonial {
  id: number
  name: string
  role: string
  institution: string
  content: string
  rating: number
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[]
  autoRotate?: boolean
  interval?: number
}

/** One quote at a time in the reading face; pauses on hover/focus and never auto-rotates under reduced motion. */
export function TestimonialCarousel({ testimonials, autoRotate = true, interval = 5000 }: TestimonialCarouselProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!autoRotate || paused || reduced) return
    const t = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), interval)
    return () => clearInterval(t)
  }, [autoRotate, interval, paused, testimonials.length])

  const next = () => setIndex((i) => (i + 1) % testimonials.length)
  const prev = () => setIndex((i) => (i - 1 + testimonials.length) % testimonials.length)
  const current = testimonials[index]

  return (
    <div
      className="mx-auto max-w-4xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <figure className="rounded-[28px] bg-bb-surface p-8 text-center shadow-e1 sm:p-12" aria-live="polite">
        <div className="mb-6 flex justify-center gap-1" aria-label={`${current.rating} out of 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon key={i} name="star" size={24} fillLayer={i < current.rating} className={i < current.rating ? undefined : "opacity-40"} />
          ))}
        </div>
        <blockquote className="font-reading text-[22px] leading-[1.6] sm:text-[26px]">&ldquo;{current.content}&rdquo;</blockquote>
        <figcaption className="mt-8">
          <p className="font-semibold">{current.name}</p>
          <p className="text-sm text-bb-muted">{current.role} · {current.institution}</p>
        </figcaption>
      </figure>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button onClick={prev} aria-label="Previous testimonial" className="flex h-11 w-11 items-center justify-center rounded-full bg-bb-surface shadow-e0 hover:bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus">
          <Icon name="chevron-left" size={20} fillLayer={false} />
        </button>
        <div className="flex gap-2">
          {testimonials.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setIndex(i)}
              aria-label={`Show testimonial ${i + 1}`}
              aria-current={i === index}
              className={cn("h-2.5 rounded-full transition-all duration-bb-ui", i === index ? "w-7 bg-bb-accent" : "w-2.5 bg-bb-border hover:bg-bb-faint")}
            />
          ))}
        </div>
        <button onClick={next} aria-label="Next testimonial" className="flex h-11 w-11 items-center justify-center rounded-full bg-bb-surface shadow-e0 hover:bg-bb-surface-2 focus-visible:outline-none focus-visible:shadow-focus">
          <Icon name="chevron-right" size={20} fillLayer={false} />
        </button>
      </div>
    </div>
  )
}
