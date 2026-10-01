// types/catalog.ts
// ============================================================================
// Single source of truth for public-facing catalog book data.
// Import this type in EVERY catalog component — never define a local Book interface.
// ============================================================================

// ── Enums (string literal unions for frontend safety) ────────────────────────

export type AccessTier = 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
export type BookFormatType = 'PDF' | 'EPUB' | 'AUDIOBOOK' | 'AI_EMBED';

// ── Interfaces ───────────────────────────────────────────────────────────────

/** Format metadata returned from the API. */
export interface CatalogBookFormat {
  id?: string;        // Present wherever a single format can be acted on (deleted)
  type: BookFormatType;
  /**
   * Which part of the work this file is: a chapter number for AI_EMBED, 0 for
   * whole-book renditions. A book has many markdown rows, so `type` alone does
   * not identify a format file.
   */
  partIndex?: number;
  fileUrl?: string;   // Only present on detail page response, NOT in list
  fileSize?: number;  // Bytes
  metadata?: {
    duration?: number;  // Seconds — audiobooks only (stored in BookFormat.metadata JSON)
    [key: string]: unknown;
  };
}

/**
 * Canonical book shape for all catalog-facing components.
 * Replaces all local `interface Book` definitions in:
 *   - app/catalog/page.tsx
 *   - app/catalog/[id]/page.tsx
 *   - components/BookCard.tsx
 */
export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string | null;
  backCoverUrl: string | null;
  description: string | null;
  publisher: string | null;
  publishYear: number | null;
  pages: number | null;
  language: string | null;
  genre: string[];              // Derived from categories relation
  accessTier: AccessTier;
  formats: BookFormatType[];    // Derived from bookFormats[].type — replaces singular `format`
  bookFormats: CatalogBookFormat[]; // Full format objects (detail page populates fileUrl)
  available: boolean;
  rating: number | null;

  // Borrow context (populated when user has borrowed the book)
  borrowedAt?: string;
  expiresAt?: string;
}

// ── Tier Helpers ─────────────────────────────────────────────────────────────

export const TIER_ORDER: AccessTier[] = ['FREE', 'BRONZE', 'SILVER', 'GOLD', 'DIAMOND'];

/** Returns true if the user's subscription tier can access the book's tier. */
export const canUserAccess = (
  userTier: string | null,
  bookTier: AccessTier
): boolean => {
  const userIdx = TIER_ORDER.indexOf((userTier?.toUpperCase() ?? 'FREE') as AccessTier);
  const bookIdx = TIER_ORDER.indexOf(bookTier);
  return (userIdx >= 0 ? userIdx : 0) >= (bookIdx >= 0 ? bookIdx : 0);
};

export const isFreeBook = (book: CatalogBook): boolean =>
  book.accessTier === 'FREE';

// ── Format Helpers ───────────────────────────────────────────────────────────

export const hasReader = (book: CatalogBook): boolean =>
  book.formats.some(f => f === 'PDF' || f === 'EPUB');

export const hasAudio = (book: CatalogBook): boolean =>
  book.formats.includes('AUDIOBOOK');

export const hasAiEmbed = (book: CatalogBook): boolean =>
  book.formats.includes('AI_EMBED');

/** Returns the highest-value readable format. */
const FORMAT_PRIORITY: BookFormatType[] = ['AI_EMBED', 'EPUB', 'PDF', 'AUDIOBOOK'];

export const getPrimaryFormat = (formats: BookFormatType[]): BookFormatType | null =>
  FORMAT_PRIORITY.find(p => formats.includes(p)) ?? null;

/** Returns the best readable format, excluding audio and AI. */
export const getPrimaryReadFormat = (formats: BookFormatType[]): BookFormatType | null => {
  const readFormats: BookFormatType[] = ['EPUB', 'PDF'];
  return readFormats.find(f => formats.includes(f)) ?? null;
};

// ── Routing Helpers ──────────────────────────────────────────────────────────

/**
 * Centralized reader/player routing.
 * Every button MUST use this — never hardcode route strings.
 */
export const getReaderRoute = (bookId: string, format: BookFormatType): string => {
  switch (format) {
    case 'AUDIOBOOK':
      return `/player/v2?bookId=${bookId}`;
    case 'AI_EMBED':
      return `/reader?bookId=${bookId}&mode=ai`;
    case 'EPUB':
      return `/reader?bookId=${bookId}&format=epub`;
    case 'PDF':
    default:
      return `/reader?bookId=${bookId}&format=pdf`;
  }
};

// ── UI Constants ─────────────────────────────────────────────────────────────

/** Tier badge styles (Tailwind classes). */
export const TIER_STYLES: Record<AccessTier, string> = {
  FREE:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  BRONZE:  'bg-orange-100  text-orange-700  border-orange-200',
  SILVER:  'bg-slate-100   text-slate-600   border-slate-300',
  GOLD:    'bg-yellow-100  text-yellow-700  border-yellow-200',
  DIAMOND: 'bg-cyan-100    text-cyan-700    border-cyan-200',
};

/** Format badge labels with emoji prefixes. */
export const FORMAT_LABELS: Record<BookFormatType, string> = {
  EPUB:      '📖 eBook',
  PDF:       '📄 PDF',
  AUDIOBOOK: '🎧 Audiobook',
  AI_EMBED:  '✨ Varta Enabled',
};
