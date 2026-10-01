"use client"

import { useState, useEffect } from "react"
import { Star, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import styles from "@/app/home.module.css"

interface Testimonial {
  id: number
  name: string
  role: string
  institution: string
  content: string
  rating: number
  avatar?: string
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[]
  autoRotate?: boolean
  interval?: number
}

export function TestimonialCarousel({
  testimonials,
  autoRotate = true,
  interval = 5000,
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!autoRotate || isHovered) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoRotate, interval, testimonials.length, isHovered])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <div
      className="relative max-w-4xl mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Testimonial Card */}
      <div
        className={`relative z-10 rounded-3xl p-8 md:p-12 transition-transform duration-500 overflow-hidden ${styles.parchmentCard}`}
      >
        {/* Subtle Ashoka Chakra Watermark background from home.module.css */}
        <div className={`${styles["mandala-bg"]} ${styles["mandala-ashoka"]}`} />

        {/* Stars */}
        <div className="flex justify-center mb-6 relative z-10">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-6 w-6 stroke-1",
                i < currentTestimonial.rating
                  ? "fill-amber-500 text-amber-500 drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)]"
                  : "fill-amber-500/10 text-amber-500/20"
              )}
            />
          ))}
        </div>

        {/* Quote */}
        <blockquote className="text-center relative z-10">
          <p className="text-lg md:text-xl text-[#5D4037] leading-relaxed mb-6 font-medium italic">
            "{currentTestimonial.content}"
          </p>
        </blockquote>

        {/* Thin Golden Diamond Divider */}
        <div className="flex items-center justify-center gap-2 mb-8 opacity-70 relative z-10">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#FFD700]"></div>
          <div className="w-1.5 h-1.5 rotate-45 bg-[#FF9933]"></div>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#FFD700]"></div>
        </div>

        {/* Author */}
        <div className="flex flex-col items-center relative z-10">
          <div className={`relative w-16 h-16 rounded-full mb-4 flex items-center justify-center ${styles.iconHalo}`}>
            <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#1A237E] to-[#4A148C] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.3)] shadow-[0_4px_12px_rgba(26,35,126,0.5)] flex items-center justify-center text-white text-2xl font-bold overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
              <span className="relative z-10 font-serif drop-shadow-md">{currentTestimonial.avatar || currentTestimonial.name.charAt(0)}</span>
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-[#1A237E] text-lg">
              {currentTestimonial.name}
            </p>
            <p className="text-[#5D4037] text-sm font-medium">
              {currentTestimonial.role}
            </p>
            <p className="text-[#795548] text-sm opacity-80">
              {currentTestimonial.institution}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute z-20 left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 rounded-full p-4 bg-white/80 border border-amber-200/50 shadow-[0_4px_12px_rgba(217,119,6,0.15)] text-amber-600/70 transition-all duration-300 hover:scale-110 hover:text-amber-600 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        aria-label="Previous testimonial"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={goToNext}
        className="absolute z-20 right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 rounded-full p-4 bg-white/80 border border-amber-200/50 shadow-[0_4px_12px_rgba(217,119,6,0.15)] text-amber-600/70 transition-all duration-300 hover:scale-110 hover:text-amber-600 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
        aria-label="Next testimonial"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500",
              index === currentIndex
                ? "w-8 bg-gradient-to-r from-amber-600 to-amber-500 shadow-[0_2px_8px_rgba(217,119,6,0.3)]"
                : "w-2 bg-amber-600/20 hover:bg-amber-600/40"
            )}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

