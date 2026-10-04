import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { HomeFooter } from "@/components/home-footer"

/** Closing CTA (navy, with the floating mark) followed by the footer. */
export function CTAFooterSection() {
  return (
    <>
      <section className="relative overflow-hidden bg-[#0A0F24] py-[120px] text-[#F2F4F8]">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,77,0,.22),rgba(59,91,219,.2)_45%,transparent)]"
        />
        <div className="relative mx-auto flex max-w-[900px] flex-col items-center gap-7 px-[clamp(20px,4vw,56px)] text-center">
          <div aria-hidden className="relative h-24 w-[150px] [animation:bbfloat_6s_ease-in-out_infinite]">
            <span className="absolute left-0 top-0 h-24 w-24 rounded-full bg-[linear-gradient(160deg,#4C6FFF_0%,#1E3A8A_60%)] shadow-[inset_0_3px_0_rgba(255,255,255,.5),0_20px_50px_-10px_rgba(59,91,219,.7)]" />
            <span className="absolute left-[54px] top-0 h-24 w-24 rounded-full bg-[linear-gradient(180deg,#FF8A3D_0%,#FF4D00_52%,#D93A00_100%)] opacity-95 shadow-[inset_0_3px_0_rgba(255,255,255,.65),0_20px_50px_-10px_rgba(255,77,0,.8)]" />
          </div>
          <h2 className="font-display text-[clamp(40px,5.6vw,72px)] font-extrabold leading-[0.96] tracking-[-0.045em] [text-wrap:balance]">
            Start the semester on Book Buddy.
          </h2>
          <p className="max-w-[560px] text-[19px] text-[#C5CCDA]">Founding institutions are onboarding now. Bring your PDFs and EPUBs; we handle the rest.</p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Link
              href="/register"
              className="flex h-14 items-center gap-2.5 rounded-full bg-bb-primary px-7 text-[17px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.65),inset_0_-2px_0_rgba(120,30,0,.25),0_14px_30px_-10px_rgba(255,77,0,.75)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:shadow-focus"
            >
              Book a demo <Icon name="arrow-right" size={18} tone="onfill" />
            </Link>
            <Link
              href="/catalog"
              className="flex h-14 items-center rounded-full border border-white/20 bg-white/[.04] px-7 text-[17px] font-semibold text-[#F2F4F8] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:shadow-focus"
            >
              Explore guest library
            </Link>
          </div>
        </div>
      </section>
      <HomeFooter />
    </>
  )
}
