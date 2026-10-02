"use client"

import * as React from "react"

/* The hero scene: a 3D book that opens, its text lifts off the page as sound, headphones
   settle around it, then it closes again (9s loop). Pure CSS 3D driven by one rAF loop that
   writes transforms straight to the DOM (refs, not React state). Mouse parallax eases toward
   the pointer; prefers-reduced-motion freezes the scene on the "listening" frame (t = 5s).

   Palette note: the prototype used a neon lime for the audio bars, glyphs and chips. The
   system has no lime, so audio is drawn in amber/blaze instead. */

const PERIOD = 9
const GLYPHS = ["अ", "B", "क", "o", "a", "ब", "k", "e", "प", "r", "ग", "s"]
const DOTS: [number, string][] = [
  [22, "linear-gradient(160deg,var(--bb-blaze-soft),var(--bb-blaze) 60%,var(--bb-blaze-deep))"],
  [14, "linear-gradient(160deg,#FFF3C4,var(--bb-amber) 60%,#E89A00)"],
  [18, "linear-gradient(160deg,var(--bb-periwinkle),var(--bb-cobalt-light) 60%,var(--bb-cobalt))"],
  [12, "linear-gradient(160deg,var(--bb-cream),var(--bb-amber) 60%,#E8A200)"],
  [20, "linear-gradient(160deg,var(--bb-cobalt-glow),var(--bb-cobalt-light) 60%,var(--bb-cobalt))"],
  [16, "linear-gradient(160deg,var(--bb-blaze-soft),var(--bb-blaze) 60%,var(--bb-blaze-deep))"],
]

const C = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const E = (x: number) => {
  x = C(x)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

const pageEdge = "repeating-linear-gradient(90deg,#FFFFFF 0 2px,var(--bb-paper-line) 2px 3px)"
const pageEdgeH = "repeating-linear-gradient(0deg,#FFFFFF 0 2px,var(--bb-paper-line) 2px 3px)"

export function Hero3D({ onListening, speed = 1, className }: { onListening?: (listening: boolean) => void; speed?: number; className?: string }) {
  const outer = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)

  const rig = React.useRef<HTMLDivElement>(null)
  const cover = React.useRef<HTMLDivElement>(null)
  const sheen = React.useRef<HTMLDivElement>(null)
  const lines = React.useRef<HTMLDivElement>(null)
  const bars = React.useRef<HTMLDivElement>(null)
  const hp = React.useRef<HTMLDivElement>(null)
  const shadow = React.useRef<HTMLDivElement>(null)
  const leaves = React.useRef<(HTMLDivElement | null)[]>([])
  const barEls = React.useRef<(HTMLDivElement | null)[]>([])
  const glyphEls = React.useRef<(HTMLSpanElement | null)[]>([])
  const dotEls = React.useRef<(HTMLDivElement | null)[]>([])
  const mouse = React.useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const listening = React.useRef(false)

  // Fit the 620x640 stage into whatever width the layout gives it.
  React.useEffect(() => {
    const el = outer.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(1, entry.contentRect.width / 620)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const t0 = performance.now()
    let raf = 0

    const onMove = (e: MouseEvent) => {
      mouse.current.tx = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.current.ty = (e.clientY / window.innerHeight - 0.5) * 2
    }
    const onLeave = () => {
      mouse.current.tx = 0
      mouse.current.ty = 0
    }
    if (!reduced) {
      window.addEventListener("mousemove", onMove, { passive: true })
      document.addEventListener("mouseleave", onLeave)
    }

    const set = (el: HTMLElement | null, k: string, v: string) => {
      if (el) (el.style as unknown as Record<string, string>)[k] = v
    }

    const tick = (now: number) => {
      const t = reduced ? 5 : ((now - t0) / 1000) * speed
      const p = reduced ? 5 : t % PERIOD
      const m = mouse.current
      m.x += (m.tx - m.x) * 0.06
      m.y += (m.ty - m.y) * 0.06

      const open = E((p - 1.6) / 1.1) * (1 - E((p - 7.6) / 1.1))
      const audio = E((p - 3.8) / 0.9) * (1 - E((p - 7.0) / 0.7))
      const ry = -30 + 26 * open + Math.sin(t * 0.7) * 7 + m.x * 16
      const rx = 12 + 16 * open - m.y * 9
      const fy = Math.sin(t * 1.3) * 9

      set(rig.current, "transform", `translateY(${fy}px) rotateX(${rx}deg) rotateY(${ry}deg)`)
      set(shadow.current, "transform", `scale(${1 - fy / 120}, 1)`)
      set(shadow.current, "opacity", String(0.8 - fy / 60))
      set(cover.current, "transform", `translateZ(22px) rotateY(${-170 * open}deg)`)
      set(sheen.current, "backgroundPosition", `${50 + ry * 2.2}% 0`)

      leaves.current.forEach((el, i) => {
        const lo = E((p - 1.8 - i * 0.16) / 1.1) * (1 - E((p - 7.3 + i * 0.12) / 1.0))
        const a = -lo * (160 - i * 24) + Math.sin(t * 3 + i) * 4 * audio
        set(el, "transform", `translateZ(${20 - i * 2}px) rotateY(${a}deg)`)
      })
      set(lines.current, "opacity", String(1 - audio * 0.8))
      set(bars.current, "opacity", String(audio))
      barEls.current.forEach((el, i) => {
        const h = 8 + audio * (18 + 78 * Math.abs(Math.sin(t * 5.5 + i * 0.55) * Math.cos(t * 2.1 + i * 0.27)))
        set(el, "height", `${h}px`)
      })
      set(hp.current, "opacity", String(audio))
      set(hp.current, "transform", `translateY(${(1 - audio) * -50}px) scale(${0.75 + 0.25 * audio})`)

      glyphEls.current.forEach((el, j) => {
        const f = C((p - 3.2 - j * 0.07) / 1.3)
        const x0 = 34 + (j % 4) * 50
        const y0 = 120 + Math.floor(j / 4) * 40
        const x1 = 12 + j * 20
        const y1 = -90
        const x = x0 + (x1 - x0) * f
        const y = y0 + (y1 - y0) * f - Math.sin(f * Math.PI) * 40
        set(el, "opacity", String(f > 0 && f < 1 ? Math.sin(f * Math.PI) : 0))
        set(el, "transform", `translate3d(${x}px,${y}px,${30 + f * 40}px) scale(${1 - f * 0.4})`)
      })
      dotEls.current.forEach((el, k) => {
        const ang = t * 0.55 + k * ((Math.PI * 2) / DOTS.length)
        const x = 120 + Math.cos(ang) * 250
        const z = Math.sin(ang) * 220
        const y = 170 + Math.sin(ang * 2 + k) * 70
        set(el, "transform", `translate3d(${x}px,${y}px,${z}px)`)
      })

      const isListening = audio > 0.5
      if (isListening !== listening.current) {
        listening.current = isListening
        onListening?.(isListening)
      }
      if (!reduced) raf = requestAnimationFrame(tick)
    }
    // Reduced motion: render the frozen frame once.
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
    }
  }, [speed, onListening])

  return (
    <div ref={outer} className={className} style={{ width: "100%", maxWidth: 620, height: 640 * scale }} aria-hidden="true">
      <div
        style={{
          position: "relative", width: 620, height: 640, transformOrigin: "top left", transform: `scale(${scale})`,
          perspective: 1700, perspectiveOrigin: "50% 38%",
        }}
      >
        <div ref={shadow} style={{ position: "absolute", left: 150, top: 560, width: 320, height: 46, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(0,0,0,0.6) 0%,transparent 70%)" }} />
        <div ref={rig} style={{ position: "absolute", left: 180, top: 190, width: 260, height: 360, transformStyle: "preserve-3d", transform: "rotateX(14deg) rotateY(-28deg)" }}>
          {/* back board, spine, page edges */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "4px 14px 14px 4px", background: "linear-gradient(135deg,var(--bb-cobalt),var(--bb-ink))", transform: "translateZ(-22px)" }} />
          <div style={{ position: "absolute", left: -22, top: 0, width: 44, height: 360, borderRadius: 4, background: "linear-gradient(90deg,var(--bb-blaze-dark) 0%,var(--bb-blaze-light) 45%,var(--bb-blaze) 100%)", transform: "rotateY(-90deg)" }} />
          <div style={{ position: "absolute", left: 236, top: 6, width: 40, height: 348, background: pageEdge, transform: "rotateY(90deg)" }} />
          <div style={{ position: "absolute", left: 0, top: -14, width: 252, height: 40, background: pageEdgeH, transform: "rotateX(90deg)" }} />
          <div style={{ position: "absolute", left: 0, top: 334, width: 252, height: 40, background: pageEdgeH, transform: "rotateX(90deg)" }} />
          {/* first page */}
          <div style={{ position: "absolute", left: 0, top: 6, width: 252, height: 348, background: "#FFFFFF", borderRadius: "2px 8px 8px 2px", transform: "translateZ(10px)", padding: "36px 30px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div ref={lines} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "var(--bb-font-display)", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--bb-ink)" }}>Chapter 7</div>
              {[100, 92, 80, 96, 70, 88, 94, 60].map((w, i) => (
                <div key={i} style={{ height: 6, borderRadius: 3, width: `${w}%`, background: i === 2 ? "var(--bb-cream)" : "var(--bb-paper-line)" }} />
              ))}
            </div>
          </div>
          {/* fanning leaves */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              ref={(el) => { leaves.current[i] = el }}
              style={{ position: "absolute", left: 0, top: 6, width: 252, height: 348, borderRadius: "2px 8px 8px 2px", transformOrigin: "left center", background: "linear-gradient(90deg,var(--bb-surface-2) 0%,#FFFFFF 18%,#FFFFFF 100%)", boxShadow: "inset 0 0 0 1px var(--bb-surface-2)" }}
            />
          ))}
          {/* front cover (hinged) */}
          <div ref={cover} style={{ position: "absolute", inset: 0, transformOrigin: "left center", transformStyle: "preserve-3d", transform: "translateZ(22px)" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "4px 14px 14px 4px", overflow: "hidden", backfaceVisibility: "hidden", background: "linear-gradient(135deg,var(--bb-cobalt-mid) 0%,var(--bb-cobalt) 35%,var(--bb-navy-2) 70%,var(--bb-ink) 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)", padding: "30px 26px 28px 34px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, background: "linear-gradient(90deg,rgba(0,0,0,0.35),rgba(255,255,255,0.08))" }} />
              <div ref={sheen} style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg,transparent 35%,rgba(255,255,255,0.32) 47%,transparent 58%)", backgroundSize: "260% 100%", backgroundPosition: "50% 0", pointerEvents: "none" }} />
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ position: "relative", width: 46, height: 30 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(160deg,var(--bb-periwinkle),var(--bb-cobalt-light))", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" }} />
                  <div style={{ position: "absolute", left: 16, top: 0, width: 30, height: 30, borderRadius: "50%", background: "var(--bb-grad-primary)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "var(--bb-ink)", background: "var(--bb-cream)", borderRadius: 999, padding: "4px 9px" }}>READ · LISTEN</span>
              </div>
              <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontFamily: "var(--bb-font-display)", fontSize: 46, fontWeight: 800, lineHeight: 0.92, letterSpacing: "-0.04em", color: "#FFFFFF" }}>Book<br />Buddy</div>
                <div style={{ width: 44, height: 5, borderRadius: 3, background: "var(--bb-blaze)" }} />
              </div>
            </div>
            <div style={{ position: "absolute", inset: 0, borderRadius: "14px 4px 4px 14px", backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "var(--bb-surface-2)", backgroundImage: "radial-gradient(#C3CBDB 1.2px,transparent 1.2px)", backgroundSize: "14px 14px" }} />
          </div>
          {/* equaliser */}
          <div ref={bars} style={{ position: "absolute", left: 0, top: -140, width: 260, height: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transform: "translateZ(40px)", opacity: 0 }}>
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} ref={(el) => { barEls.current[i] = el }} style={{ width: 6, height: 10, borderRadius: 3, background: "var(--bb-grad-waveform-played)", boxShadow: "0 0 14px rgba(255,138,61,0.55)" }} />
            ))}
          </div>
          {/* headphones */}
          <div ref={hp} style={{ position: "absolute", left: 0, top: 0, width: 260, height: 360, transformStyle: "preserve-3d", opacity: 0, pointerEvents: "none" }}>
            {/* maxWidth none: globals.css sets `* { max-width: 100% }`, which clamps this 408px band to its 260px parent */}
            <div style={{ position: "absolute", left: -74, top: -176, width: 408, maxWidth: "none", height: 310, border: "18px solid var(--bb-blaze)", borderBottom: "none", borderRadius: "204px 204px 0 0", boxShadow: "inset 0 4px 0 rgba(255,255,255,0.35),0 0 40px rgba(255,77,0,0.35)", transform: "translateZ(30px)" }} />
            {[{ left: -104, pad: { justifyContent: "flex-end", paddingRight: 8 }, g: "linear-gradient(90deg,var(--bb-navy-2),var(--bb-cobalt))" }, { left: 292, pad: { justifyContent: "flex-start", paddingLeft: 8 }, g: "linear-gradient(90deg,var(--bb-cobalt),var(--bb-navy-2))" }].map((c, i) => (
              <div key={i} style={{ position: "absolute", left: c.left, top: 110, width: 72, height: 136, borderRadius: 30, background: "linear-gradient(180deg,var(--bb-blaze-soft) 0%,var(--bb-blaze) 50%,var(--bb-blaze-deep) 100%)", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.55),0 20px 40px -14px rgba(255,77,0,0.7)", transform: "translateZ(30px)", display: "flex", alignItems: "center", ...c.pad }}>
                <div style={{ width: 22, height: 104, borderRadius: 12, background: c.g }} />
              </div>
            ))}
          </div>
          {/* glyphs lifting off the page */}
          {GLYPHS.map((ch, j) => (
            <span key={j} ref={(el) => { glyphEls.current[j] = el }} style={{ position: "absolute", left: 0, top: 0, fontFamily: "'Tiro Devanagari Hindi',var(--bb-font-reading)", fontSize: 26, fontWeight: 500, color: "var(--bb-peach-light)", textShadow: "0 0 16px rgba(255,138,61,0.7)", opacity: 0 }}>{ch}</span>
          ))}
          {/* orbiting dots */}
          {DOTS.map(([size, bg], k) => (
            <div key={k} ref={(el) => { dotEls.current[k] = el }} style={{ position: "absolute", left: 0, top: 0, width: size, height: size, borderRadius: "50%", background: bg, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.6),0 8px 20px -6px rgba(0,0,0,0.5)" }} />
          ))}
        </div>
      </div>
    </div>
  )
}
