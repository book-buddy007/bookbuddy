import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HomeFooter } from "@/components/home-footer"
import { Container } from "@/components/landing/section"

/** Closing CTA band (navy) followed by the footer. */
export function CTAFooterSection() {
  return (
    <>
      <section className="bg-bb-ink text-white">
        <Container className="flex flex-wrap items-center justify-between gap-10 py-24">
          <div className="max-w-2xl">
            <h2 className="font-display text-[clamp(38px,4.5vw,56px)] font-extrabold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">
              Built for Universities, Colleges and Coaching Institutes
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-bb-dim-2">
              Book a live demo to see how <strong className="text-white">Varta</strong> and our multi-tenant architecture can transform your campus reading experience.
            </p>
          </div>
          <div className="flex flex-col gap-3.5 sm:flex-row">
            <Button asChild size="lg" className="h-[58px] px-[30px] text-[17px]">
              <Link href="/register">Book a Demo</Link>
            </Button>
            {/* Mailto until a contact page ships; the same address the footer publishes. */}
            <Button asChild size="lg" variant="outline" className="h-[58px] border-bb-night-line-2 px-[30px] text-[17px] text-white hover:bg-white/10">
              <a href="mailto:support@bookbuddyvpd.com?subject=Talk%20to%20the%20product%20team">Talk to Product Team</a>
            </Button>
          </div>
        </Container>
      </section>
      <HomeFooter />
    </>
  )
}
