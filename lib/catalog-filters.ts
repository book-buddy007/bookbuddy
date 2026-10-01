import type { BBIconName } from "@/lib/bb-icons"

/**
 * Catalogue filters, limited to what GET /books actually honours:
 * `search` (title / author / ISBN), one `category`, one `format`
 * (EPUB | PDF | AUDIOBOOK) and `sortBy` in title | author | createdAt | publishYear.
 * Anything not listed here would be UI with no effect, so it isn't offered.
 */
export interface CatalogFilters {
  category: string | null
  format: string | null
}

export const EMPTY_FILTERS: CatalogFilters = { category: null, format: null }

export const ALL_GENRES = "All genres"

export const CATALOG_SORTS = [
  { value: "title-asc", label: "Title A–Z" },
  { value: "title-desc", label: "Title Z–A" },
  { value: "author-asc", label: "Author A–Z" },
  { value: "author-desc", label: "Author Z–A" },
  { value: "createdAt-desc", label: "Newest in library" },
  { value: "publishYear-desc", label: "Recently published" },
] as const

export const DEFAULT_SORT = "title-asc"

export const CATALOG_FORMATS: { value: string | null; label: string; icon: BBIconName }[] = [
  { value: null, label: "All formats", icon: "library" },
  { value: "EPUB", label: "eBook", icon: "read" },
  { value: "PDF", label: "PDF", icon: "pdf" },
  { value: "AUDIOBOOK", label: "Audiobook", icon: "audiobook" },
]

/** Map legacy/loose format strings (old search history, ?format= links) onto the API values. */
export function normalizeFormat(raw: string | null | undefined): string | null {
  if (!raw) return null
  const key = raw.toUpperCase().replace(/[\s-]/g, "_")
  const map: Record<string, string> = {
    EPUB: "EPUB", EBOOK: "EPUB", E_BOOK: "EPUB",
    PDF: "PDF",
    AUDIOBOOK: "AUDIOBOOK", AUDIO_BOOK: "AUDIOBOOK",
  }
  return map[key] ?? null
}

export const formatLabel = (value: string | null) =>
  CATALOG_FORMATS.find((f) => f.value === value)?.label ?? value ?? ""
