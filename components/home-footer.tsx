import Link from "next/link"
import { BrandLockup } from "@/components/ui/brand-mark"
import { Icon } from "@/components/ui/icon"
import { Container } from "@/components/landing/section"

const linkCls = "rounded-md transition-colors hover:text-white focus-visible:outline-none focus-visible:shadow-focus"

/** Footer on the navy band: brand, quick links, contact, newsletter, legal identifiers. */
export function HomeFooter() {
  return (
    <footer className="border-t border-bb-night-line bg-bb-ink text-bb-dim">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link href="/" aria-label="Book Buddy home" className="mb-4 inline-flex rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
              <BrandLockup size={22} onDark />
            </Link>
            <p className="text-sm leading-relaxed">
              Your campus library, reimagined for the digital age. Empowering students and institutions across India.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/catalog" className={linkCls}>Guest Library</Link></li>
              <li><Link href="/subscription/compare" className={linkCls}>Subscription Plans</Link></li>
              <li><Link href="/institutions/browse" className={linkCls}>Browse Institutions</Link></li>
              <li><Link href="/register" className={linkCls}>Create Account</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <Icon name="mail" size={18} className="shrink-0 text-white" />
                <a href="mailto:support@bookbuddyvpd.com" className={linkCls}>support@bookbuddyvpd.com</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="phone" size={18} className="shrink-0 text-white" />
                <a href="tel:+919310959596" className={linkCls}>+91 93109 59596</a>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="map-pin" size={18} className="mt-0.5 shrink-0 text-white" />
                <span className="leading-snug">Vinstitution, 2nd Floor, Property No. 44, Regal Building, Connaught Place, New Delhi — 110090</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-white">Newsletter</h3>
            <p className="mb-4 text-sm">Subscribe to get updates on new features and releases.</p>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
              <input
                type="email"
                aria-label="Your email"
                placeholder="Your email"
                className="h-11 w-full min-w-0 flex-1 rounded-full border-[1.5px] border-bb-night-line bg-white/5 px-4 text-sm text-white placeholder:text-bb-dim focus-visible:border-bb-accent focus-visible:outline-none focus-visible:shadow-focus"
              />
              <button className="h-11 rounded-full bg-bb-primary px-5 text-sm font-semibold text-white shadow-gloss focus-visible:outline-none focus-visible:shadow-focus">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-bb-night-line pt-6 text-sm md:flex-row">
          <p className="text-center md:text-left">
            Book Buddy by VPD is a brand of the Vinstitution segment of VPD Vastus Ventures Private Limited.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/privacy" className={linkCls}>Privacy Policy</Link>
            <Link href="/terms" className={linkCls}>Terms of Service</Link>
            <Link href="/cookies" className={linkCls}>Cookie Policy</Link>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-1.5 border-t border-bb-night-line pt-6 text-center text-xs">
          <p>PAN: AAMCV2938B &middot; GSTIN: 07AAMCV2938B1ZA &middot; ISO 9001:2015 Certified</p>
          <p>
            &copy; {new Date().getFullYear()} VPD Vastus Ventures Pvt. Ltd. All rights reserved. &middot; Proudly powered by Vinstitution &middot; Designed by{" "}
            <a href="https://vgraphics.in" className={linkCls}>VGraphics.in</a>
          </p>
        </div>
      </Container>
    </footer>
  )
}
