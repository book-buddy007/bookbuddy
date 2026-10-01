export type AccessTier = 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
export type BookFormatType = 'PDF' | 'EPUB' | 'AUDIOBOOK' | 'AI_EMBED';

export interface BookCategoryRef {
  category: { id: string; name: string; type: string } | null;
}

export interface BookFormatRef {
  id: string;
  type: BookFormatType;
  fileSize: number | null;
  totalDurationSeconds: number | null;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  coverUrl: string | null;
  backCoverUrl: string | null;
  description: string | null;
  publisher: string | null;
  publishYear: number | null;
  pages: number | null;
  language: string | null;
  accessTier: AccessTier;
  drmProtected: boolean;
  streamable: boolean;
  available: boolean;
  availableCopies: number;
  totalCopies: number;
  createdAt: string;
  categories: BookCategoryRef[];
  bookFormats: BookFormatRef[];
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
}

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantType: string;
  role: string;
  status: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  accountType: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  tenantMemberships?: TenantMembership[];
}

export interface LoginResponse {
  sessionToken: string;
  user: AuthUser;
}

export interface Institution {
  id: string;
  name: string;
  domain: string | null;
  type: string | null;
  description: string | null;
  location: string | null;
  logoUrl: string | null;
  memberCount: number;
  bookCount: number;
}

export interface InstitutionDetail extends Institution {
  branding: unknown;
  isActive: boolean;
  allowJoinRequests: boolean;
  subscriptionTier: string | null;
  subscriptionEndDate: string | null;
  pendingRequestCount: number;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
}

/** Response of GET /join-requests/check/:tenantId. */
export interface JoinRequestCheck {
  hasRequest: boolean;
  status: JoinRequestStatus | null;
  request: JoinRequest | null;
  isMember: boolean;
  membershipStatus: MembershipStatus | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  /** e.g. 'join_approved', 'join_rejected', 'book_due'. */
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface PersonalFolder {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  color: string | null;
  isStarred: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalFile {
  id: string;
  userId: string;
  folderId: string | null;
  isStarred: boolean;
  tags: string[];
  sortOrder: number;
  color: string | null;
  title: string;
  author: string | null;
  /** 'pdf' | 'epub' */
  format: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  coverUrl: string | null;
  lastReadAt: string | null;
  /** Denormalised 0.0–1.0, distinct from the readingProgress relation. */
  progress: number;
  createdAt: string;
  updatedAt: string;
  readingProgress?: {
    currentPage: number;
    percentComplete: number;
    lastReadAt: string | null;
  } | null;
}

export interface PersonalLibraryContents {
  folder: PersonalFolder | null;
  breadcrumb: { id: string; name: string }[];
  folders: PersonalFolder[];
  files: PersonalFile[];
}

export interface PersonalLibraryQuota {
  usedBytes: number;
  usedCount: number;
  maxStorageBytes: number;
  maxFileCount: number;
  maxSingleFileBytes: number;
  remainingBytes: number;
  remainingFiles: number;
}

export interface PresignUploadResult {
  uploadUrl: string;
  fields?: Record<string, string>;
  storageKey: string;
  maxBytes: number;
}

export type AnnotationType = 'highlight' | 'note' | 'bookmark';

/** Position payload — page geometry for text, a timestamp for audio. */
export interface AnnotationPosition {
  page?: number;
  pageIndex?: number;
  timestamp?: number;
  [key: string]: unknown;
}

export interface Annotation {
  id: string;
  tenantId: string;
  userId: string;
  bookId: string;
  content: string;
  type: AnnotationType | string;
  color: string | null;
  position: AnnotationPosition;
  shared: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present on shared annotations from classmates. */
  user?: { id: string; name: string | null };
}

export interface AnnotationInput {
  /** Client-generated so the upsert can reconcile an offline create. */
  id: string;
  bookId: string;
  type: AnnotationType | string;
  content: string;
  position: AnnotationPosition;
  color?: string;
  isShared?: boolean;
}

/** Merged dictionary result, cached server-side in WordCache. */
export interface WordLookup {
  word: string;
  definition: string | null;
  hindiTranslation: string | null;
  pronunciation: string | null;
  partOfSpeech: string | null;
  example: string | null;
  wikiExtract: string | null;
  wikiUrl: string | null;
}

export interface VocabularyEntry {
  id: string;
  word: string;
  definition: string | null;
  context: string | null;
  bookId: string | null;
  createdAt: string;
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  color: string | null;
  bookId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Prisma `_count` include from GET /flashcards/decks. */
  _count?: { cards: number };
}

export interface Flashcard {
  id: string;
  deckId: string;
  frontContent: string;
  backContent: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

/** A row from /library/borrowed or /library/history. */
export interface BorrowedBook {
  id: string;
  tenantId: string;
  userId: string;
  bookId: string;
  borrowedAt: string;
  dueDate: string;
  /** Null while the title is still out. */
  returnedAt: string | null;
  expiresAt: string | null;
  renewalCount: number;
  lastRenewedAt: string | null;
  book: Book;
}

/** /library/saved returns the book fields flattened, plus bookmark metadata. */
export interface SavedBook extends Book {
  savedAt: string;
  annotationId: string;
}

export interface AnalyticsOverview {
  streak: number;
  totalBooks: number;
  totalPages: number;
  readingTimeHours: number;
}

export interface ReadingHistoryPoint {
  /** Short weekday label, e.g. "Mon". */
  date: string;
  /** ISO date, e.g. "2026-07-25". */
  fullDate: string;
  pages: number;
}

export interface ReadingGoal {
  id: string;
  title: string;
  type: string;
  target: number;
  progress: number;
  deadline: string;
  category: string;
}

export interface ReadingStreak {
  id: string;
  userId: string;
  tenantId: string | null;
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string | null;
  dailyGoalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type MembershipStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | string;
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string;

export interface TenantRef {
  id: string;
  name: string;
  domain: string | null;
  type: string | null;
  logoUrl: string | null;
}

export interface ProfileMembership {
  id: string;
  role: string;
  status: MembershipStatus;
  tenantId: string;
  tenant: TenantRef;
}

/**
 * `/user/profile` returns a trimmed version (id, status, tenant name only),
 * while the join-requests endpoints return the full record — hence the
 * optional fields rather than two near-identical types.
 */
export interface JoinRequest {
  id: string;
  status: JoinRequestStatus;
  tenant: { id?: string; name: string; logoUrl?: string | null };
  tenantId?: string;
  userId?: string;
  requestedRole?: string;
  message?: string | null;
  proofDocument?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Shape of GET /user/profile — richer than the AuthUser returned by
 * /auth/profile. This is the one the access gate needs: it carries
 * `emailVerified`, onboarding progress, membership status and the latest join
 * request, which together decide whether a user can reach the library at all.
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  pendingPhone: string | null;
  pendingEmail: string | null;
  profilePicture: string | null;
  role: string | null;
  accountType: 'INDEPENDENT' | 'INSTITUTIONAL' | null;
  metadata: unknown;
  onboardingCompleted: boolean;
  onboardingStep: number | null;
  tenantMemberships: ProfileMembership[];
  /** Backend returns only the most recent request (`take: 1`). */
  joinRequests: JoinRequest[];
}

export interface ReadUrlResponse {
  url?: string;
  encryptedUrl?: string;
  expiresAt?: string;
  format: string;
}
