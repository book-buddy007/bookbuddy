import { Icon, type BBIconName } from "@/components/ui/icon"
import { Chip } from "@/components/ui/chip"
import { Container, Accent } from "@/components/landing/section"
import { cn } from "@/lib/utils"

/** PDF Studio — the real in-browser annotation toolset (ink, shapes, highlight, redaction, OCR, audio notes). */
const TOOLS: { icon: BBIconName; label: string }[] = [
  { icon: "edit", label: "Freehand ink" },
  { icon: "layers", label: "Smart shapes" },
  { icon: "highlight", label: "Highlight" },
  { icon: "eye-off", label: "Redaction" },
  { icon: "scan", label: "OCR search" },
  { icon: "mic", label: "Audio notes" },
]

export function PdfStudioSection() {
  return (
    <section id="pdf-studio" className="bg-bb-surface py-24 lg:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <Chip icon="pdf" className="mb-6">Built-in PDF Studio</Chip>
          <h2 className="mb-6 font-display text-[clamp(32px,4.2vw,48px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            A full annotation studio, <Accent>right in the browser.</Accent>
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-bb-muted">
            No downloads, no separate app. Mark up any PDF with Drawboard-grade tools — then everything syncs to Sanchika and travels with the student across devices.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TOOLS.map((t) => (
              <div key={t.label} className="flex items-center gap-2.5 rounded-xl bg-bb-bg p-3">
                <Icon name={t.icon} size={22} />
                <span className="text-[13px] font-semibold">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-bb-lg bg-bb-bg p-6 sm:p-10">
          <div className="relative rounded-2xl bg-white p-6 pl-16 text-bb-ink shadow-e2">
            <div className="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col gap-1.5 rounded-xl bg-bb-navy p-1.5 shadow-e2">
              {TOOLS.map((t, i) => (
                <span key={t.label} title={t.label} className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-white", i === 2 && "bg-bb-primary shadow-gloss")}>
                  <Icon name={t.icon} size={18} fillLayer={i === 2 ? false : true} />
                </span>
              ))}
            </div>
            <p className="mb-4 text-center font-mono text-[11px] text-bb-faint">— page 142 —</p>
            <div className="space-y-2.5">
              <div className="h-2.5 w-full rounded bg-bb-surface-2" />
              <div className="h-2.5 w-11/12 rounded bg-bb-highlight" />
              <div className="h-2.5 w-full rounded bg-bb-surface-2" />
              <div className="h-2.5 w-4/5 rounded bg-bb-surface-2" />
              <svg viewBox="0 0 220 40" className="h-10 w-48 text-bb-accent" fill="none" aria-hidden="true">
                <path d="M4 28c20-26 30 14 52-8s30 12 56-10 34 14 52-4 20 8 50-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <div className="h-2.5 w-full rounded bg-bb-surface-2" />
              <div className="h-2.5 w-3/4 rounded bg-bb-surface-2" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
