"use client"

import * as React from "react"
import { BrandMark } from "@/components/ui/brand-mark"

const FLAG = "bb-splash-shown"

/**
 * Branded launch splash for the installed (standalone) app: navy, glossy mark, Bricolage
 * wordmark and an orange loader. Shown once per session, only when launched from the home
 * screen — normal browser tabs never see it. (The OS draws its own splash from the manifest
 * background colour and icon before this appears.)
 */
export function Splash() {
  const [phase, setPhase] = React.useState<"off" | "on" | "out">("off")

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (!standalone) return
    try {
      if (sessionStorage.getItem(FLAG)) return
      sessionStorage.setItem(FLAG, "1")
    } catch {
      /* ignore: worst case it shows again */
    }
    setPhase("on")
    const fade = setTimeout(() => setPhase("out"), 900)
    const done = setTimeout(() => setPhase("off"), 900 + 240)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [])

  if (phase === "off") return null
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-bb-ink transition-opacity duration-bb-ui ease-bb"
      style={{ opacity: phase === "out" ? 0 : 1 }}
    >
      <BrandMark height={80} />
      <span className="font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] text-white">Book Buddy</span>
      <span className="mt-4 h-1 w-28 overflow-hidden rounded-full bg-white/15">
        <span className="block h-full w-1/2 animate-[bb-loader_1s_ease-in-out_infinite] rounded-full bg-bb-progress" />
      </span>
    </div>
  )
}
