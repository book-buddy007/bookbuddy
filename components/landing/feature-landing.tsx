"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Icon, type BBIconName } from "@/components/ui/icon"

/** Fades a block up the first time it scrolls into view (CSS only; reduced motion is honoured globally). */
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={cn(inView ? "animate-in fade-in-0 slide-in-from-bottom-4 duration-500" : "opacity-0", className)}
      style={inView ? { animationDelay: `${delay}ms`, animationFillMode: "both" } : undefined}
    >
      {children}
    </div>
  )
}

/**
 * Navy hero band for the feature landings (/reader with no book, /catalog?format=AUDIOBOOK).
 * Grid + glow like the auth frame. `inset` rounds it for pages that sit inside the app shell;
 * without it the band runs full-bleed. Leaves room at the bottom for a card to overlap it.
 */
export function FeatureHero({
  eyebrow,
  icon,
  title,
  description,
  back,
  inset,
}: {
  eyebrow: string
  icon: BBIconName
  title: React.ReactNode
  description: React.ReactNode
  back?: { href: string; label: string }
  inset?: boolean
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-bb-ink px-5 pb-24 pt-8 text-center text-white sm:px-8 sm:pb-28 sm:pt-14",
        "[background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:56px_56px]",
        inset && "rounded-bb-xl",
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full [background:radial-gradient(circle,rgba(255,77,0,0.30)_0%,rgba(30,58,138,0.26)_45%,transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-[360px] w-[360px] rounded-full [background:radial-gradient(circle,rgba(59,91,219,0.22)_0%,transparent_70%)]" />

      {back && (
        <Link
          href={back.href}
          className="relative mb-6 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-bb-dim hover:text-white focus-visible:outline-none focus-visible:shadow-focus sm:absolute sm:left-6 sm:top-6 sm:mb-0"
        >
          <Icon name="arrow-left" size={16} fillLayer={false} />
          {back.label}
        </Link>
      )}

      <div className="relative mx-auto flex max-w-2xl flex-col items-center">
        <span className="mb-5 grid h-14 w-14 place-items-center rounded-bb-lg bg-white/10 text-white backdrop-blur animate-in fade-in-0 zoom-in-95 duration-500">
          <Icon name={icon} size={28} />
        </span>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-bb-blaze-light">{eyebrow}</p>
        <h1 className="mt-3 font-display text-[clamp(32px,5.5vw,56px)] font-extrabold leading-[1.02] tracking-[-0.035em] [text-wrap:balance] animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-bb-dim-2 [text-wrap:pretty] sm:text-lg">{description}</p>
      </div>
    </section>
  )
}

/** Section title used under the hero. */
export function FeatureSectionTitle({ title, description, className }: { title: string; description?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto mb-8 max-w-2xl text-center", className)}>
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-bb-text sm:text-[30px]">{title}</h2>
      {description && <p className="mt-2 text-[15px] text-bb-muted">{description}</p>}
    </div>
  )
}
