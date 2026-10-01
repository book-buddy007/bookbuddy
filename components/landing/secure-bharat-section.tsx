import { Icon, type BBIconName } from "@/components/ui/icon"
import { Container } from "@/components/landing/section"

/**
 * "Secure for Bharat" — the real multi-tenant architecture: per-institution data isolation,
 * branch hierarchy, role-based access, and SSO. A navy band for contrast with the light
 * sections around it.
 */
const PILLARS: { icon: BBIconName; title: string; desc: string }[] = [
  { icon: "institution", title: "Multi-tenant isolation", desc: "Every institution's data lives in its own logical boundary. One breach can never cross tenants." },
  { icon: "share", title: "Branch hierarchy", desc: "Model campuses, branches, and departments — assign books and seats per branch." },
  { icon: "key", title: "Role-based access", desc: "Granular roles for admins, faculty, librarians, and students. Least-privilege by default." },
  { icon: "lock", title: "SSO ready", desc: "Single sign-on so students use one institutional identity across the campus stack." },
]

const TRUST: { icon: BBIconName; text: string }[] = [
  { icon: "class", text: "Per-institution roles" },
  { icon: "pdf", text: "DPDP-ready data handling" },
  { icon: "lock", text: "Encrypted at rest & in transit" },
  { icon: "shield-check", text: "Audit-logged access" },
]

export function SecureBharatSection() {
  return (
    <section id="security" className="bg-bb-navy py-24 text-white lg:py-28">
      <Container>
        <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-4 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-bb-peach">
            <Icon name="admin" size={18} className="text-white" /> Secure for Bharat
          </p>
          <h2 className="font-display text-[clamp(34px,5vw,56px)] font-extrabold leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">
            Enterprise-grade. <span className="text-bb-peach">Built for institutions.</span>
          </h2>
          <p className="text-lg leading-relaxed text-bb-dim-2">
            From a single coaching centre to a multi-campus university — the same architecture scales without ever mixing one institution&apos;s data with another&apos;s.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <article key={p.title} className="rounded-[22px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Icon name={p.icon} size={24} className="text-white" />
              </span>
              <h3 className="mb-2 font-display text-xl font-extrabold tracking-[-0.02em]">{p.title}</h3>
              <p className="text-sm leading-relaxed text-bb-dim-2">{p.desc}</p>
            </article>
          ))}
        </div>
        <ul className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {TRUST.map((t) => (
            <li key={t.text} className="inline-flex items-center gap-2 text-sm font-semibold text-bb-dim-2">
              <Icon name={t.icon} size={18} className="text-white" /> {t.text}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
