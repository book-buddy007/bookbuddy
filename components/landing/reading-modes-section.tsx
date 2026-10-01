"use client"

import { useState } from "react"
import { BookOpen, FileText, Headphones, Bot, Type, Sun, ZoomIn, Gauge, Quote } from "lucide-react"
import styles from "@/app/home.module.css"

/**
 * "Four Ways to Read One Book" — an interactive format switcher that surfaces the
 * four real reading modes Book Buddy ships (EPUB reflow, page-accurate PDF, TTS
 * audiobook, Varta chat). Each tab swaps a CSS-composed device preview.
 * Pure React state + CSS transitions; no animation lib. Matches the Indic palette.
 */

type Mode = "epub" | "pdf" | "tts" | "varta"

const MODES: { id: Mode; label: string; icon: typeof BookOpen; tint: string; ring: string }[] = [
  { id: "epub", label: "EPUB", icon: BookOpen, tint: "#B45309", ring: "#B45309" },
  { id: "pdf", label: "PDF", icon: FileText, tint: "#C62828", ring: "#C62828" },
  { id: "tts", label: "Audiobook", icon: Headphones, tint: "#006A6E", ring: "#006A6E" },
  { id: "varta", label: "Varta", icon: Bot, tint: "#0D1B6E", ring: "#0D1B6E" },
]

export function ReadingModesSection() {
  const [mode, setMode] = useState<Mode>("epub")
  const active = MODES.find((m) => m.id === mode)!

  return (
    <section id="reading-modes" className={`py-24 ${styles.featuresGridBackground}`}>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-12 animate-landing-fade-in-up">
          <span
            className="text-[#B45309] font-bold text-lg uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The Reading Experience
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4 text-[#0D1B6E] font-serif">
            Four Ways to Read <span className="gradient-text-indic-soft">One Book</span>
          </h2>
          <p className="text-xl text-[#3E2723] max-w-2xl mx-auto font-medium">
            Upload once. Every title instantly becomes a reflowable EPUB, a page-accurate PDF,
            a natural-voice audiobook, and an AI you can talk to.
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {MODES.map((m) => {
            const on = m.id === mode
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                aria-pressed={on}
                className="group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 border-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  background: on ? m.tint : "rgba(255,255,255,0.7)",
                  color: on ? "#fff" : "#3E2723",
                  borderColor: on ? m.tint : "rgba(93,64,55,0.18)",
                  boxShadow: on ? `0 8px 24px ${m.tint}33` : "none",
                }}
              >
                <m.icon className="w-4 h-4" />
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Device preview */}
        <div className="max-w-4xl mx-auto">
          <div
            className="relative rounded-2xl bg-white border border-slate-200/80 overflow-hidden transition-shadow duration-500"
            style={{ boxShadow: `0 24px 60px ${active.tint}1f` }}
          >
            {/* Chrome bar */}
            <div className="h-10 border-b border-slate-100 bg-slate-50 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
              </div>
              <div
                className="ml-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                style={{ color: active.tint, background: `${active.tint}14` }}
              >
                <active.icon className="w-3 h-3" />
                {active.label} mode
              </div>
              <span className="ml-auto text-[10px] text-slate-400 font-medium hidden sm:block">
                Class 10 · Physics · Heat &amp; Thermodynamics
              </span>
            </div>

            {/* Body — swaps per mode */}
            <div className="p-6 md:p-8 min-h-[320px]">
              {mode === "epub" && <EpubPreview />}
              {mode === "pdf" && <PdfPreview />}
              {mode === "tts" && <TtsPreview />}
              {mode === "varta" && <VartaPreview />}
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-5">
            Switch modes anytime — your highlights, bookmarks, and progress sync across all four.
          </p>
        </div>
      </div>
    </section>
  )
}

function EpubPreview() {
  return (
    <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
      <div className="font-serif" style={{ background: "#FBF7EF" }}>
        <div className="p-5 rounded-xl border border-[#E7D9B8]">
          <h4 className="text-lg font-bold text-slate-800 mb-3">Heat &amp; Thermodynamics</h4>
          <p className="text-sm leading-7 text-slate-700">
            Heat is a form of energy that flows from a body at higher temperature to one at
            lower temperature. The <span className="bg-[#FEF08A] px-1 rounded">specific heat
            capacity of water is 4186 J/kg·K</span>, making it an excellent thermal buffer in
            biological systems and a cornerstone of climate regulation.
          </p>
        </div>
      </div>
      <div className="flex md:flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#B45309]/8 border border-[#B45309]/15 text-[#B45309] text-xs font-bold">
          <Type className="w-3.5 h-3.5" /> Font size
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#B45309]/8 border border-[#B45309]/15 text-[#B45309] text-xs font-bold">
          <Sun className="w-3.5 h-3.5" /> Sepia
        </div>
        <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-bold text-center">
          Reflowable
        </div>
      </div>
    </div>
  )
}

function PdfPreview() {
  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-md">
        <div className="absolute -top-2 -right-2 inline-flex items-center gap-1 bg-[#C62828] text-white text-[10px] font-bold px-2 py-1 rounded-full z-10">
          <ZoomIn className="w-3 h-3" /> 100%
        </div>
        <div className="rounded-lg border border-slate-300 bg-white shadow-inner p-6">
          <div className="text-center text-[10px] text-slate-400 font-mono mb-3">— page 142 —</div>
          <div className="space-y-2">
            <div className="h-2.5 bg-slate-200 rounded w-full" />
            <div className="h-2.5 bg-slate-200 rounded w-11/12" />
            <div className="h-2.5 bg-[#FDE68A] rounded w-full" />
            <div className="h-2.5 bg-slate-200 rounded w-4/5" />
            <div className="h-20 my-3 rounded bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
              Fig 7.3 — Convection currents
            </div>
            <div className="h-2.5 bg-slate-200 rounded w-full" />
            <div className="h-2.5 bg-slate-200 rounded w-3/4" />
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-500 mt-3 font-medium">
          Pixel-perfect layout — exactly as the publisher printed it.
        </p>
      </div>
    </div>
  )
}

function TtsPreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 py-4">
      <div className="w-16 h-16 rounded-full bg-[#006A6E] flex items-center justify-center shadow-lg shadow-[#006A6E]/30">
        <Headphones className="w-7 h-7 text-white" />
      </div>
      {/* Waveform */}
      <div className="flex items-end gap-1 h-16">
        {[30, 55, 40, 70, 95, 60, 80, 45, 65, 90, 50, 75, 35, 60, 85, 40, 70, 55].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full"
            style={{
              height: `${h}%`,
              background: i < 9 ? "#006A6E" : "#006A6E33",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
        <span>2:34</span>
        <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-[35%] bg-[#006A6E] rounded-full" />
        </div>
        <span>8:12</span>
      </div>
      <div className="flex gap-2">
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#006A6E]/10 text-[#006A6E] text-xs font-bold border border-[#006A6E]/20">
          <Gauge className="w-3.5 h-3.5" /> 1.25× speed
        </span>
        <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
          Natural voice
        </span>
      </div>
    </div>
  )
}

function VartaPreview() {
  return (
    <div className="max-w-lg mx-auto flex flex-col gap-3">
      <div className="self-end bg-[#0D1B6E] text-white text-sm p-3 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%]">
        Why is water&apos;s specific heat so high?
      </div>
      <div className="self-start bg-white border border-slate-200 text-slate-700 text-sm p-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[92%] leading-relaxed">
        Water&apos;s high specific heat (4186 J/kg·K) comes from hydrogen bonding between
        molecules — breaking those bonds absorbs large amounts of energy.
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 bg-[#B45309]/10 text-[#B45309] text-[11px] font-bold px-2 py-0.5 rounded">
            <Quote className="w-3 h-3" /> p. 142, ¶2
          </span>
          <span className="text-[11px] text-slate-400">cited from your textbook</span>
        </div>
      </div>
      <div className="flex gap-2 mt-1">
        <button className="flex-1 text-xs font-bold text-[#0D1B6E] bg-[#0D1B6E]/8 py-2 rounded-lg border border-[#0D1B6E]/15">
          Explain more
        </button>
        <button className="flex-1 text-xs font-bold text-[#B45309] bg-[#B45309]/8 py-2 rounded-lg border border-[#B45309]/15">
          Make flashcards
        </button>
        <button className="flex-1 text-xs font-bold text-[#006A6E] bg-[#006A6E]/8 py-2 rounded-lg border border-[#006A6E]/15">
          Quiz me
        </button>
      </div>
    </div>
  )
}
