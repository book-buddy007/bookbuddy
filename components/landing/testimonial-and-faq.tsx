import { TestimonialCarousel } from "@/components/landing/testimonial-carousel"
import { FAQAccordion } from "@/components/landing/faq-accordion"
import styles from "@/app/home.module.css"

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
      {/* ===== TESTIMONIALS SECTION ===== */}
      <section id="testimonials" className="py-24 bg-white relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-16 gateway-header animate-landing-fade-in-up">
            {/* Section label — #B45309 on white = 5.2:1 ✓ */}
            <span className="text-[#B45309] font-bold text-lg uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>Built With Educators</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4 text-slate-900 font-serif">
              Designed with our <span className="text-[#B45309]">founding cohort</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We&apos;re building Book Buddy alongside deans, faculty, and students. These are the
              needs they voiced — the product is built to meet them.
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <TestimonialCarousel testimonials={testimonials} />
            <p className="text-center text-xs text-slate-400 mt-6 italic">
              Illustrative voices from design-partner interviews · launching 2026
            </p>
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className={`py-24 ${styles.featuresGridBackground}`}>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16 animate-landing-fade-in-up">
            {/* Section label — #006A6E on cream bg ≈ 5.4:1 ✓ */}
            <span className="text-[#006A6E] font-bold text-lg uppercase tracking-wide">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4 text-[#0D1B6E] font-serif">
              Frequently Asked <span className="gradient-text-indic-soft">Questions</span>
            </h2>
            <p className="text-xl text-[#3E2723] max-w-2xl mx-auto font-medium">
              Everything you need to know about deploying Book Buddy for your institution.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <FAQAccordion faqs={faqs} categories={faqCategories} />
          </div>
        </div>
      </section>
    </>
  )
}
