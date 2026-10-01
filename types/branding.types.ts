// ─── Branding Domain Types ───────────────────────────────────────────────────
// Shared between frontend components and API layer.
// Keep API response shapes in types/admin.ts — this file is for domain models.

export interface BrandingColors {
  primary: string;
  secondary: string;
}

export interface BrandingControlsEditorProps {
  tenantId: string;
  branding: BrandingConfig;
  onChange: (updated: BrandingConfig) => void;
}

export interface BrandingConfig {
  logo?: string;
  logoKey?: string;
  colors?: BrandingColors;
  typography?: string;
  homepage?: HomepageContent;
  publishedState?: Record<string, unknown>;
  lastPublishedAt?: string;
  publishedVersion?: string;
  [key: string]: unknown;
}

// ─── Homepage Content Types ──────────────────────────────────────────────────

export interface HeroSection {
  title: string;
  subtitle: string;
  ctaButton: string;
  image?: string;
}

export interface FeaturedBook {
  id: string;
  title: string;
  image?: string;
}

export interface FeaturedSection {
  books: FeaturedBook[];
  layout: 'grid' | 'carousel';
}

export interface AnnouncementsSection {
  title: string;
  items: string[];
}

export interface HomepageContent {
  hero: HeroSection;
  featured: FeaturedSection;
  announcements: AnnouncementsSection;
  gallery?: { images: string[] };
  features?: { cards: FeatureCard[] };
  testimonials?: Testimonial[];
  sectionsOrder?: string[];
}

export interface FeatureCard {
  title: string;
  description: string;
  icon?: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

// ─── UI State Types ──────────────────────────────────────────────────────────

export type PageAction = 'idle' | 'saving' | 'publishing' | 'reverting';
