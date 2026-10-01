/**
 * Canonical typed payload for all Book update operations.
 * Field names MUST match the Prisma schema exactly.
 * TypeScript enforces this — a typo like `coverImage` is a compile error.
 */
export interface BookUpdatePayload {
  // Identity
  title?:          string;
  author?:         string;
  publisher?:      string;
  publishYear?:    number;
  isbn?:           string;
  pageCount?:      number;
  language?:       string;
  description?:    string;
  // Classification
  genre?:          string;
  accessTier?:     'FREE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  licenseType?:    'UNKNOWN' | 'AI_PERMITTED' | 'AI_RESTRICTED';
  aiEmbedEnabled?: boolean;
  // Covers — field names MUST match Prisma schema
  coverUrl?:       string;   // ← NOT coverImage
  coverKey?:       string;
  backCoverUrl?:   string;
  backCoverKey?:   string;
  // Sample
  sampleFileUrl?:  string;
  sampleFileKey?:  string;
}
