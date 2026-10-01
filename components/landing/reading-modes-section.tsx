import { Icon, type BBIconName } from "@/components/ui/icon"
import { Container, SectionHeading, Accent } from "@/components/landing/section"
import { cn } from "@/lib/utils"

const MODES: { icon: BBIconName; title: string; body: string; featured?: boolean }[] = [
  { icon: "read", title: "EPUB", body: "Responsive, reflowable text with font size and sepia controls." },
  { icon: "pdf", title: "PDF", body: "Pixel-perfect layout — exactly as the publisher printed it." },
  { icon: "audiobook", title: "Audiobook", body: "Natural-voice narration with speed control and a sleep timer." },
  { icon: "varta", title: "Varta", body: "Ask the book a question. Answers cite the page and paragraph.", featured: true },
]

/** Four cards, one book. The navy one is Varta; hover tilts the card in 3D on pointer devices. */
export function ReadingModesSection() {
  return (
    <section id="reading-modes" className="bg-bb-bg pb-24 lg:pb-28">
      <Container className="flex flex-col gap-12">
        <div className="grid items-end gap-8 lg:grid-cols-2 lg:gap-12">
          <SectionHeading title={<>Four ways to read <Accent>one book</Accent></>} />
          <p className="max-w-xl text-lg leading-relaxed text-bb-muted [text-wrap:pretty]">
            Upload once. Every title instantly becomes a reflowable EPUB, a page-accurate PDF, a natural-voice audiobook, and an AI you can talk to.
          </p>
        </div>
        <div className="grid gap-5 [perspective:1200px] sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((m) => (
            <article
              key={m.title}
              className={cn(
                "bb-lift flex min-h-[250px] flex-col gap-4 rounded-bb-lg p-7",
                m.featured ? "bg-bb-navy text-white shadow-[var(--bb-shadow-navy)]" : "bg-bb-surface text-bb-text shadow-e1"
              )}
            >
              <Icon name={m.icon} size={44} className={m.featured ? "text-white" : undefined} />
              <h3 className="font-display text-[28px] font-extrabold tracking-[-0.03em]">{m.title}</h3>
              <p className={cn("text-base leading-relaxed", m.featured ? "text-bb-dim-2" : "text-bb-muted")}>{m.body}</p>
            </article>
          ))}
        </div>
        <p className="text-[15px] text-bb-muted">Switch modes anytime — your highlights, bookmarks, and progress sync across all four.</p>
      </Container>
    </section>
  )
}
