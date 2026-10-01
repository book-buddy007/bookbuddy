import { BookOpen, Bot, LayoutDashboard, ShieldCheck, PenTool, BookMarked } from "@/components/ui/icons"
import styles from "@/app/home.module.css"

export function FeaturesSection() {
  const features = [
    { 
      icon: BookOpen, 
      title: "Multi-Format Library", 
      tag: "Core Reader",
      description: "One source, four modes. Students choose: responsive EPUB, page-accurate PDF, natural Text-to-Speech audiobooks, or AI-embedded chat via Varta.", 
      gradient: "from-[#FF9933] to-[#E65100]", 
      mandalaClass: styles["mandala-lotus"] 
    },
    { 
      icon: Bot, 
      title: "Varta Study Assistant", 
      tag: "Varta",
      description: "Students can chat with any textbook. Get instant explanations, generate practice questions, create flashcards, and view precise paragraph-level citations.", 
      gradient: "from-[#006A6E] to-[#004D40]", 
      mandalaClass: styles["mandala-sriyantra"] 
    },
    { 
      icon: PenTool, 
      title: "Built-in PDF Studio", 
      tag: "Annotation & Sync",
      description: "Drawboard-like features inside the browser. Freehand ink, smart shapes, highlights, redaction, OCR, and audio notes — all directly on your PDFs.", 
      gradient: "from-[#B8860B] to-[#8B6508]", 
      mandalaClass: styles["mandala-ashoka"] 
    },
    { 
      icon: BookMarked, 
      title: "Sanchika", 
      tag: "Smart Notebook",
      description: "Your evolving study archive. Sanchika automatically collects highlights, Varta explanations, and annotations across every book — revisit flashcards, summaries, and key points anytime.", 
      gradient: "from-[#E91E8C] to-[#AD1457]", 
      mandalaClass: styles["mandala-meenakari"] 
    },
    { 
      icon: LayoutDashboard, 
      title: "Institutional Dashboards", 
      tag: "For Admins & Teachers",
      description: "Detailed usage analytics. Track most-read books, identify struggling chapters across batches, and monitor overall AI usage statistics.", 
      gradient: "from-[#0D1B6E] to-[#4A148C]", 
      mandalaClass: styles["mandala-peacock"] 
    },
    { 
      icon: ShieldCheck, 
      title: "Secure for Bharat", 
      tag: "Enterprise Grade",
      description: "Multi-tenant architecture ensuring data isolation. Custom SSO, strict role-based access controls, and compliance-ready infrastructure.", 
      gradient: "from-[#C62828] to-[#b71c1c]", 
      mandalaClass: styles["mandala-kolam"] 
    },
  ]

  return (
    <section id="features" className={`py-24 ${styles.featuresGridBackground}`}>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16 gateway-header animate-landing-fade-in-up">
          {/* Section label — #B45309 on cream bg ≈ 5:1 ✓ */}
          <span className="text-[#B45309] font-bold text-lg uppercase tracking-wide">Platform Capabilities</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4 text-[#0D1B6E]">
            A Complete <span className="gradient-text-indic-soft">Ecosystem</span>
          </h2>
          {/* Body text — #3E2723 on #FFFDE7 ≈ 10:1 ✓ */}
          <p className="text-xl text-[#3E2723] max-w-2xl mx-auto font-medium">
            Everything your institution needs to deliver a modern, AI-powered reading experience.
          </p>
        </div>

        {/* 6 cards fill 3-col grid evenly in 2 rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative rounded-3xl p-8 overflow-hidden transition-transform duration-500 hover:-translate-y-2 ${styles.parchmentCard}`}
            >
              {/* Mandala Watermark */}
              <div className={`${styles["mandala-bg"]} ${feature.mandalaClass}`} />

              <div className="flex justify-between items-start mb-6">
                {/* Icon with Temple Brass Halo */}
                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ${styles.iconHalo}`}>
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${feature.gradient} shadow-inner flex items-center justify-center`}>
                    <div className="absolute inset-0 bg-white/20 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <feature.icon className="h-7 w-7 text-white drop-shadow-md relative z-10" />
                  </div>
                </div>
                
                {/* Tag — dark brown on cream ≈ 10:1 ✓ */}
                <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-[#5D4037]/5 text-[#3E2723] rounded-full border border-[#5D4037]/15">
                  {feature.tag}
                </span>
              </div>

              {/* Content */}
              <h3 className="relative text-2xl font-bold mb-3 text-[#0D1B6E] leading-tight font-serif">
                {feature.title}
              </h3>

              {/* Thin Golden Diamond Divider */}
              <div className="flex items-center gap-2 mb-4 opacity-80">
                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#B8860B]" />
                <div className="w-1.5 h-1.5 rotate-45 bg-[#B45309]" />
                <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#B8860B]" />
              </div>

              <p className="relative text-[#3E2723] leading-relaxed text-base font-medium">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
