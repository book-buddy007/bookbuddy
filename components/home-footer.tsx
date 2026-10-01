import Link from "next/link"
import { GraduationCap, Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from "@/components/ui/icons"

export function HomeFooter() {
  return (
    <footer className="bg-[var(--night-ink)] text-[var(--ivory-cream)] py-12 border-t border-[var(--gold)]/10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] shadow-lg shadow-[var(--saffron)]/20">
                <GraduationCap className="h-6 w-6 text-white drop-shadow-md" />
              </div>
              <span className="gradient-text-indic font-extrabold">Book Buddy</span>
            </Link>
            <p className="text-sm text-[var(--ivory-cream)]/50 leading-relaxed">
              Your campus library, reimagined for the digital age. Empowering students and institutions across India.
            </p>

            {/* Social Icons */}
            <div className="flex gap-3 mt-4">
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-[var(--ivory-cream)]/5 border border-[var(--gold)]/10 hover:bg-gradient-to-r hover:from-[var(--deep-saffron)] hover:to-[var(--saffron)] flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-[var(--saffron)]/20"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-[var(--ivory-cream)]/5 border border-[var(--gold)]/10 hover:bg-gradient-to-r hover:from-[var(--deep-saffron)] hover:to-[var(--saffron)] flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-[var(--saffron)]/20"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-[var(--ivory-cream)]/5 border border-[var(--gold)]/10 hover:bg-gradient-to-r hover:from-[var(--deep-saffron)] hover:to-[var(--saffron)] flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-[var(--saffron)]/20"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div>
            {/* /about, /features, /pricing and /blog were linked here and none
                of them exist — four 404s on the public landing page. Replaced
                with destinations that do. Restore each link at the moment its
                page ships, not before. */}
            <h3 className="text-sm font-semibold mb-3 text-[var(--gold)]">Quick Links</h3>
            <ul className="space-y-2 text-sm text-[var(--ivory-cream)]/50">
              <li>
                <Link href="/catalog" className="hover:text-[var(--gold)] transition-colors duration-300">
                  Browse the Library
                </Link>
              </li>
              <li>
                <Link href="/subscription/compare" className="hover:text-[var(--gold)] transition-colors duration-300">
                  Compare Plans
                </Link>
              </li>
              <li>
                <Link href="/institutions/browse" className="hover:text-[var(--gold)] transition-colors duration-300">
                  For Institutions
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[var(--gold)] transition-colors duration-300">
                  Create an Account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-[var(--gold)]">Contact</h3>
            <ul className="space-y-3 text-sm text-[var(--ivory-cream)]/50">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[var(--saffron)]" />
                <a href="mailto:support@bookbuddyvpd.com" className="hover:text-[var(--gold)] transition-colors duration-300">
                  support@bookbuddyvpd.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[var(--saffron)]" />
                <a href="tel:+919310959596" className="hover:text-[var(--gold)] transition-colors duration-300">
                  +91 93109 59596
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[var(--saffron)] mt-1 shrink-0" />
                <span className="leading-tight">
                  Vinstitution, 2nd Floor, Property No. 44, Regal Building,
                  Connaught Place, New Delhi — 110090
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-[var(--gold)]">Newsletter</h3>
            <p className="text-sm text-[var(--ivory-cream)]/50 mb-4">
              Subscribe to get updates on new features and releases.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 w-full px-3 py-2 rounded-lg bg-[var(--ivory-cream)]/5 border border-[var(--gold)]/15 text-sm text-[var(--ivory-cream)] placeholder-[var(--ivory-cream)]/30 focus:outline-none focus:ring-2 focus:ring-[var(--saffron)]/50 transition-all duration-300"
              />
              <button className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] text-white text-sm font-bold hover:shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[var(--saffron)]/30">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Brand badge */}
        <div className="border-t border-[var(--gold)]/10 mt-8 pt-8 flex justify-center">
          <a
            href="https://vgraphics.in"
            className="group inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--ivory-cream)]/5 border border-[var(--gold)]/15 hover:border-[var(--gold)]/40 transition-colors duration-300"
          >
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)]" />
            <span className="text-xs font-semibold text-[var(--ivory-cream)]/60 group-hover:text-[var(--gold)] transition-colors">
              <span className="gradient-text-indic font-bold">Book Buddy</span> by VPD — your digital library, reader &amp; study companion
            </span>
          </a>
        </div>

        <div className="mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[var(--ivory-cream)]/40">
            <p className="text-center md:text-left leading-relaxed">
              Book Buddy is a brand of the Vinstitution segment of VPD Vastus Ventures
              Private Limited.
            </p>
            <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-3 text-center">
              <Link href="/privacy" className="hover:text-[var(--gold)] transition-colors duration-300">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-[var(--gold)] transition-colors duration-300">
                Terms of Service
              </Link>
              <Link href="/cookies" className="hover:text-[var(--gold)] transition-colors duration-300">
                Cookie Policy
              </Link>
            </div>
          </div>

          {/* Legal identifiers + copyright */}
          <div className="border-t border-[var(--gold)]/10 mt-6 pt-6 flex flex-col items-center gap-1.5 text-center text-xs text-[var(--ivory-cream)]/35">
            <p>PAN: AAMCV2938B &middot; GSTIN: 07AAMCV2938B1ZA &middot; ISO 9001:2015 Certified</p>
            <p>
              &copy; {new Date().getFullYear()} VPD Vastus Ventures Pvt. Ltd. All rights reserved.
              &middot; Proudly powered by Vinstitution &middot; Designed by{' '}
              <a href="https://vgraphics.in" className="hover:text-[var(--gold)] transition-colors duration-300">
                VGraphics.in
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
