import { ShieldCheck, Building2, Users, KeyRound, Lock, Network, FileCheck2 } from "lucide-react"

/**
 * "Secure for Bharat" — deepens the enterprise story with the real multi-tenant
 * architecture: per-institution data isolation, branch hierarchy, role-based access,
 * and SSO. Indigo/teal Indic palette on a dark parchment-night band for contrast
 * against the lighter sections around it.
 */

const PILLARS = [
  { icon: Building2, title: "Multi-tenant isolation", desc: "Every institution's data lives in its own logical boundary. One breach can never cross tenants." },
  { icon: Network, title: "Branch hierarchy", desc: "Model campuses, branches, and departments — assign books and seats per branch." },
  { icon: KeyRound, title: "Role-based access", desc: "Granular roles for admins, faculty, librarians, and students. Least-privilege by default." },
  { icon: Lock, title: "SSO ready", desc: "Single sign-on so students use one institutional identity across the campus stack." },
]

export function SecureBharatSection() {
  return (
    <section id="security" className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0D1B6E 0%,#1A237E 50%,#004D40 100%)" }}>
      {/* mandala watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.06] pointer-events-none">
        <svg viewBox="0 0 400 400" className="w-full h-full animate-landing-spin" style={{ animationDuration: "60s" }}>
          <circle cx="200" cy="200" r="180" fill="none" stroke="#FFD700" strokeWidth="1" />
          <circle cx="200" cy="200" r="140" fill="none" stroke="#FF9933" strokeWidth="1" />
          {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => (
            <path key={deg} d="M200,30 Q220,70 200,110 Q180,70 200,30Z" fill="none" stroke="#FFD700" strokeWidth="0.8" transform={`rotate(${deg} 200 200)`} />
          ))}
        </svg>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16 animate-landing-fade-in-up">
          <span
            className="inline-flex items-center gap-2 text-[#FCD34D] font-bold text-lg uppercase tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <ShieldCheck className="w-5 h-5" /> Secure for Bharat
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4 text-white font-serif">
            Enterprise-grade. <span className="text-[#FCD34D]">Built for institutions.</span>
          </h2>
          <p className="text-xl text-white/75 max-w-2xl mx-auto font-medium">
            From a single coaching centre to a multi-campus university — the same architecture
            scales without ever mixing one institution&apos;s data with another&apos;s.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((p, i) => (
            <div
              key={i}
              className="group relative rounded-2xl p-6 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:-translate-y-2 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br from-[#FF9933] to-[#B45309] shadow-lg group-hover:scale-110 transition-transform duration-300">
                <p.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 font-serif">{p.title}</h3>
              <p className="text-sm text-white/65 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* trust strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {[
            { icon: Users, text: "Per-institution roles" },
            { icon: FileCheck2, text: "DPDP-ready data handling" },
            { icon: Lock, text: "Encrypted at rest & in transit" },
            { icon: ShieldCheck, text: "Audit-logged access" },
          ].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 text-sm font-semibold text-white/80">
              <t.icon className="w-4 h-4 text-[#FCD34D]" />
              {t.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
