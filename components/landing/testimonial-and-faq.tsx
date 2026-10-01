import { TestimonialCarousel } from "@/components/landing/testimonial-carousel"
import { FAQAccordion } from "@/components/landing/faq-accordion"
import { Container, SectionHeading, Accent } from "@/components/landing/section"

export function TestimonialAndFAQSection() {
  // Pre-launch: these are the value propositions our design-partner interviews
  // surfaced, voiced through role personas — not attributed to named customers.
  // Honest framing for a founding-cohort product (no fabricated identities).
  const testimonials = [
    {
      id: 1,
      name: "Dean of Academics",
      role: "Design-partner persona",
      institution: "Founding cohort",
      content: "What we need is to move thousands of students to digital EPUBs without standing up new infrastructure — Book Buddy is built to do exactly that.",
      rating: 5,
    },
    {
      id: 2,
      name: "Head of Sciences",
      role: "Design-partner persona",
      institution: "Founding cohort",
      content: "The reason Varta matters: it answers only from the textbooks we upload and cites the page — so there are no hallucinations for students to second-guess.",
      rating: 5,
    },
    {
      id: 3,
      name: "Postgraduate Student",
      role: "Design-partner persona",
      institution: "Founding cohort",
      content: "Annotating a PDF in the browser and turning those highlights straight into Sanchika flashcards is the workflow that would cut my revision time in half.",
      rating: 5,
    },
  ]

  const faqs = [
    { question: "How does AI-embedded reading work?", answer: "When you upload a textbook (PDF or EPUB), our Varta engine indexes the exact content. When a student asks a doubt, the AI constructs an answer strictly using the textbook's text and provides clickable citations to the exact page.", category: "AI & Features" },
    { question: "What is Sanchika?", answer: "Sanchika is the personal study archive built into Book Buddy. It automatically collects every highlight, annotation, AI explanation, and flashcard a student creates — across all their books — into one evolving notebook they can revisit any time.", category: "AI & Features" },
    { question: "Is student data private and tenant-isolated?", answer: "Yes. Every institution gets a completely isolated database tenant. User queries, reading habits, and highlighting data are never shared across institutions or used to train public LLM models.", category: "Security" },
    { question: "Can we bring our existing PDFs and books?", answer: "Absolutely. Our platform supports bulk uploads of PDFs and EPUBs. We automatically run OCR on scanned PDFs to ensure they are searchable and AI-ready.", category: "Getting Started" },
    { question: "Does Book Buddy support Text-to-Speech and audiobooks?", answer: "Yes. Every book in your library gets natural, AI-powered Text-to-Speech narration. Students can listen on the go and seamlessly switch between reading and listening modes.", category: "AI & Features" },
    { question: "What about mobile reading?", answer: "Book Buddy uses responsive rendering engines (EPUB.js and PDF.js). Textbooks automatically reflow and scale perfectly for mobile browsers and tablets without requiring a dedicated app download.", category: "Technical" },
  ]

  const faqCategories = ["All", "AI & Features", "Security", "Getting Started", "Technical"]

  return (
    <>
      <section id="testimonials" className="bg-bb-surface py-24 lg:py-28">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            center
            eyebrow="Built With Educators"
            title={<>Designed with our <Accent>founding cohort</Accent></>}
            description="We're building Book Buddy alongside deans, faculty, and students. These are the needs they voiced — the product is built to meet them."
          />
          <div>
            <TestimonialCarousel testimonials={testimonials} />
            <p className="mt-6 text-center text-xs italic text-bb-faint">Illustrative voices from design-partner interviews · launching 2026</p>
          </div>
        </Container>
      </section>

      <section id="faq" className="bg-bb-bg py-24 lg:py-28">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            center
            eyebrow="FAQ"
            title={<>Frequently Asked <Accent>Questions</Accent></>}
            description="Everything you need to know about deploying Book Buddy for your institution."
          />
          <FAQAccordion faqs={faqs} categories={faqCategories} />
        </Container>
      </section>
    </>
  )
}
