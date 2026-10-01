import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { ReadingModesSection } from "@/components/landing/reading-modes-section"
import { StatsBand } from "@/components/landing/stats-band"
import { DeepDiveSection } from "@/components/landing/deep-dive-section"
import { VartaDeepDiveSection } from "@/components/landing/varta-deepdive-section"
import { PdfStudioSection } from "@/components/landing/pdf-studio-section"
import { SecureBharatSection } from "@/components/landing/secure-bharat-section"
import { TestimonialAndFAQSection } from "@/components/landing/testimonial-and-faq"
import { CTAFooterSection } from "@/components/landing/cta-footer-section"

// Landing page. Server-rendered shell; only the hero scene, nav menu, counters,
// testimonial carousel and FAQ accordion are client components.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-bb-bg">
      {/* 1. Hero: headline + CTAs + 3D book → headphones scene */}
      <HeroSection />

      {/* 2. Platform capabilities (6) */}
      <FeaturesSection />

      {/* 3. Four reading modes */}
      <ReadingModesSection />

      {/* 4. Capability stats + founding-cohort banner */}
      <StatsBand />

      {/* 5. Student and teacher/admin experience */}
      <DeepDiveSection />

      {/* 6. Varta — the grounded, citation-backed differentiator */}
      <VartaDeepDiveSection />

      {/* 7. PDF Studio — in-browser annotation suite */}
      <PdfStudioSection />

      {/* 8. Secure for Bharat — multi-tenant enterprise architecture */}
      <SecureBharatSection />

      {/* 9. Testimonials + FAQ */}
      <TestimonialAndFAQSection />

      {/* 10. Closing CTA + footer */}
      <CTAFooterSection />
    </main>
  )
}
