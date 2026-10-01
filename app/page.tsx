"use client"

import { useState, useEffect } from "react"
import { HomeNavbar } from "@/components/home-navbar"
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
import { ChakraDivider } from "@/components/landing/chakra-divider"
import styles from "./home.module.css"

export default function Home() {
  const [scrolled, setScrolled] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className={`flex flex-col min-h-screen ${styles.homepageWrapper}`}>
      <HomeNavbar />

      {/* 1. Hero (Left Copy + Right Reader Mockup) */}
      <HeroSection scrolled={scrolled} />

      {/* 2. Core Pillars (6 capabilities) */}
      <FeaturesSection />

      {/* 3. Four Reading Modes — interactive format switcher */}
      <ReadingModesSection />

      <ChakraDivider />

      {/* 4. Capability stats + founding-cohort banner */}
      <StatsBand />

      {/* 5. Deep Dives (Student Experience + Admin Experience) */}
      <DeepDiveSection />

      {/* 6. Varta — the grounded, citation-backed differentiator */}
      <VartaDeepDiveSection />

      {/* 7. PDF Studio — in-browser annotation suite */}
      <PdfStudioSection />

      {/* 8. Secure for Bharat — multi-tenant enterprise architecture */}
      <SecureBharatSection />

      {/* 9. Validation (Testimonials + FAQ) */}
      <TestimonialAndFAQSection />

      {/* 10. Footer & Registration (+ ecosystem badge) */}
      <CTAFooterSection />
    </div>
  )
}
