"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"
import { Segmented } from "@/components/ui/segmented"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useReaderStore } from "@/store/useReaderStore"
import { READER_FONTS, READER_PALETTES, READER_TEXT_SIZES, fromReaderKey, toReaderKey, type ReaderThemeKey } from "@/lib/reader-themes"

const nearestSizeIndex = (px: number) =>
  READER_TEXT_SIZES.reduce((best, s, i) => (Math.abs(s - px) < Math.abs(READER_TEXT_SIZES[best] - px) ? i : best), 0)

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="space-y-2.5">
    <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--rd-sub)]">{label}</h4>
    {children}
  </section>
)

/**
 * The "Aa" panel body — theme tiles, text size, typeface, plus the advanced reading options
 * that already existed (line height, warmth, contrast, focus mode, auto theme). Everything
 * is read from and written to the persisted reader store, so settings follow the student.
 * `showTextControls` is false for PDFs, which cannot reflow.
 */
export function ReaderDisplayContent({ showTextControls = true }: { showTextControls?: boolean }) {
  const s = useReaderStore()
  const themeKey = toReaderKey(s.theme)
  const sizeIdx = nearestSizeIndex(s.fontSize)

  return (
    <div className="space-y-6 text-[color:var(--rd-ink)]">
      <Row label="Theme">
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(READER_PALETTES) as ReaderThemeKey[]).map((k) => {
            const p = READER_PALETTES[k]
            const on = themeKey === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => s.setTheme(fromReaderKey(k))}
                aria-pressed={on}
                className={cn(
                  "flex h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 transition-[border-color,box-shadow] duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus",
                  on ? "border-bb-accent" : "border-transparent"
                )}
                style={{ background: p.bg, color: p.ink, boxShadow: on ? undefined : `inset 0 0 0 1px ${p.border}` }}
              >
                <span className="font-reading text-2xl font-medium leading-none">Aa</span>
                <span className="text-xs font-semibold">{p.label}</span>
              </button>
            )
          })}
        </div>
      </Row>

      {showTextControls && (
        <>
          <Row label="Text size">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Smaller text"
                disabled={sizeIdx === 0}
                onClick={() => s.setFontSize(READER_TEXT_SIZES[Math.max(0, sizeIdx - 1)])}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--rd-track)] text-sm font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-focus"
              >
                A−
              </button>
              <div className="flex flex-1 items-center gap-1.5" role="presentation">
                {READER_TEXT_SIZES.map((_, i) => (
                  <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= sizeIdx ? "bg-bb-progress" : "bg-[color:var(--rd-track)]")} />
                ))}
              </div>
              <button
                type="button"
                aria-label="Larger text"
                disabled={sizeIdx === READER_TEXT_SIZES.length - 1}
                onClick={() => s.setFontSize(READER_TEXT_SIZES[Math.min(READER_TEXT_SIZES.length - 1, sizeIdx + 1)])}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--rd-track)] text-lg font-bold disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-focus"
              >
                A+
              </button>
            </div>
          </Row>

          <Row label="Typeface">
            <Segmented
              fullWidth
              aria-label="Typeface"
              value={READER_FONTS.some((f) => f.value === s.fontFamily) ? s.fontFamily : READER_FONTS[0].value}
              onValueChange={(v) => s.setFontFamily(v)}
              options={READER_FONTS.map((f) => ({ value: f.value, label: f.label }))}
            />
          </Row>

          <Row label={`Line spacing · ${s.lineHeight.toFixed(1)}×`}>
            <Slider min={1} max={2} step={0.1} value={[s.lineHeight]} onValueChange={([v]) => s.setLineHeight(v)} aria-label="Line spacing" />
          </Row>
        </>
      )}

      <Row label={`Warmth · ${s.colorTemperature}%`}>
        <Slider min={0} max={100} step={1} value={[s.colorTemperature]} onValueChange={([v]) => s.setColorTemperature(v)} aria-label="Warmth" />
      </Row>
      <Row label={`Contrast · ${s.contrast.toFixed(1)}×`}>
        <Slider min={0.5} max={1.5} step={0.1} value={[s.contrast]} onValueChange={([v]) => s.setContrast(v)} aria-label="Contrast" />
      </Row>

      <div className="space-y-1 border-t border-[color:var(--rd-border)] pt-4">
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-sm font-semibold"><Icon name="read" size={20} /> Focus mode</span>
          <Switch checked={s.isFocusMode} onCheckedChange={() => s.toggleFocusMode()} />
        </label>
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-sm font-semibold"><Icon name="theme" size={20} /> Auto theme (time of day)</span>
          <Switch checked={s.autoTheme} onCheckedChange={() => s.toggleAutoTheme()} />
        </label>
      </div>
    </div>
  )
}
