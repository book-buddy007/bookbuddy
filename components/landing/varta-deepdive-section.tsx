import { Bot, Quote, Layers, FileQuestion, BookMarked, ShieldCheck, Sparkles } from "lucide-react"
import styles from "@/app/home.module.css"

/**
 * Varta deep-dive — positions the RAG study assistant as the core differentiator:
 * answers are grounded in the student's own textbook with paragraph-level citations
 * (no hallucination), and every answer can spin into flashcards, practice questions,
 * or land in the Sanchika archive. Teal/indigo Indic palette, parchment + mandala motif.
 */

const CAPABILITIES = [
  { icon: Quote, title: "Paragraph-level citations", desc: "Every claim links back to the exact page and paragraph in the source book.", tint: "#B45309" },
  { icon: Layers, title: "Instant flashcards", desc: "Turn any explanation into spaced-repetition cards in one tap.", tint: "#006A6E" },
  { icon: FileQuestion, title: "Practice questions", desc: "Generate exam-style questions from the chapter you're reading.", tint: "#0D1B6E" },
  { icon: BookMarked, title: "Saved to Sanchika", desc: "Highlights, answers, and cards collect in one evolving study archive.", tint: "#C62828" },
]

export function VartaDeepDiveSection() {
  return (
    <section id="varta" className="py-24 bg-white relative overflow-hidden">
      {/* faint chakra watermark */}
      <div className={`${styles.featuresGridBackground} absolute inset-0 opacity-60 pointer-events-none`} />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16 animate-landing-fade-in-up">
          <span
            className="inline-flex items-center gap-2 text-[#006A6E] font-bold text-lg uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Bot className="w-5 h-5" /> Varta
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4 text-[#0D1B6E] font-serif">
            The book that <span className="gradient-text-indic-soft">answers back</span>
          </h2>
          <p className="text-xl text-[#3E2723] max-w-2xl mx-auto font-medium">
            Most AI guesses. Varta reads <em>your</em> textbook and answers only from it —
            with a citation you can verify on the page.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: how it thinks */}
          <div className="relative lg:order-2 animate-landing-fade-in">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#006A6E]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#006A6E]" />
                <span className="text-xs font-bold text-slate-800">Varta</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                  <ShieldCheck className="w-3 h-3" /> grounded
                </span>
              </div>
              <div className="p-5 space-y-4">
                {/* retrieval trace */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
                  Searching your book → 3 passages found
                </div>
                <div className="self-end ml-auto w-fit bg-[#0D1B6E] text-white text-sm p-3 rounded-2xl rounded-tr-sm shadow-sm">
                  Explain latent heat in one line.
                </div>
                <div className="bg-white border border-slate-200 text-slate-700 text-sm p-3 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed">
                  Latent heat is the energy absorbed or released during a phase change, without
                  any change in temperature.
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 bg-[#B45309]/10 text-[#B45309] text-[11px] font-bold px-2 py-0.5 rounded">
                      <Quote className="w-3 h-3" /> p. 148, ¶1
                    </span>
                    <span className="inline-flex items-center gap-1 bg-[#006A6E]/10 text-[#006A6E] text-[11px] font-bold px-2 py-0.5 rounded">
                      <Quote className="w-3 h-3" /> p. 149, fig 7.5
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="flex-1 text-center text-[11px] font-bold text-[#006A6E] bg-[#006A6E]/8 py-2 rounded-lg border border-[#006A6E]/15">
                    + Flashcard
                  </span>
                  <span className="flex-1 text-center text-[11px] font-bold text-[#0D1B6E] bg-[#0D1B6E]/8 py-2 rounded-lg border border-[#0D1B6E]/15">
                    + Practice Q
                  </span>
                  <span className="flex-1 text-center text-[11px] font-bold text-[#B45309] bg-[#B45309]/8 py-2 rounded-lg border border-[#B45309]/15">
                    → Sanchika
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: capability list */}
          <div className="lg:order-1 animate-landing-fade-in-up">
            <ul className="space-y-5">
              {CAPABILITIES.map((c, i) => (
                <li
                  key={i}
                  className="group flex items-start gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all duration-300"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: `${c.tint}12`, color: c.tint }}
                  >
                    <c.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg font-serif">{c.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FEF3C7] border border-[#B45309]/20 text-[#92400E] text-sm font-semibold">
              <ShieldCheck className="w-4 h-4" />
              No hallucinations — if it isn&apos;t in the book, Varta says so.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
