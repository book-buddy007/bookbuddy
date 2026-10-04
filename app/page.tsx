import { LandingNav } from "@/components/landing/landing-nav"
import { HeroSection } from "@/components/landing/hero-section"
import { DayTimelineSection } from "@/components/landing/day-timeline-section"
import { ControlRoomSection } from "@/components/landing/control-room-section"
import { SecurityRingsSection } from "@/components/landing/security-rings-section"
import { StatsCountSection } from "@/components/landing/stats-count-section"
import { TestimonialsFaqSection } from "@/components/landing/testimonials-faq-section"
import { CTAFooterSection } from "@/components/landing/cta-footer-section"

// Landing page (UI v3). The 3D hero is unchanged; everything below it follows the approved
// "Landing A" design. Server-rendered shell; the nav, hero scene and the scroll/in-view sections
// are client components.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-bb-bg">
      <LandingNav />
      <main id="top" className="flex flex-col">
        {/* Hero: headline + CTAs + 3D book → headphones scene */}
        <HeroSection />

        {/* 1. A day with Book Buddy: scroll-driven timeline, six stops */}
        <DayTimelineSection />

        {/* 2. Teacher / admin control room */}
        <ControlRoomSection />

        {/* 3. Security rings */}
        <SecurityRingsSection />

        {/* 4. Count-up stats */}
        <StatsCountSection />

        {/* 5. Testimonials + FAQ */}
        <TestimonialsFaqSection />
      </main>

      {/* 6. Closing CTA + footer */}
      <CTAFooterSection />
    </div>
  )
}
