import { Icon, type BBIconName } from "@/components/ui/icon"
import { CitationChip, VartaMessage } from "@/components/ui/varta"
import { Container } from "@/components/landing/section"

const CAPABILITIES: { icon: BBIconName; title: string; desc: string }[] = [
  { icon: "quote", title: "Paragraph-level citations", desc: "Every claim links back to the exact page and paragraph in the source book." },
  { icon: "layers", title: "Instant flashcards", desc: "Turn any explanation into spaced-repetition cards in one tap." },
  { icon: "assignment", title: "Practice questions", desc: "Generate exam-style questions from the chapter you're reading." },
  { icon: "sanchika", title: "Saved to Sanchika", desc: "Highlights, answers, and cards collect in one evolving study archive." },
]

/** Varta spotlight: the citation-backed answer block plus what it can do. */
export function VartaDeepDiveSection() {
  return (
    <section id="varta" className="bg-bb-bg pb-24 lg:pb-28">
      <Container>
        <div className="grid items-center gap-14 rounded-[28px] bg-bb-surface p-8 shadow-e0 sm:p-14 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-bb-accent-soft px-3.5 py-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-bb-accent-ink">
              <Icon name="varta" size={16} /> Varta AI
            </span>
            <h2 className="font-display text-[clamp(32px,4.5vw,48px)] font-extrabold leading-none tracking-[-0.035em] [text-wrap:balance]">
              Answers with strict textbook citations
            </h2>
            <p className="text-lg leading-relaxed text-bb-muted [text-wrap:pretty]">
              Most AI guesses. Varta reads <em>your</em> textbook and answers only from it — with a citation you can verify on the page.
            </p>
            <ul className="mt-2 space-y-4">
              {CAPABILITIES.map((c) => (
                <li key={c.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bb-bg">
                    <Icon name={c.icon} size={22} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{c.title}</h3>
                    <p className="text-sm leading-relaxed text-bb-muted">{c.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 inline-flex items-center gap-2 self-start rounded-full bg-bb-info-soft px-4 py-2.5 text-sm font-semibold text-bb-info-ink">
              <Icon name="admin" size={16} /> No hallucinations — if it isn&apos;t in the book, Varta says so.
            </p>
          </div>
          <div className="flex flex-col gap-3.5 rounded-bb-lg bg-bb-bg p-7">
            <VartaMessage role="user">Why is water&apos;s specific heat so high?</VartaMessage>
            <VartaMessage
              citations={
                <>
                  <CitationChip label="p. 142, ¶2" active />
                  <span className="self-center text-[13px] text-bb-muted">cited from your textbook</span>
                </>
              }
            >
              Water&apos;s high specific heat (4186 J/kg·K) comes from hydrogen bonding between molecules — breaking those bonds absorbs large amounts of energy.
            </VartaMessage>
          </div>
        </div>
      </Container>
    </section>
  )
}
