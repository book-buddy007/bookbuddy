import Link from "next/link"
import { ChevronDown, Rocket, BookOpen, Bot, ShieldCheck, Headphones } from "@/components/ui/icons"
import { getLoadingButtonClasses } from "@/components/landing/loading-button"
import { MandalaSVG } from "@/components/landing/mandala-svgs"
import styles from "@/app/home.module.css"

export function HeroSection({ scrolled }: { scrolled: number }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-indic">
      {/* Texture and Ambient Orbs — use literal hex to avoid homepageWrapper overrides */}
      <div className="rangoli-texture" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#FF9933]/15 to-[#FFD700]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-[#006A6E]/15 to-[#0D1B6E]/10 rounded-full blur-3xl" />
      </div>

      {/* Floating Mandala */}
      <div className="mandala-wrapper mandala-breathe">
        <div className={styles.chakraArtwork}>
          <MandalaSVG />
        </div>
      </div>

      {/* Parallax Group Layer */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ transform: `translateY(${scrolled * 0.3}px)` }}
      />

      <div className="container mx-auto px-4 md:px-6 relative z-10 pt-24 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Side: Copy & CTAs */}
          <div className="text-center lg:text-left animate-landing-fade-in-up">
            {/* Badge — #92400E on white/70 ≈ 7:1 ✓ */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-[#B45309]/30 backdrop-blur-sm text-[#92400E] font-semibold text-sm mb-6 shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>Multi-tenant · AI-safe by design</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 text-slate-900 drop-shadow-sm leading-[1.1]">
              AI-Powered Digital Library for <span className="gradient-text-indic-soft block mt-2">Indian Institutions</span>
            </h1>

            {/* Subheadline — surfaces TTS, Audiobooks, and Varta above the fold */}
            <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium mb-8">
              Read, listen, and chat with your books. Equip students with responsive EPUBs, page-accurate PDFs, natural Text‑to‑Speech, and <strong className="text-[#006A6E]">Varta</strong> — the study assistant that answers doubts with strict textbook citations.
            </p>

            {/* CTAs — Primary: #B45309 with white = 5.2:1 ✓ (AA large text) */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10 animate-landing-scale-in">
              <Link
                href="/register"
                className={getLoadingButtonClasses({ variant: "primary", size: "xl", className: "w-full sm:w-auto group !bg-[#B45309] hover:!bg-[#92400E] !text-white !shadow-[0_8px_30px_rgba(180,83,9,0.25)] hover:!shadow-[0_12px_40px_rgba(180,83,9,0.35)] !border-transparent transition-all duration-300 min-h-[48px] focus:!ring-2 focus:!ring-[#B45309]/50 focus:!ring-offset-2" })}>
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  <Rocket className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                  Book a Demo
                </span>
              </Link>
              <Link
                href="#features"
                className={getLoadingButtonClasses({ variant: "outline", size: "xl", className: "w-full sm:w-auto group !border-2 !border-[#006A6E]/50 !text-[#006A6E] hover:!bg-[#006A6E] hover:!text-white !bg-white/60 backdrop-blur-sm transition-all duration-300 min-h-[48px] focus:!ring-2 focus:!ring-[#006A6E]/50 focus:!ring-offset-2" })}>
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  <BookOpen className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  Explore Reader Experience
                </span>
              </Link>
            </div>

            {/* Credibility — slate-800 on light bg ≈ 12:1 ✓ */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Built For:</span>
              <span className="text-sm font-semibold text-slate-800">Universities</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-sm font-semibold text-slate-800">Colleges</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-sm font-semibold text-slate-800">Coaching Institutes</span>
            </div>
          </div>

          {/* Right Side: Composed UI Mockup (Pure CSS) */}
          <div className="relative animate-landing-fade-in lg:ml-10">
            <div className="w-full aspect-[4/3] rounded-2xl bg-white/50 backdrop-blur-xl border border-white/70 shadow-[0_20px_60px_rgba(13,27,110,0.12)] flex flex-col overflow-hidden relative z-10 group">
              
              {/* App Header */}
              <div className="h-10 border-b border-slate-200/60 bg-white/50 flex items-center px-4 justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
                </div>
                <div className="text-[10px] uppercase tracking-widest text-slate-600 font-bold bg-white/60 px-3 py-1 rounded-full border border-slate-200/50">
                  Book Buddy Reader
                </div>
              </div>

              {/* Reader Split View */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Book Text */}
                <div className="flex-1 bg-[#FAFAFA] p-6 relative">
                  <h3 className="font-serif text-2xl text-slate-800 mb-4 border-b border-slate-200 pb-2">Chapter 4: Neural Networks</h3>
                  <div className="space-y-3">
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-11/12" />
                    <div className="h-3 bg-[#FDE68A] rounded w-full group-hover:bg-[#FCD34D] transition-colors" />
                    <div className="h-3 bg-slate-200 rounded w-4/5" />
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-[90%]" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                  </div>
                  
                  {/* Hover Selection Toolbar */}
                  <div className="absolute top-[120px] left-[50%] -translate-x-1/2 bg-slate-900 text-white text-[10px] flex items-center shadow-lg rounded-md overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="px-3 py-1.5 border-r border-slate-700 hover:bg-slate-800 cursor-pointer">Highlight</div>
                    <div className="px-3 py-1.5 flex items-center gap-1 hover:bg-slate-800 cursor-pointer"><Bot className="w-3 h-3 text-[#FCD34D]"/> Ask Varta</div>
                  </div>
                </div>

                {/* Right: Varta Chat Panel */}
                <div className="w-1/3 bg-slate-50 border-l border-slate-200 flex flex-col">
                  <div className="p-3 border-b border-slate-200 bg-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#006A6E]" />
                    <span className="text-xs font-bold text-slate-800">Varta</span>
                  </div>
                  <div className="flex-1 p-3 flex flex-col gap-3">
                    <div className="self-end bg-[#006A6E] text-white text-[9px] p-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%]">
                      Explain backpropagation in simple terms.
                    </div>
                    <div className="self-start bg-white border border-slate-200 text-slate-700 text-[9px] p-2 rounded-lg rounded-tl-none shadow-sm max-w-[95%]">
                      Backpropagation is how the network learns from its mistakes. <br/><br/>
                      <span className="text-[#B45309] font-semibold">↳ Source: Page 142, Para 3</span>
                    </div>
                  </div>
                  <div className="p-2 border-t border-slate-200 bg-white">
                    <div className="h-6 bg-slate-100 rounded-full border border-slate-200 flex items-center px-3">
                      <span className="text-[9px] text-slate-500">Ask the book a question...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Tags — 3 tags surfacing formats */}
            <div className="absolute -left-6 top-[20%] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-xl py-2 px-4 z-20 flex items-center gap-2 animate-landing-bounce animate-delay-100 border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-[#E91E8C]" />
              <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">EPUB</span>
            </div>
            <div className="absolute -right-6 top-[40%] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-xl py-2 px-4 z-20 flex items-center gap-2 animate-landing-bounce animate-delay-200 border border-slate-100">
              <div className="w-2 h-2 rounded-full bg-[#FF6B35]" />
              <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">PDF + Citations</span>
            </div>
            <div className="absolute -left-4 bottom-[20%] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-xl py-2 px-4 z-20 flex items-center gap-2 animate-landing-bounce animate-delay-300 border border-slate-100">
              <Headphones className="w-3 h-3 text-[#006A6E]" />
              <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">Audiobook</span>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="flex justify-center mt-12 lg:mt-24">
          <ChevronDown className="h-8 w-8 text-[#B45309]/50 animate-landing-bounce" />
        </div>
      </div>
    </section>
  )
}
