"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { cn } from "@/lib/utils"
import { at, clamp, useMinWidth, useReducedMotion } from "@/components/landing/use-landing"

/* "A day with Book Buddy": six stops, one student, one textbook. A single passive scroll listener
   (throttled with rAF) turns the scroll position into `p` (0 to 5, fractional between stops), and
   everything else — the sky, the sun, the clock, the glowing spine, each stop's micro-animation —
   is derived from it. */

const SKY_L = ["#FFE3C8", "#FFF2DB", "#FBF6EC", "#F5C7B4", "#16224A", "#0A0F24"]
const SKY_D = ["#1E1A2E", "#16203F", "#121A33", "#1E1F44", "#0F1838", "#070B1C"]
const TOP = ["#FF9A6B", "#A9C8FF", "#8EB6FF", "#3B5BDB", "#0A0F24", "#050817"]
const BOT = ["#FFE2B8", "#FFF1D6", "#F4F7FF", "#FF9A6B", "#1E3A8A", "#121A33"]
const TIMES = [430, 570, 795, 1060, 1290, 1385] // minutes after midnight: 07:10 … 23:05
const MODES = ["Listen", "Read", "Annotate", "Ask Varta", "Revise", "Synced"]
const PHASES = ["DAWN", "MORNING", "NOON", "DUSK", "NIGHT", "LATE NIGHT"]
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

const EASE = "cubic-bezier(.2,.8,.2,1)"
const SPRING = "cubic-bezier(.3,1.6,.5,1)"

/** The animated waveform used by the listen stop. Static when motion is reduced. */
function Wave({ reduced }: { reduced: boolean }) {
  return (
    <div aria-hidden className="flex h-10 items-center gap-[3px]">
      {Array.from({ length: 34 }, (_, i) => (
        <span
          key={i}
          className={cn("w-[3px] shrink-0 rounded-[3px]", i < 12 ? "bg-[linear-gradient(180deg,#FFB37A,#FF4D00)]" : "bg-bb-border")}
          style={{
            height: 10 + Math.round(Math.abs(Math.sin(i * 1.7)) * 24 + (i % 4) * 1.5),
            animation: reduced ? undefined : `bbwave ${0.7 + (i % 5) * 0.12}s ease-in-out ${i * 0.03}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

interface StopProps {
  index: number
  p: number
  night: boolean
  reduced: boolean
  nodeRing: string
  time: string
  chip: string
  chipIcon: BBIconName
  title: string
  body: string
  muted: string
  innerRef: (el: HTMLElement | null) => void
  children: (on: boolean) => React.ReactNode
}

/** One stop: node on the spine, time + mode chip, heading, copy and a demo card that animates once `on`. */
function Stop({ index: i, p, night, reduced, nodeRing, time, chip, chipIcon, title, body, muted, innerRef, children }: StopProps) {
  const d = p - i
  const ad = Math.abs(d)
  const on = p > i - 0.45
  const active = Math.round(p) === i
  const k = reduced ? 0 : 26
  const style: React.CSSProperties = reduced
    ? {}
    : {
        opacity: clamp(1 - ad * 0.7, 0.3, 1),
        transform: `translateY(${clamp(-d * k, -k, k).toFixed(1)}px) scale(${(1 - clamp(ad, 0, 1) * 0.03).toFixed(3)})`,
        transition: `opacity .5s, transform .7s ${EASE}`,
      }
  const ai = i >= 4
  return (
    <article ref={innerRef} className="relative flex min-h-[80vh] flex-col justify-center gap-[18px] py-10" style={style}>
      <span
        aria-hidden
        className="absolute -left-14 top-1/2 -mt-[11px] h-[22px] w-[22px] rounded-full border-[3px]"
        style={{
          borderColor: nodeRing,
          background: on ? (ai ? "linear-gradient(180deg,#7D97FF,#3B5BDB)" : "linear-gradient(180deg,#FF8A3D,#FF4D00)") : night ? "#2A3556" : "#DCE1EA",
          boxShadow: active
            ? ai
              ? "0 0 0 6px rgba(59,91,219,.22),0 0 24px rgba(59,91,219,.8)"
              : "0 0 0 6px rgba(255,77,0,.22),0 0 24px rgba(255,77,0,.8)"
            : "none",
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-[22px] font-extrabold tabular-nums">{time}</span>
        <span
          className={cn(
            "flex h-8 items-center gap-2 rounded-full pl-2.5 pr-3.5 text-sm font-semibold",
            ai ? "border border-white/[.14] bg-white/[.08]" : "bg-bb-surface text-bb-text shadow-[var(--bb-sh1)]"
          )}
        >
          <Icon name={chipIcon} size={18} />
          {chip}
        </span>
      </div>
      <h3 className="max-w-[560px] font-display text-[clamp(28px,3.2vw,40px)] font-extrabold leading-[1.04] tracking-[-0.03em] [text-wrap:balance]">
        {title}
      </h3>
      <p className="max-w-[520px] text-[17px]" style={{ color: muted }}>
        {body}
      </p>
      {children(on)}
    </article>
  )
}

export function DayTimelineSection() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"
  const reduced = useReducedMotion()
  const wide = useMinWidth(960)
  const notPhone = useMinWidth(560)

  const [p, setP] = React.useState(0)
  const stopEls = React.useRef<(HTMLElement | null)[]>([])

  React.useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const c = window.innerHeight * 0.5
      const cs = stopEls.current.map((el) => {
        if (!el) return 1e9
        const b = el.getBoundingClientRect()
        return b.top + b.height / 2
      })
      let next = 0
      if (c >= cs[5]) next = 5
      else if (c > cs[0]) {
        for (let i = 0; i < 5; i++) {
          if (c >= cs[i] && c < cs[i + 1]) {
            next = i + (c - cs[i]) / (cs[i + 1] - cs[i])
            break
          }
        }
      }
      setP((prev) => (Math.abs(prev - next) > 0.002 ? next : prev))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    measure()
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const night = dark || p > 3.5
  const sky = at(dark ? SKY_D : SKY_L, p)
  const ink = night ? "#F2F4F8" : "#0A0F24"
  const muted = night ? "#C5CCDA" : "#4A5470"
  const accent = night ? "#FFB37A" : "#B83300"
  const active = Math.round(p)
  const mins = (() => {
    const i = Math.min(Math.floor(p), 4)
    const f = Math.min(1, p - i)
    return Math.round(TIMES[i] + (TIMES[i + 1] - TIMES[i]) * f)
  })()

  let sunX: string, sunY: string, sunBg: string, sunGlow: string
  if (p < 3.4) {
    const q = p / 3.4
    sunX = 50 - 40 * Math.cos(Math.PI * q) + "%"
    sunY = 62 - 46 * Math.sin(Math.PI * q) + "%"
    sunBg = "radial-gradient(circle at 35% 30%,#FFF4D6,#FFB37A 40%,#FF4D00 80%)"
    sunGlow = "0 0 40px 10px rgba(255,120,40,.6)"
  } else {
    const m = clamp((p - 3.4) / 1.6, 0, 1)
    sunX = 22 + 50 * m + "%"
    sunY = 52 - 26 * Math.sin(Math.PI * (0.2 + m * 0.5)) + "%"
    sunBg = "radial-gradient(circle at 35% 30%,#FFFFFF,#C9D4FF 55%,#7D97FF)"
    sunGlow = "0 0 36px 8px rgba(125,151,255,.55)"
  }

  const common = { p, reduced, nodeRing: sky, muted }
  const ref = (i: number) => (el: HTMLElement | null) => {
    stopEls.current[i] = el
  }
  const on = (i: number) => p > i - 0.45
  const tr = (css: string) => (reduced ? "none" : css)

  return (
    <section id="day" className="relative py-[120px] pb-[140px]" style={{ background: sky, color: ink, transition: reduced ? undefined : "background-color .2s linear" }}>
      <div className="mx-auto max-w-[1280px] px-[clamp(20px,4vw,56px)]">
        <div className="mb-16 flex max-w-[780px] flex-col gap-[18px]">
          <span className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
            <Icon name="sun" size={18} /> A day with Book Buddy
          </span>
          <h2 className="font-display text-[clamp(38px,5.2vw,68px)] font-extrabold leading-[0.98] tracking-[-0.04em] [text-wrap:balance]">
            One student. One textbook. Every hour of her day.
          </h2>
          <p className="max-w-[620px] text-[19px] [text-wrap:pretty]" style={{ color: muted }}>
            Follow Ananya, B.Sc. Physics, from the 7 am bus to lights-out: the same Chapter 7, in whichever mode the moment needs. Scroll, and watch the day move.
          </p>
        </div>

        <div className="grid items-start gap-[clamp(32px,5vw,80px)]" style={{ gridTemplateColumns: wide ? "minmax(0,5fr) minmax(0,7fr)" : "minmax(0,1fr)" }}>
          {wide && (
            <aside aria-hidden className="sticky top-[110px] flex flex-col gap-[26px] pt-2">
              <div
                className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-full border border-white/35"
                style={{
                  background: `linear-gradient(180deg,${at(TOP, p)} 0%,${at(BOT, p)} 62%)`,
                  boxShadow: "inset 0 2px 0 rgba(255,255,255,.35),0 40px 80px -40px rgba(10,15,36,.6)",
                }}
              >
                <div className="absolute inset-x-0 bottom-0 top-[62%] bg-[linear-gradient(180deg,rgba(10,15,36,.22),rgba(10,15,36,.42))]" />
                <div className="absolute inset-x-[8%] top-[62%] h-px bg-white/55" />
                <div
                  className="absolute aspect-square w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: sunX, top: sunY, background: sunBg, boxShadow: sunGlow }}
                />
                <div className="absolute inset-x-0 bottom-[12%] text-center font-mono text-xs tracking-[0.12em] text-white/85">{PHASES[active]}</div>
              </div>
              <div className="font-display text-[clamp(64px,8vw,112px)] font-extrabold leading-[0.9] tracking-[-0.05em] tabular-nums">{hhmm(mins)}</div>
              <div className="flex flex-col gap-0.5">
                {TIMES.map((t, i) => (
                  <div key={t} className="flex h-[34px] items-center gap-3 text-[15px] transition-opacity [transition-duration:400ms]" style={{ opacity: active === i ? 1 : 0.45 }}>
                    <span className="w-11 font-semibold tabular-nums">{hhmm(t)}</span>
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: active === i ? (i >= 4 ? "#7D97FF" : "#FF4D00") : "currentColor",
                        boxShadow: active === i ? `0 0 12px ${i >= 4 ? "#3B5BDB" : "#FF4D00"}` : "none",
                      }}
                    />
                    <span className="font-semibold">{MODES[i]}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <div className="relative pl-14">
            <div aria-hidden className="absolute bottom-0 left-2.5 top-0 w-0.5 rounded-sm" style={{ background: night ? "rgba(255,255,255,.14)" : "rgba(10,15,36,.12)" }} />
            <div
              aria-hidden
              className="absolute left-2.5 top-0 w-0.5 rounded-sm bg-[linear-gradient(180deg,#FF4D00,#3B5BDB)] shadow-[0_0_14px_rgba(255,77,0,.6)]"
              style={{ height: `${(clamp(p / 5, 0, 1) * 100).toFixed(1)}%` }}
            />

            {/* 07:10 · listen */}
            <Stop {...common} index={0} night={false} innerRef={ref(0)} time="07:10" chip="On the bus · Listen" chipIcon="bus"
              title="The chapter picks up exactly where she paused."
              body="Natural-voice narration of Chapter 7 at 1.25×, sleeping at chapter end. No juggling earbuds and a PDF.">
              {() => (
                <div className="grid max-w-[540px] grid-cols-[88px_minmax(0,1fr)] items-center gap-[18px] rounded-[26px] bg-bb-surface p-5 text-bb-text shadow-[var(--bb-sh1)]">
                  <div className="flex aspect-[3/4] flex-col justify-end rounded-xl bg-[linear-gradient(155deg,#FFB37A_0%,#FF4D00_45%,#3B5BDB_100%)] p-2.5 font-display text-[13px] font-extrabold leading-[1.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_14px_24px_-14px_rgba(59,91,219,.8)]">
                    Physics<br />Class XI
                  </div>
                  <div className="flex min-w-0 flex-col gap-2.5">
                    <div>
                      <div className="text-base font-bold">Ch 7 · Heat &amp; Thermodynamics</div>
                      <div className="text-[13px] text-bb-muted">Narrated by Meera</div>
                    </div>
                    <Wave reduced={reduced} />
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-bb-primary shadow-glow-blaze">
                        <Icon name="pause" size={18} tone="onfill" />
                      </span>
                      <span className="text-[13px] tabular-nums text-bb-muted">2:34 / 8:12</span>
                      <span className="ml-auto rounded-full bg-bb-surface-2 px-2.5 py-1 text-xs font-bold">1.25×</span>
                      <span className="rounded-full bg-bb-info-soft px-2.5 py-1 text-xs font-bold text-bb-info-ink">Sleep · end of chapter</span>
                    </div>
                  </div>
                </div>
              )}
            </Stop>

            {/* 09:30 · read */}
            <Stop {...common} index={1} night={false} innerRef={ref(1)} time="09:30" chip="In the lecture · Read" chipIcon="book-open"
              title="Same page as the professor, reflowed for her phone."
              body="EPUBs reflow to any screen; PDFs keep the publisher's exact layout. One highlight, and it follows her to every device.">
              {(is) => (
                <div className="relative max-w-[540px] rounded-[26px] border border-[rgba(10,15,36,.06)] bg-[#FBFBFD] px-[30px] pb-[34px] pt-7 text-[#0A0F24] shadow-[var(--bb-sh1)]">
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#B83300]">Chapter 7 · p. 142</div>
                  <div className="mt-1.5 font-reading text-[27px] font-medium tracking-[-0.015em]">Specific heat capacity</div>
                  <p className="mt-3 font-reading text-lg leading-[1.7]">
                    Heat flows from a body at higher temperature to one at lower temperature.{" "}
                    <span
                      className="bg-[linear-gradient(#FFE3A3,#FFE3A3)] bg-no-repeat px-0.5"
                      style={{ backgroundPosition: "0 85%", backgroundSize: is || reduced ? "100% 42%" : "0% 42%", transition: tr(`background-size 1.3s ${EASE} .2s`) }}
                    >
                      The specific heat capacity of water is 4186 J/kg·K
                    </span>
                    , which makes it an excellent thermal buffer.
                  </p>
                  <div
                    className="absolute -bottom-5 right-4 flex max-w-[calc(100%-32px)] flex-wrap justify-end gap-1 rounded-[22px] bg-[#0A0F24] p-[5px] text-[#F2F4F8] shadow-[0_18px_30px_-14px_rgba(10,15,36,.7)]"
                    style={{ opacity: is || reduced ? 1 : 0, transform: is || reduced ? "none" : "translateY(10px)", transition: tr(`opacity .4s .9s, transform .5s .9s ${EASE}`) }}
                  >
                    <span className="flex h-[34px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold"><Icon name="highlighter" size={16} /> Highlight</span>
                    <span className="flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold"><Icon name="annotate" size={16} /> Note</span>
                    <span className="flex h-[34px] items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold"><Icon name="varta" size={16} /> Ask Varta</span>
                  </div>
                </div>
              )}
            </Stop>

            {/* 13:15 · annotate */}
            <Stop {...common} index={2} night={false} innerRef={ref(2)} time="13:15" chip="Library break · Annotate" chipIcon="file"
              title="Ink, shapes and voice notes, right on the PDF."
              body="PDF Studio runs in the browser: freehand ink, smart shapes, redaction, OCR search and audio notes. Nothing to install.">
              {(is) => (
                <div className={cn("grid max-w-[540px] gap-4 rounded-[26px] bg-bb-surface-2 p-[22px] shadow-[var(--bb-sh1)]", notPhone ? "grid-cols-[52px_minmax(0,1fr)]" : "grid-cols-1")}>
                  <div className={cn("flex gap-1.5 self-start rounded-2xl bg-[#0A0F24] p-1.5 text-[#F2F4F8]", notPhone ? "flex-col" : "flex-row justify-between")}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bb-primary shadow-[inset_0_1px_0_rgba(255,255,255,.6)]"><Icon name="annotate" size={20} tone="onfill" /></span>
                    {(["highlighter", "layers", "scan", "mic"] as const).map((n) => (
                      <span key={n} className="flex h-10 w-10 items-center justify-center"><Icon name={n} size={20} /></span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2.5 rounded-[14px] bg-white p-[22px] shadow-[0_20px_40px_-26px_rgba(10,15,36,.5)]">
                    <div className="text-center font-mono text-[11px] text-[#8E9AB8]">— page 142 —</div>
                    <div className="h-[9px] w-full rounded bg-[#E6EAF1]" />
                    <div className="h-[9px] w-[88%] rounded bg-[#FFE3A3]" />
                    <div className="h-[9px] w-[96%] rounded bg-[#E6EAF1]" />
                    <svg viewBox="0 0 260 44" className="h-10 w-[78%] overflow-visible" fill="none" aria-hidden>
                      <path
                        d="M4 30c22-26 32 14 56-8s32 12 60-10 36 14 56-4 22 8 80-2"
                        stroke="#FF4D00"
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        style={{ strokeDasharray: 420, strokeDashoffset: is || reduced ? 0 : 420, transition: tr("stroke-dashoffset 1.8s cubic-bezier(.5,0,.2,1) .2s"), filter: "drop-shadow(0 2px 4px rgba(255,77,0,.45))" }}
                      />
                    </svg>
                    <div className="h-[9px] w-[80%] rounded bg-[#E6EAF1]" />
                    <div
                      className="mt-1.5 flex items-center gap-2.5 rounded-xl bg-[#DCE8FF] px-3 py-2 text-[13px] font-semibold text-[#1E3A8A]"
                      style={{ opacity: is || reduced ? 1 : 0, transition: tr("opacity .5s 1.6s") }}
                    >
                      <Icon name="mic" size={16} /> Voice note · 0:18 — “ask sir about latent heat”
                    </div>
                  </div>
                </div>
              )}
            </Stop>

            {/* 17:40 · ask Varta */}
            <Stop {...common} index={3} night={false} innerRef={ref(3)} time="17:40" chip="A doubt · Ask Varta" chipIcon="varta"
              title="Varta answers from her textbook, and shows the page."
              body="Every answer cites the page and paragraph. If it isn't in the book, Varta says so.">
              {(is) => (
                <div className="flex max-w-[540px] flex-col gap-3 rounded-[26px] bg-bb-surface p-[22px] text-bb-text shadow-[var(--bb-sh1)]">
                  <div className="max-w-[80%] self-end rounded-[18px_18px_4px_18px] bg-[#0A0F24] px-4 py-3 text-[15px] text-[#F2F4F8]">Why is water&apos;s specific heat so high?</div>
                  <div className="flex items-start gap-3">
                    <span className="h-[34px] w-[34px] shrink-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,#FFFFFF_0%,#C9D4FF_18%,#3B5BDB_52%,#1E3A8A_85%)] shadow-[0_0_18px_rgba(59,91,219,.55)]" />
                    <div className="flex flex-col gap-2.5 rounded-[4px_18px_18px_18px] bg-bb-info-soft px-4 py-3 text-[15px]">
                      <span>Hydrogen bonding between water molecules — breaking those bonds absorbs a lot of energy before the temperature can rise.</span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className="flex h-7 items-center gap-1.5 rounded-full bg-[#3B5BDB] px-2.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_6px_14px_-6px_rgba(59,91,219,.9)]"
                          style={{ transform: is || reduced ? "scale(1)" : "scale(0)", transition: tr(`transform .5s ${SPRING} .5s`) }}
                        >
                          p. 142 · ¶2
                        </span>
                        <span className="flex items-center gap-1.5 text-[13px] text-bb-muted" style={{ opacity: is || reduced ? 1 : 0, transition: tr("opacity .4s 1s") }}>
                          <Icon name="flashcards" size={16} /> Saved to Sanchika
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Stop>

            {/* 21:30 · revise */}
            <Stop {...common} index={4} night innerRef={ref(4)} time="21:30" chip="Night revision · Sanchika" chipIcon="flashcards"
              title="Today's highlights are already flashcards."
              body="Sanchika gathers highlights, notes and Varta answers from every book into one notebook, with tonight's cards ready.">
              {() => (
                <div className="flex max-w-[540px] flex-col gap-3.5">
                  <div className="h-[200px] [perspective:1200px]">
                    <div
                      className="relative h-full w-full [transform-style:preserve-3d]"
                      style={{ transform: p > 3.7 || reduced ? "rotateY(180deg)" : "rotateY(0deg)", transition: tr("transform 1s cubic-bezier(.3,.9,.3,1) .4s") }}
                    >
                      <div className="absolute inset-0 flex flex-col justify-between rounded-3xl border border-white/[.12] bg-[linear-gradient(160deg,#1E2B57,#121A33)] p-[26px] text-[#F2F4F8] shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_30px_60px_-30px_rgba(0,0,0,.8)] [backface-visibility:hidden]">
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#FFB37A]">Card 3 of 12 · Question</span>
                        <span className="font-reading text-2xl leading-[1.3]">Why does water take so long to heat up?</span>
                      </div>
                      <div className="absolute inset-0 flex flex-col justify-between rounded-3xl bg-[linear-gradient(170deg,#FF8A3D,#FF4D00_60%,#D93A00)] p-[26px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.6),0_30px_60px_-24px_rgba(255,77,0,.6)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <span className="text-xs font-bold uppercase tracking-[0.12em]">Answer · from p. 142</span>
                        <span className="font-reading text-[22px] leading-[1.35]">Hydrogen bonds absorb energy first — specific heat 4186 J/kg·K.</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5 text-sm font-semibold">
                    <span className="flex h-9 items-center gap-2 rounded-full border border-white/[.14] bg-white/[.08] px-3.5"><Icon name="flashcards" size={18} /> 12 cards due</span>
                    <span className="flex h-9 items-center gap-2 rounded-full border border-white/[.14] bg-white/[.08] px-3.5"><Icon name="flame" size={18} /> 9-day streak</span>
                  </div>
                </div>
              )}
            </Stop>

            {/* 23:05 · synced */}
            <Stop {...common} index={5} night innerRef={ref(5)} time="23:05" chip="Lights out · Synced" chipIcon="sync"
              title="Tomorrow starts on page 142, on any device."
              body="Position, highlights and bookmarks sync across phone, laptop and the installed app.">
              {() => (
                <div className="flex max-w-[540px] flex-col gap-4 rounded-[26px] border border-white/[.12] bg-white/[.06] px-6 py-[22px] text-[#F2F4F8] backdrop-blur-[10px]">
                  {([["smartphone", "Phone"], ["monitor", "Laptop"], ["download", "Installed app"]] as const).map(([icon, label], i) => (
                    <div key={label} className="grid grid-cols-[24px_minmax(0,96px)_minmax(40px,1fr)_40px] items-center gap-2.5 text-sm">
                      <Icon name={icon} size={22} />
                      <span>{label}</span>
                      <span className="h-2 overflow-hidden rounded-lg bg-white/[.12]">
                        <span
                          className="block h-full rounded-lg bg-[linear-gradient(90deg,#FFB37A,#FF4D00)]"
                          style={{ width: on(5) || reduced ? "64%" : "6%", transition: tr(`width 1.2s ${EASE} ${0.2 + i * 0.25}s`) }}
                        />
                      </span>
                      <span className="tabular-nums text-[#A9B4D0]">64%</span>
                    </div>
                  ))}
                </div>
              )}
            </Stop>
          </div>
        </div>
      </div>
    </section>
  )
}
