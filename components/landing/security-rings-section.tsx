"use client"

import { Icon, type BBIconName } from "@/components/ui/icon"
import { useReducedMotion, useSeen } from "@/components/landing/use-landing"

const POINTS: [BBIconName, string, string][] = [
  ["tenant", "Multi-tenant isolation", "Each institution's data sits in its own logical boundary."],
  ["share", "Branch hierarchy", "Campuses, branches and departments, with seats and books per branch."],
  ["key", "Role-based access", "Admins, librarians, teachers, students. Least privilege by default."],
  ["lock", "SSO ready, audit-logged", "One campus identity; every access recorded."],
]

const ring = "absolute rounded-full"
const ease = "cubic-bezier(.2,.8,.2,1)"

/** "Secure for Bharat": concentric tenant rings that scale in once, with a slow orbit around them. */
export function SecurityRingsSection() {
  const reduced = useReducedMotion()
  const [ref, seen] = useSeen<HTMLDivElement>(0.2)
  const show = seen || reduced
  const scale = (k: number) => (show ? "scale(1)" : `scale(${0.5 + k * 0.1})`)
  const t = (css: string) => (reduced ? "none" : css)

  return (
    <section id="security" className="overflow-hidden bg-[#0A0F24] py-[120px] text-[#F2F4F8]">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] items-center gap-16 px-[clamp(20px,4vw,56px)]">
        <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[500px]" role="img" aria-label="Concentric rings: institution, branch, class and student, each inside its own boundary">
          <div className={`${ring} inset-0 border border-[#2A3556] bg-[radial-gradient(circle,rgba(59,91,219,.10),transparent_70%)]`} style={{ transform: scale(4), transition: t(`transform 1s ${ease}`) }} />
          <div className={`${ring} inset-[13%] border border-[#34426E]`} style={{ transform: scale(3), transition: t(`transform 1s ${ease} .12s`) }} />
          <div className={`${ring} inset-[26%] border border-[#3B4C80] bg-[rgba(59,91,219,.08)]`} style={{ transform: scale(2), transition: t(`transform 1s ${ease} .24s`) }} />
          <div
            aria-hidden
            className={`${ring} inset-[6.5%] border border-dashed border-[rgba(255,179,122,.35)]`}
            style={{ animation: reduced ? undefined : "bbspin 40s linear infinite" }}
          >
            <span className="absolute -top-1.5 left-1/2 -ml-1.5 h-3 w-3 rounded-full bg-[#FFB37A] shadow-[0_0_16px_#FF4D00]" />
            <span className="absolute -bottom-[5px] left-1/2 -ml-[5px] h-2.5 w-2.5 rounded-full bg-[#7D97FF] shadow-[0_0_14px_#3B5BDB]" />
          </div>
          <div
            className={`${ring} inset-[38%] flex items-center justify-center bg-bb-primary text-white shadow-[inset_0_2px_0_rgba(255,255,255,.6),0_0_60px_rgba(255,77,0,.5)]`}
            style={{ transform: scale(1), transition: t("transform 1s cubic-bezier(.3,1.4,.5,1) .36s") }}
          >
            <Icon name="lock" size={40} tone="onfill" />
          </div>
          <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#2A3556] bg-[#121A33] px-3 py-[5px] text-xs font-bold">Institution</span>
          <span className="absolute left-1/2 top-[13%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#34426E] bg-[#121A33] px-3 py-[5px] text-xs font-bold">Branch</span>
          <span className="absolute left-1/2 top-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3B4C80] bg-[#121A33] px-3 py-[5px] text-xs font-bold">Class</span>
          <span className="absolute bottom-[26%] left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#FF4D00] px-3 py-[5px] text-xs font-bold text-white">Student</span>
        </div>

        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-4">
            <span className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-[0.14em] text-[#FFB37A]">
              <Icon name="shield-check" size={18} /> Secure for Bharat
            </span>
            <h2 className="font-display text-[clamp(36px,4.6vw,58px)] font-extrabold leading-[0.98] tracking-[-0.04em] [text-wrap:balance]">
              Rings that never touch another tenant.
            </h2>
            <p className="max-w-[520px] text-lg text-[#C5CCDA]">
              From one coaching centre to a multi-campus university, every institution lives inside its own boundary.
            </p>
          </div>
          <ul className="flex flex-col">
            {POINTS.map(([icon, h, d], i) => (
              <li key={h} className={`grid grid-cols-[36px_minmax(0,1fr)] gap-4 border-t border-[#2A3556] py-[18px] ${i === POINTS.length - 1 ? "border-b" : ""}`}>
                <Icon name={icon} size={26} />
                <div>
                  <div className="text-lg font-bold">{h}</div>
                  <div className="text-[#A9B4D0]">{d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
