import Link from "next/link"
import { Rocket, PhoneCall } from "lucide-react"
import { getLoadingButtonClasses } from "@/components/landing/loading-button"
import { SunMandalaSVG } from "@/components/landing/mandala-svgs"
import { HomeFooter } from "@/components/home-footer"

export function CTAFooterSection() {
  return (
    <>
      <section className="py-32 relative overflow-hidden bg-indic-cta">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 petal-glow" />
          <div className="absolute bottom-10 right-10 w-96 h-96 petal-glow" style={{ animationDelay: '3s' }} />
        </div>

        {/* Large Sun Mandala Watermark Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10 pointer-events-none flex items-center justify-center">
          <SunMandalaSVG className="w-full h-full text-[#B45309] animate-landing-bounce" />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-landing-fade-in-up text-slate-900 drop-shadow-sm font-serif">
              Bring an AI-Powered Library to Your <span className="gradient-text-indic-soft">Institution</span>
            </h2>
            <p className="text-xl mb-12 text-slate-700 animate-landing-fade-in-up leading-relaxed drop-shadow-sm font-medium">
              Join leading schools and universities. Book a live demo to see how <strong className="text-[#006A6E]">Varta</strong> and our multi-tenant architecture can transform your campus reading experience today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-landing-scale-in">
              {/* Primary CTA — #B45309 with white text = 5.2:1 ✓ */}
              <Link
                href="/register"
                className={getLoadingButtonClasses({ variant: "primary", size: "xl", className: "w-full sm:w-auto group !bg-[#B45309] hover:!bg-[#92400E] !text-white !shadow-[0_8px_30px_rgba(180,83,9,0.25)] hover:!shadow-[0_20px_60px_rgba(180,83,9,0.4)] !border-transparent transition-all duration-300 min-h-[48px] focus:!ring-2 focus:!ring-[#B45309]/50 focus:!ring-offset-2" })}>
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  <Rocket className="h-6 w-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
                  Book a Live Demo
                </span>
              </Link>
              {/* Secondary CTA — #006A6E border+text on light bg = 5.4:1 ✓ */}
              {/* Was href="/contact", which does not exist — a 404 on the
                  landing page's secondary CTA. Mailto until a contact page
                  ships; the same address the footer already publishes. */}
              <a
                href="mailto:support@bookbuddyvpd.com?subject=Talk%20to%20the%20product%20team"
                className={getLoadingButtonClasses({ variant: "outline", size: "xl", className: "w-full sm:w-auto group !border-2 !border-[#006A6E]/50 !text-[#006A6E] hover:!bg-[#006A6E] hover:!text-white !bg-white/60 backdrop-blur-sm transition-all duration-300 min-h-[48px] focus:!ring-2 focus:!ring-[#006A6E]/50 focus:!ring-offset-2" })}>
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  <PhoneCall className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                  Talk to Product Team
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </>
  )
}
