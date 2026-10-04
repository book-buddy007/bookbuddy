"use client"

import * as React from "react"
import { Icon } from "@/components/ui/icon"
import { useReducedMotion, useSeen } from "@/components/landing/use-landing"

const STATS: { value: number; decimals: number; suffix: string; label: string }[] = [
  { value: 4, decimals: 0, suffix: "", label: "Reading modes" },
  { value: 6, decimals: 0, suffix: "", label: "PDF Studio tools" },
  { value: 100, decimals: 0, suffix: "%", label: "Citation-backed answers" },
  { value: 99.9, decimals: 1, suffix: "%", label: "Uptime target" },
]

/** Capability figures that count up (1.5s, ease-out) the first time the band scrolls into view. */
export function StatsCountSection() {
  const reduced = useReducedMotion()
  const [ref, seen] = useSeen<HTMLElement>(0.3)
  const [t, setT] = React.useState(0)

  React.useEffect(() => {
    if (!seen) return
    if (reduced) {
      setT(1)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 1500)
      setT(1 - Math.pow(1 - k, 3))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [seen, reduced])

  return (
    <section ref={ref} className="border-b border-bb-border bg-bb-surface py-[88px]">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-11 px-[clamp(20px,4vw,56px)]">
        <span className="flex items-center gap-2 rounded-full bg-bb-accent-soft px-[18px] py-[9px] text-sm font-bold text-bb-accent-ink">
          <Icon name="sparkles" size={18} hue="a" /> Launching 2026 · Founding institutions onboarding now
        </span>
        <dl className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col gap-2.5 border-l border-bb-border px-7 py-2">
              <dd className="order-1 font-display text-[clamp(48px,5.4vw,76px)] font-extrabold leading-[0.9] tracking-[-0.045em] tabular-nums" aria-label={`${s.value}${s.suffix}`}>
                {(s.value * t).toFixed(s.decimals)}
                {s.suffix}
              </dd>
              <dt className="order-2 text-[13px] font-bold uppercase tracking-[0.1em] text-bb-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
