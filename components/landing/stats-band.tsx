import { AnimatedCounter } from "@/components/landing/animated-counter"
import { Icon } from "@/components/ui/icon"
import { Container } from "@/components/landing/section"

// Capability stats — every number here is true of the product today (no fabricated
// user counts). Pre-launch credibility framing per the founding-cohort positioning.
const STATS = [
  { value: 4, suffix: "", label: "Reading Modes" },
  { value: 6, suffix: "", label: "PDF Studio Tools" },
  { value: 100, suffix: "%", label: "Citation-Backed AI" },
  { value: 99, suffix: ".9%", label: "Uptime Target" },
]

export function StatsBand() {
  return (
    <section className="bg-bb-surface py-20">
      <Container className="flex flex-col items-center gap-10">
        {/* Founding-cohort banner — honest pre-launch framing */}
        <span className="inline-flex items-center gap-2 rounded-full bg-bb-accent-soft px-5 py-2.5 text-sm font-bold text-bb-accent-ink">
          <Icon name="sparkles" size={18} />
          Launching 2026 · Founding institutions onboarding now
        </span>
        <div className="grid w-full grid-cols-2 gap-5 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-[18px] bg-bb-bg p-6 text-center">
              <div className="font-display text-[clamp(34px,4.5vw,56px)] font-extrabold leading-none tracking-[-0.03em]">
                <AnimatedCounter end={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-bb-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
