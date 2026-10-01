"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import styles from "@/app/home.module.css"

interface FAQItem {
  question: string
  answer: string
  category?: string
}

interface FAQAccordionProps {
  faqs: FAQItem[]
  categories?: string[]
}

export function FAQAccordion({ faqs, categories = [] }: FAQAccordionProps) {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || "All")

  const toggleFAQ = (question: string) => {
    setOpenQuestion(openQuestion === question ? null : question)
  }

  const filteredFAQs =
    activeCategory === "All" || !activeCategory
      ? faqs
      : faqs.filter((faq) => faq.category === activeCategory)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-6 py-2 rounded-full font-semibold transition-all duration-300 relative overflow-hidden",
                activeCategory === category
                  ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_4px_16px_rgba(217,119,6,0.3)] shadow-[0_2px_8px_rgba(0,0,0,0.1)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_20%)]"
                  : "bg-white/80 border border-amber-200/50 text-amber-700/80 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
              )}
            >
              {activeCategory === category && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
              )}
              <span className="relative z-10">{category}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFAQs.map((faq) => (
          <div
            key={faq.question}
            className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg ${styles.parchmentCard}`}
          >
            {/* Subtle Mandala Watermark */}
            <div className={`${styles["mandala-bg"]} ${styles["mandala-kolam"]} opacity-5`} />

            <button
              type="button"
              onClick={() => toggleFAQ(faq.question)}
              className="relative z-10 w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-inset"
            >
              <span className="font-bold text-[#1A237E] text-lg pr-4">
                {faq.question}
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-amber-600 transition-transform duration-300 flex-shrink-0",
                  openQuestion === faq.question && "transform rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300 relative z-10",
                openQuestion === faq.question ? "max-h-96" : "max-h-0"
              )}
            >
              <div className="px-6 pb-5 text-[#5D4037] leading-relaxed font-medium">
                {/* Thin Golden Diamond Divider before answer */}
                <div className="flex items-center gap-2 mb-4 opacity-50">
                  <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#FFD700]"></div>
                  <div className="w-1.5 h-1.5 rotate-45 bg-[#FF9933]"></div>
                  <div className="h-[1px] w-full bg-gradient-to-r from-[#FFD700] to-transparent"></div>
                </div>
                {faq.answer}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

