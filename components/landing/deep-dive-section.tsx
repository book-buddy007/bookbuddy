import { Icon, type BBIconName } from "@/components/ui/icon"
import { Chip } from "@/components/ui/chip"
import { Progress } from "@/components/ui/progress"
import { CitationChip, VartaMessage } from "@/components/ui/varta"
import { StatCard } from "@/components/ui/stat-card"
import { Container, Accent } from "@/components/landing/section"

type Point = { icon: BBIconName; title: string; desc: string }

function Points({ items }: { items: Point[] }) {
  return (
    <ul className="space-y-5">
      {items.map((p) => (
        <li key={p.title} className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bb-surface shadow-e1">
            <Icon name={p.icon} size={22} />
          </span>
          <div>
            <h4 className="font-semibold">{p.title}</h4>
            <p className="text-sm leading-relaxed text-bb-muted">{p.desc}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

const STUDENT: Point[] = [
  { icon: "highlight", title: "Distraction-free Reading", desc: "Clean interface exactly respecting publisher layouts." },
  { icon: "varta", title: "Chat with Varta", desc: "Select a paragraph and ask Varta for an instant, citation-backed explanation." },
  { icon: "sanchika", title: "Sanchika Smart Notebook", desc: "All your highlights, flashcards, and AI explanations collected in one evolving archive." },
  { icon: "audiobook", title: "Listen with Text-to-Speech", desc: "Natural voice narration for every book. Listen on the bus, study at the desk." },
]

const ADMIN: Point[] = [
  { icon: "class", title: "Assign Books to Batches", desc: "Instantly distribute required reading to specific semesters." },
  { icon: "overdue", title: "Struggling Chapter Heatmaps", desc: "Identify the exact pages where students spend the most time." },
  { icon: "analytics", title: "Track Varta Question Volume", desc: "See what topics are so confusing they require the Varta engine." },
]

/** Student and teacher/admin stories, each with a small live-looking illustration built from the real primitives. */
export function DeepDiveSection() {
  return (
    <section className="bg-bb-bg py-24 lg:py-28">
      <Container className="space-y-28">
        {/* Student */}
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <Chip className="mb-6">Student Experience</Chip>
            <h2 className="mb-6 font-display text-[clamp(32px,4.2vw,48px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              A distraction-free reader that <Accent>teaches back.</Accent>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-bb-muted">
              Why leave the textbook to search for answers? With Book Buddy, the book itself becomes the tutor. Highlight, listen, and chat directly with the context of the page.
            </p>
            <Points items={STUDENT} />
          </div>
          <div className="order-1 lg:order-2">
            <div className="space-y-5 rounded-[28px] bg-bb-surface p-6 shadow-e1 sm:p-8">
              <div data-reader="paper" className="rounded-2xl p-5" style={{ background: "var(--rd-bg)", color: "var(--rd-ink)" }}>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">Chapter 7</p>
                <h3 className="mt-1 font-reading text-[26px] font-medium tracking-[-0.015em]">Heat &amp; Thermodynamics</h3>
                <p className="mt-3 font-reading text-[17px] leading-[1.7]">
                  Heat flows from a body at higher temperature to one at lower temperature.{" "}
                  <mark className="rounded px-0.5 [background:var(--rd-hl)] [color:inherit]">The specific heat capacity of water is 4186 J/kg·K</mark>, making it an excellent thermal buffer.
                </p>
              </div>
              <VartaMessage role="user">Why is water&apos;s specific heat so high?</VartaMessage>
              <VartaMessage citations={<><CitationChip label="p. 142 · ¶2" active /><span className="self-center text-[13px] text-bb-muted">saved to Sanchika</span></>}>
                Hydrogen bonding between molecules — breaking those bonds absorbs a lot of energy.
              </VartaMessage>
              <div className="flex items-center gap-3 rounded-2xl bg-bb-bg p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bb-primary text-white shadow-gloss"><Icon name="play" size={18} fillLayer={false} /></span>
                <Progress value={35} className="flex-1" />
                <span className="text-xs tabular-nums text-bb-muted">2:34 / 8:12</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher & admin */}
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="rounded-[28px] bg-bb-surface p-6 shadow-e1 sm:p-8">
            <div className="mb-5 grid grid-cols-2 gap-4">
              <StatCard variant="featured" icon="class" title="Active readers" value="842" />
              <StatCard icon="chat" title="Varta questions" value="3,208" trend="up" trendValue="18%" />
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-bb-faint">Time spent per chapter</p>
            <div className="space-y-3">
              {[["Ch 7 · Heat", 92], ["Ch 4 · Motion", 64], ["Ch 2 · Units", 38]].map(([label, v]) => (
                <div key={label as string}>
                  <div className="mb-1 flex justify-between text-[13px]"><span className="font-medium">{label}</span><span className="text-bb-muted">{v}%</span></div>
                  <Progress value={v as number} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Chip className="mb-6">Teacher &amp; Admin Experience</Chip>
            <h2 className="mb-6 font-display text-[clamp(32px,4.2vw,48px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              See what they read. <br /><Accent>Know what they skip.</Accent>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-bb-muted">
              Equip your faculty with X-ray vision. Understand class engagement, track assignment completion, and see precisely which chapters trigger the most AI questions.
            </p>
            <Points items={ADMIN} />
          </div>
        </div>
      </Container>
    </section>
  )
}
