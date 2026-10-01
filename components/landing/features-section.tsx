import { Icon, type BBIconName } from "@/components/ui/icon"
import { Container, SectionHeading, Accent } from "@/components/landing/section"

const FEATURES: { icon: BBIconName; title: string; tag: string; description: string }[] = [
  {
    icon: "read",
    title: "Multi-Format Library",
    tag: "Core Reader",
    description: "One source, four modes. Students choose: responsive EPUB, page-accurate PDF, natural Text-to-Speech audiobooks, or AI-embedded chat via Varta.",
  },
  {
    icon: "varta",
    title: "Varta Study Assistant",
    tag: "Varta",
    description: "Students can chat with any textbook. Get instant explanations, generate practice questions, create flashcards, and view precise paragraph-level citations.",
  },
  {
    icon: "highlight",
    title: "Built-in PDF Studio",
    tag: "Annotation & Sync",
    description: "Drawboard-like features inside the browser. Freehand ink, smart shapes, highlights, redaction, OCR, and audio notes — all directly on your PDFs.",
  },
  {
    icon: "sanchika",
    title: "Sanchika",
    tag: "Smart Notebook",
    description: "Your evolving study archive. Sanchika automatically collects highlights, Varta explanations, and annotations across every book — revisit flashcards and notes anywhere.",
  },
  {
    icon: "analytics",
    title: "Institutional Dashboards",
    tag: "For Admins & Teachers",
    description: "Detailed usage analytics. Track most-read books, identify struggling chapters across batches, and monitor overall AI usage statistics.",
  },
  {
    icon: "admin",
    title: "Secure for Bharat",
    tag: "Enterprise Grade",
    description: "Multi-tenant architecture ensuring data isolation. Custom SSO, strict role-based access controls, and compliance-ready infrastructure.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="bg-bb-bg py-24 lg:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Platform Capabilities"
          title={<>A Complete <Accent>Ecosystem</Accent></>}
          description="Everything your institution needs to deliver a modern, AI-powered reading experience."
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="bb-lift flex min-h-[260px] flex-col gap-4 rounded-bb-lg bg-bb-surface p-7 shadow-e1">
              <Icon name={f.icon} size={44} />
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-accent-ink">{f.tag}</p>
              <h3 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em]">{f.title}</h3>
              <p className="text-base leading-relaxed text-bb-muted">{f.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  )
}
