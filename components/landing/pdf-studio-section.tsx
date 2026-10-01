import { PenTool, Shapes, Highlighter, EyeOff, ScanText, Mic, MousePointer2 } from "lucide-react"

/**
 * PDF Studio — surfaces the real in-browser annotation toolset from the codebase
 * (freehand ink, smart shapes, highlight, redaction, OCR, audio notes). A composed
 * PDF-page mockup with a floating toolbar. Saffron/teal Indic palette.
 */

const TOOLS = [
  { icon: PenTool, label: "Freehand ink", tint: "#C62828" },
  { icon: Shapes, label: "Smart shapes", tint: "#B45309" },
  { icon: Highlighter, label: "Highlight", tint: "#D97706" },
  { icon: EyeOff, label: "Redaction", tint: "#0D1B6E" },
  { icon: ScanText, label: "OCR search", tint: "#006A6E" },
  { icon: Mic, label: "Audio notes", tint: "#9333EA" },
]

export function PdfStudioSection() {
  return (
    <section id="pdf-studio" className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy + tool chips */}
          <div className="animate-landing-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#C62828]/20 text-[#C62828] font-semibold text-sm mb-6 drop-shadow-sm">
              <PenTool className="h-4 w-4" /> Built-in PDF Studio
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900 font-serif leading-tight">
              A full annotation studio, <span className="text-[#B45309]">right in the browser.</span>
            </h2>
            <p className="text-lg text-slate-700 mb-8 leading-relaxed">
              No downloads, no separate app. Mark up any PDF with Drawboard-grade tools — then
              everything syncs to Sanchika and travels with the student across devices.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TOOLS.map((t, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-2.5 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:-translate-y-1 transition-transform duration-300"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${t.tint}12`, color: t.tint }}
                  >
                    <t.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: PDF page with floating toolbar */}
          <div className="relative lg:ml-6 animate-landing-fade-in">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#C62828]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden">
              {/* Floating vertical toolbar */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 bg-slate-900/95 backdrop-blur rounded-xl p-1.5 shadow-lg">
                {TOOLS.map((t, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
                    style={i === 0 ? { background: t.tint, color: "#fff" } : undefined}
                    title={t.label}
                  >
                    <t.icon className="w-4 h-4" />
                  </div>
                ))}
              </div>

              {/* Page */}
              <div className="pl-16 pr-6 py-7">
                <div className="text-center text-[10px] text-slate-400 font-mono mb-3">— page 142 —</div>
                <div className="space-y-2.5 relative">
                  <div className="h-2.5 bg-slate-200 rounded w-full" />
                  {/* highlighted line */}
                  <div className="h-2.5 bg-[#FEF08A] rounded w-11/12 relative">
                    <span className="absolute -left-1 top-0 w-0.5 h-full bg-[#F59E0B] rounded" />
                  </div>
                  {/* freehand ink scribble (SVG) */}
                  <div className="relative h-2.5 w-full">
                    <div className="h-2.5 bg-slate-200 rounded w-4/5" />
                    <svg className="absolute -top-3 left-1/3 w-24 h-8 pointer-events-none" viewBox="0 0 100 30">
                      <path d="M2,20 Q15,2 28,18 T56,16 T84,12" fill="none" stroke="#C62828" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                    </svg>
                  </div>
                  {/* shape annotation */}
                  <div className="relative">
                    <div className="h-16 my-2 rounded bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                      Fig 7.3 — Convection currents
                    </div>
                    <div className="absolute inset-2 border-2 border-dashed border-[#006A6E] rounded pointer-events-none" />
                    <span className="absolute -top-2 right-2 bg-[#006A6E] text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                      shape
                    </span>
                  </div>
                  {/* redaction bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 bg-slate-900 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-200 rounded flex-1" />
                  </div>
                  {/* audio note pill */}
                  <div className="inline-flex items-center gap-1.5 mt-1 bg-[#9333EA]/10 text-[#9333EA] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#9333EA]/20">
                    <Mic className="w-3 h-3" /> Audio note · 0:12
                  </div>
                </div>
              </div>

              {/* cursor hint */}
              <div className="absolute bottom-5 right-6 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <MousePointer2 className="w-3.5 h-3.5" /> draw anywhere
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
