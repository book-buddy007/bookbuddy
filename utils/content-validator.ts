import { z } from 'zod';

// Character limits for homepage text elements
export const HOMEPAGE_TEXT_LIMITS = {
  heroTitle: 120,
  heroSubtitle: 240,
  ctaButton: 20,
  announcementTitle: 50,
  announcementText: 200,
  featuredBookTitle: 40,
  featureCardTitle: 40,
  featureCardDesc: 120,
  testimonialQuote: 280
};

// Custom validator to disallow emojis
const noEmoji = (text: string) => {
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return !emojiRegex.test(text);
};

// Schema for hero section
export const heroSchema = z.object({
  title: z.string()
    .max(HOMEPAGE_TEXT_LIMITS.heroTitle, `Title must be no more than ${HOMEPAGE_TEXT_LIMITS.heroTitle} characters`)
    .refine(noEmoji, { message: 'Emojis are not allowed in titles' }),
  subtitle: z.string()
    .max(HOMEPAGE_TEXT_LIMITS.heroSubtitle, `Subtitle must be no more than ${HOMEPAGE_TEXT_LIMITS.heroSubtitle} characters`),
  ctaButton: z.string()
    .max(HOMEPAGE_TEXT_LIMITS.ctaButton, `CTA text must be no more than ${HOMEPAGE_TEXT_LIMITS.ctaButton} characters`)
    .refine((val) => !val.includes('.'), { message: 'Punctuation not allowed in CTA buttons' }),
  image: z.string().url({ message: 'Please provide a valid image URL' }).optional().or(z.literal(''))
});

// Schema for announcement section
export const announcementSchema = z.object({
  title: z.string()
    .max(HOMEPAGE_TEXT_LIMITS.announcementTitle, `Title must be no more than ${HOMEPAGE_TEXT_LIMITS.announcementTitle} characters`),
  items: z.array(
    z.string().max(HOMEPAGE_TEXT_LIMITS.announcementText, `Announcement text must be no more than ${HOMEPAGE_TEXT_LIMITS.announcementText} characters`)
  )
});

// Schema for featured books section
export const featuredSchema = z.object({
  books: z.array(
    z.object({
      id: z.string(),
      title: z.string()
        .max(HOMEPAGE_TEXT_LIMITS.featuredBookTitle, `Book title must be no more than ${HOMEPAGE_TEXT_LIMITS.featuredBookTitle} characters`),
      image: z.string().url({ message: 'Please provide a valid image URL' }).optional().or(z.literal(''))
    })
  ),
  layout: z.enum(['grid', 'carousel'])
});

export const gallerySchema = z.object({
  images: z.array(z.string().url({ message: 'Invalid URL' })).max(10)
});

export const featuresSchema = z.object({
  cards: z.array(
    z.object({
      title: z.string().max(HOMEPAGE_TEXT_LIMITS.featureCardTitle),
      description: z.string().max(HOMEPAGE_TEXT_LIMITS.featureCardDesc),
      icon: z.string(),
      link: z.string().url().optional().or(z.literal(''))
    })
  ).max(6)
});

export const testimonialsSchema = z.array(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.string().min(1),
    company: z.string().min(1),
    quote: z.string().max(HOMEPAGE_TEXT_LIMITS.testimonialQuote),
    rating: z.number().min(1).max(5)
  })
).refine((items) => {
  const emails = items.map(t => t.email);
  return new Set(emails).size === emails.length;
}, { message: "Testimonial emails must be unique" });

// Schema for entire homepage content
export const homepageSchema = z.object({
  hero: heroSchema,
  featured: featuredSchema,
  announcements: announcementSchema,
  gallery: gallerySchema.optional(),
  features: featuresSchema.optional(),
  testimonials: testimonialsSchema.optional(),
  sectionsOrder: z.array(z.string()).optional()
});

// Calculate remaining characters
export function getRemainingCharacters(value: string, limit: number): number {
  return Math.max(0, limit - (value?.length || 0));
}

// Get appropriate status color based on remaining characters
export function getCounterStatusColor(value: string, limit: number): string {
  const remaining = getRemainingCharacters(value, limit);
  const percentage = (remaining / limit) * 100;

  if (percentage <= 10) {
    return 'text-destructive'; // Red - danger
  } else if (percentage <= 25) {
    return 'text-amber-500'; // Amber - warning
  } else {
    return 'text-muted-foreground'; // Default - normal
  }
} 