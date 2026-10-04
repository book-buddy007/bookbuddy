"use client"

import { Icon } from "@/components/ui/icon"
import { clamp, useReducedMotion, useSeen } from "@/components/landing/use-landing"
import { cn } from "@/lib/utils"

/* "For teachers & admins": the control room behind the student's day. Sample data throughout (and
   labelled so). The panels animate in once, when the card scrolls into view. */

const BAR_H = [38, 52, 44, 70, 96, 61, 30]
const ASSIGNED: [string, number][] = [
  ["Ch 7 · Heat & Thermodynamics", 82],
  ["Ch 4 · Laws of Motion", 64],
  ["Lab manual · Calorimetry", 41],
]

/** Heatmap cell value: a fixed pattern that leaves Ch 7, weeks 6–8, glowing. */
function heat(r: number, c: number) {
  let v = 0.12 + 0.18 * Math.abs(Math.sin(r * 2.1 + c * 1.3))
  if (r === 6) v += c >= 5 && c <= 7 ? 0.7 : 0.25
  if (r === 3 && c >= 2 && c <= 4) v += 0.35
  return clamp(v, 0.06, 1)
}

function PanelNumber({ n, ai }: { n: number; ai?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-extrabold text-white shadow-[0_0_0_4px_#0A0F24]",
        ai ? "bg-bb-grad-cobalt" : "bg-bb-primary"
      )}
    >
      {n}
    </span>
  )
}

const panel = "relative rounded-[22px] border border-white/[.08] bg-white/[.04] p-[22px]"

export function ControlRoomSection() {
  const reduced = useReducedMotion()
  const [ref, seen] = useSeen<HTMLDivElement>(0.15)
  const show = seen || reduced
  const t = (css: string) => (reduced ? "none" : css)

  return (
    <section id="institutions" className="bg-bb-bg py-[120px]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-[clamp(20px,4vw,56px)]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-end gap-x-16 gap-y-6">
          <div className="flex flex-col gap-4">
            <span className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-bb-accent-ink">
              <Icon name="analytics" size={18} /> For teachers &amp; admins
            </span>
            <h2 className="font-display text-[clamp(36px,4.6vw,60px)] font-extrabold leading-[0.98] tracking-[-0.04em] [text-wrap:balance]">
              See what they read. Know where they struggle.
            </h2>
          </div>
          <p className="max-w-[520px] text-lg text-bb-muted [text-wrap:pretty]">
            The control room behind Ananya&apos;s day: which chapters hold a batch up, what they ask Varta, and who finished the assigned reading.
          </p>
        </div>

        <div
          ref={ref}
          className="relative rounded-[32px] bg-[linear-gradient(180deg,#121A33_0%,#0A0F24_100%)] p-[clamp(18px,2.4vw,30px)] text-[#F2F4F8] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_60px_100px_-50px_rgba(10,15,36,.7)]"
          style={{ opacity: show ? 1 : 0, transform: show ? "none" : "translateY(40px)", transition: t(`opacity .7s, transform .9s cubic-bezier(.2,.8,.2,1)`) }}
        >
          <div className="mb-[22px] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Icon name="institution" size={22} />
              <span className="font-bold">St. Xavier&apos;s · B.Sc. Physics, Sem 1</span>
            </div>
            <span className="rounded-full border border-dashed border-white/30 px-2.5 py-[5px] font-mono text-[11px] uppercase tracking-[0.1em] text-[#A9B4D0]">Sample data</span>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] gap-[18px]">
            <div className={panel}>
              <PanelNumber n={1} />
              <div className="mb-4 flex items-baseline justify-between">
                <span className="font-bold">Time spent per chapter</span>
                <span className="text-[13px] text-[#A9B4D0]">Weeks 1–10</span>
              </div>
              <div className="grid grid-cols-[52px_repeat(10,minmax(0,1fr))] items-center gap-[5px]" role="img" aria-label="Heatmap of time spent per chapter over ten weeks; chapter 7, weeks 6 to 8, is the slowest">
                {Array.from({ length: 8 }, (_, r) => (
                  <div key={r} className="contents">
                    <span className="text-xs tabular-nums text-[#A9B4D0]">Ch {r + 1}</span>
                    {Array.from({ length: 10 }, (_, c) => {
                      const v = heat(r, c)
                      return (
                        <span
                          key={c}
                          className="aspect-square rounded-[5px]"
                          style={{
                            background: v > 0.6 ? `rgba(255,${Math.round(120 - v * 50)},0,${v})` : `rgba(125,151,255,${(v * 0.9).toFixed(2)})`,
                            boxShadow: v > 0.8 ? "0 0 12px rgba(255,77,0,.7)" : "none",
                            opacity: show ? 1 : 0,
                            transform: show ? "none" : "scale(.4)",
                            transition: t(`opacity .4s ${(r + c) * 30}ms, transform .5s ${(r + c) * 30}ms`),
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex items-center gap-2.5 text-[13px] text-[#C5CCDA]">
                <Icon name="heatmap" size={18} /> Ch 7 · weeks 6–8 is where this batch slows down.
              </div>
            </div>

            <div className="flex flex-col gap-[18px]">
              <div className={panel}>
                <PanelNumber n={2} ai />
                <div className="mb-3.5 flex items-baseline justify-between">
                  <span className="font-bold">Varta questions this week</span>
                  <span className="font-display text-[26px] font-extrabold">1,208</span>
                </div>
                <div className="flex h-24 items-end gap-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                      <span
                        className={cn(
                          "w-full rounded-t-lg rounded-b-[4px] shadow-[inset_0_1px_0_rgba(255,255,255,.35)]",
                          i === 4 ? "bg-[linear-gradient(180deg,#FF8A3D,#FF4D00)]" : "bg-[linear-gradient(180deg,#7D97FF,#3B5BDB)]"
                        )}
                        style={{ height: show ? `${BAR_H[i]}%` : "4%", transition: t(`height .8s cubic-bezier(.2,.8,.2,1) ${i * 70}ms`) }}
                      />
                      <span className="text-[11px] text-[#A9B4D0]">{l}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[13px] text-[#C5CCDA]">
                  Top topic: <span className="font-semibold text-[#FFB37A]">latent heat vs specific heat</span>
                </div>
              </div>

              <div className={cn(panel, "flex flex-col gap-3")}>
                <PanelNumber n={3} />
                <span className="font-bold">Assigned reading</span>
                {ASSIGNED.map(([title, v]) => (
                  <div key={title} className="grid grid-cols-[minmax(0,1fr)_90px_40px] items-center gap-3 text-sm">
                    <span className="truncate">{title}</span>
                    <span className="h-1.5 overflow-hidden rounded-md bg-white/10">
                      <span
                        className="block h-full rounded-md bg-[linear-gradient(90deg,#7D97FF,#3B5BDB)]"
                        style={{ width: show ? `${v}%` : "0%", transition: t("width 1s cubic-bezier(.2,.8,.2,1) .4s") }}
                      />
                    </span>
                    <span className="text-right tabular-nums text-[#A9B4D0]">{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-7">
          {[
            ["01", "Struggling-chapter heatmaps", "Spot the exact pages where a batch spends the most time.", false],
            ["02", "What they ask Varta", "Question volume and the topics confusing enough to ask about.", true],
            ["03", "Assign to batches", "Push required reading to a semester and watch completion fill in.", false],
          ].map(([n, h, d, ai]) => (
            <div key={n as string} className={cn("flex flex-col gap-2 border-t-2 pt-[18px]", ai ? "border-bb-cobalt-light" : "border-bb-blaze")}>
              <span className={cn("font-display text-[15px] font-extrabold", ai ? "text-bb-info-ink" : "text-bb-accent-ink")}>{n as string}</span>
              <span className="text-[19px] font-bold">{h as string}</span>
              <span className="text-bb-muted">{d as string}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
