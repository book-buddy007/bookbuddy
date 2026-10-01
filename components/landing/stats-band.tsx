import { AnimatedCounter } from "@/components/landing/animated-counter"
import { Sparkles } from "@/components/ui/icons"

export function StatsBand() {
  // Capability stats — every number here is true of the product today (no fabricated
  // user counts). Pre-launch credibility framing per the founding-cohort positioning.
  const stats = [
    { value: 4, suffix: "", label: "Reading Modes" },
    { value: 6, suffix: "", label: "PDF Studio Tools" },
    { value: 100, suffix: "%", label: "Citation-Backed AI" },
    { value: 99, suffix: ".9%", label: "Uptime Target" },
  ]

  return (
    <section className="py-20 relative overflow-hidden bg-white">
      {/* Faint warm wash so it's not a harsh white slab */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFFDE7]/40 to-transparent" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Founding-cohort banner — honest pre-launch framing */}
        <div className="flex justify-center mb-10 animate-landing-fade-in-up">
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FEF3C7] border border-[#B45309]/25 text-[#92400E] font-bold text-sm shadow-sm">
            <Sparkles className="w-4 h-4 text-[#B45309]" />
            Launching 2026 · Founding institutions onboarding now
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-landing-scale-in">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-md group relative p-6 text-center transition-all duration-500 hover:-translate-y-2 rounded-2xl border border-[#B8860B]/20 shadow-[0_4px_20px_rgba(184,134,11,0.05)]"
            >
              {/* Number — #006A6E on white = 5.4:1 (passes AA for large text) */}
              <div className="relative text-3xl md:text-5xl font-bold mb-2 flex items-center justify-center text-[#006A6E] font-serif">
                <AnimatedCounter end={stat.value} suffix={stat.suffix} />
              </div>
              {/* Label — #3E2723 on white = 13:1 ✓ */}
              <div className="flex items-center justify-center gap-2">
                <div className="h-[1px] w-4 bg-[#B8860B]/40" />
                <div className="text-xs font-bold tracking-wide uppercase text-[#3E2723]">{stat.label}</div>
                <div className="h-[1px] w-4 bg-[#B8860B]/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
