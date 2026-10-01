-- Book Buddy by VPD — initial schema (squashed).
-- Generated from the full migration history; equivalent to applying all previous migrations in order.

-- EXTENSION: citext

CREATE EXTENSION IF NOT EXISTS citext;

-- TYPE: AccessTier

CREATE TYPE "AccessTier" AS ENUM (
    'free',
    'bronze',
    'silver',
    'gold',
    'diamond'
);

-- TYPE: AccountType

CREATE TYPE "AccountType" AS ENUM (
    'independent',
    'institutional'
);

-- TYPE: AudioGender

CREATE TYPE "AudioGender" AS ENUM (
    'MALE',
    'FEMALE'
);

-- TYPE: AudioSectionType

CREATE TYPE "AudioSectionType" AS ENUM (
    'INTRO',
    'SECTION'
);

-- TYPE: BookFormatType

CREATE TYPE "BookFormatType" AS ENUM (
    'pdf',
    'epub',
    'audiobook',
    'ai_embed'
);

-- TYPE: CatalogScope

CREATE TYPE "CatalogScope" AS ENUM (
    'global',
    'institutional'
);

-- TYPE: ChatRole

CREATE TYPE "ChatRole" AS ENUM (
    'USER',
    'ASSISTANT'
);

-- TYPE: EmbeddingStatus

CREATE TYPE "EmbeddingStatus" AS ENUM (
    'none',
    'pending',
    'processing',
    'ready',
    'failed'
);

-- TYPE: GlobalPublishStatus

CREATE TYPE "GlobalPublishStatus" AS ENUM (
    'none',
    'pending',
    'approved',
    'rejected'
);

-- TYPE: InvitationStatus

CREATE TYPE "InvitationStatus" AS ENUM (
    'pending',
    'accepted',
    'expired'
);

-- TYPE: JoinRequestStatus

CREATE TYPE "JoinRequestStatus" AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- TYPE: LicenseType

CREATE TYPE "LicenseType" AS ENUM (
    'unknown',
    'ai_permitted',
    'ai_restricted'
);

-- TYPE: MembershipStatus

CREATE TYPE "MembershipStatus" AS ENUM (
    'active',
    'suspended',
    'pending'
);

-- TYPE: OtpType

CREATE TYPE "OtpType" AS ENUM (
    'email',
    'phone'
);

-- TYPE: StudentAssignmentStatus

CREATE TYPE "StudentAssignmentStatus" AS ENUM (
    'pending',
    'completed'
);

-- TYPE: SubscriptionStatus

CREATE TYPE "SubscriptionStatus" AS ENUM (
    'active',
    'expired',
    'cancelled',
    'trial',
    'suspended'
);

-- TYPE: TenantRole

CREATE TYPE "TenantRole" AS ENUM (
    'admin',
    'librarian',
    'teacher',
    'student'
);

-- TYPE: TenantType

CREATE TYPE "TenantType" AS ENUM (
    'school',
    'college',
    'university',
    'corporate'
);

-- TYPE: UserRole

CREATE TYPE "UserRole" AS ENUM (
    'super-admin',
    'admin',
    'librarian',
    'teacher',
    'student'
);

-- TABLE: Account

CREATE TABLE "Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "accessTokenExpiresAt" timestamp(3) without time zone,
    "refreshTokenExpiresAt" timestamp(3) without time zone,
    scope text,
    "idToken" text,
    password text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: AiFeatureUsage

CREATE TABLE "AiFeatureUsage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    feature text NOT NULL,
    date date NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: Annotation

CREATE TABLE "Annotation" (
    id text NOT NULL,
    "tenantId" text,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    content text NOT NULL,
    type text NOT NULL,
    color text,
    "position" jsonb NOT NULL,
    shared boolean DEFAULT false NOT NULL,
    "sharedWith" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    data jsonb
);

-- TABLE: AudioBookmark

CREATE TABLE "AudioBookmark" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "sectionId" text NOT NULL,
    "positionSeconds" double precision NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: AudioChapter

CREATE TABLE "AudioChapter" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    title text NOT NULL,
    "sortOrder" integer NOT NULL
);

-- TABLE: AudioProgress

CREATE TABLE "AudioProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "sectionId" text NOT NULL,
    "positionSeconds" double precision DEFAULT 0 NOT NULL,
    "activeGender" "AudioGender" DEFAULT 'MALE'::"AudioGender" NOT NULL,
    "showTranscript" boolean DEFAULT false NOT NULL,
    "playbackRate" double precision DEFAULT 1.0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: AudioSection

CREATE TABLE "AudioSection" (
    id text NOT NULL,
    "chapterId" text NOT NULL,
    title text NOT NULL,
    "sortOrder" integer NOT NULL,
    "sectionType" "AudioSectionType" DEFAULT 'SECTION'::"AudioSectionType" NOT NULL,
    "transcriptUrl" text,
    "transcriptCues" jsonb,
    "durationSeconds" double precision,
    "fileSizeBytes" bigint
);

-- TABLE: AudioTrack

CREATE TABLE "AudioTrack" (
    id text NOT NULL,
    "sectionId" text NOT NULL,
    gender "AudioGender" NOT NULL,
    "fileUrl" text NOT NULL,
    "durationSeconds" double precision NOT NULL,
    "fileSizeBytes" bigint,
    "alignmentError" text,
    "alignmentStatus" text DEFAULT 'none'::text NOT NULL,
    "wordAlignment" jsonb
);

-- TABLE: AuditLog

CREATE TABLE "AuditLog" (
    id text NOT NULL,
    action text NOT NULL,
    "entityType" text,
    "entityId" text,
    "userId" text,
    "tenantId" text,
    status text DEFAULT 'SUCCESS'::text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "durationMs" integer,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: Book

CREATE TABLE "Book" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    author text NOT NULL,
    isbn text,
    "coverUrl" text,
    "coverKey" text,
    "backCoverUrl" text,
    "backCoverKey" text,
    "sampleFileUrl" text,
    "sampleFileKey" text,
    format text NOT NULL,
    genre text NOT NULL,
    publisher text,
    "publishYear" integer,
    pages integer,
    language text,
    description text,
    available boolean DEFAULT true NOT NULL,
    "totalCopies" integer DEFAULT 1 NOT NULL,
    "availableCopies" integer DEFAULT 1 NOT NULL,
    "mediaFileId" text,
    "drmProtected" boolean DEFAULT false NOT NULL,
    streamable boolean DEFAULT false NOT NULL,
    "accessTier" "AccessTier" DEFAULT 'free'::"AccessTier" NOT NULL,
    "catalogScope" "CatalogScope" DEFAULT 'institutional'::"CatalogScope" NOT NULL,
    "globalPublishStatus" "GlobalPublishStatus" DEFAULT 'none'::"GlobalPublishStatus" NOT NULL,
    "licenseType" "LicenseType" DEFAULT 'unknown'::"LicenseType" NOT NULL,
    "aiEmbedEnabled" boolean DEFAULT false NOT NULL,
    "embeddingStatus" "EmbeddingStatus" DEFAULT 'none'::"EmbeddingStatus" NOT NULL,
    "vectorCollectionId" text,
    "globalPublishRequestedAt" timestamp(3) without time zone,
    "globalPublishRequestedBy" text,
    "globalPublishReviewedAt" timestamp(3) without time zone,
    "globalPublishReviewedBy" text,
    "globalPublishRejectionNote" text,
    "embeddingStartedAt" timestamp(3) without time zone,
    "licenseVerifiedBy" text,
    "licenseVerifiedAt" timestamp(3) without time zone,
    "licenseDocumentUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "gradeLevel" integer,
    "taxonomyNodeIds" text[] DEFAULT ARRAY[]::text[],
    "taxonomyPrimaryNodeId" text,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text
);

-- TABLE: BookCategory

CREATE TABLE "BookCategory" (
    id text NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'GENRE'::text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: BookCategoryOnBook

CREATE TABLE "BookCategoryOnBook" (
    "bookId" text NOT NULL,
    "categoryId" text NOT NULL
);

-- TABLE: BookChatMessage

CREATE TABLE "BookChatMessage" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "tenantId" text NOT NULL,
    role "ChatRole" NOT NULL,
    content text NOT NULL,
    "citedChunkIds" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    mode text DEFAULT 'explain'::text NOT NULL
);

-- TABLE: BookChunkMapping

CREATE TABLE "BookChunkMapping" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "bookPageId" text,
    "chunkIndex" integer NOT NULL,
    "qdrantPointId" text NOT NULL,
    "pageNumber" integer,
    "chapterTitle" text,
    "textPreview" text NOT NULL,
    "runId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: BookEmbeddingStatus

CREATE TABLE "BookEmbeddingStatus" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    status "EmbeddingStatus" DEFAULT 'pending'::"EmbeddingStatus" NOT NULL,
    "totalChunks" integer DEFAULT 0 NOT NULL,
    "embeddedChunks" integer DEFAULT 0 NOT NULL,
    "errorMessage" text,
    "embeddingModel" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: BookFormat

CREATE TABLE "BookFormat" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    type "BookFormatType" NOT NULL,
    "fileUrl" text,
    "fileSize" integer,
    "mimeType" text,
    metadata jsonb,
    "totalDurationSeconds" double precision,
    "totalSections" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "partIndex" integer DEFAULT 0 NOT NULL
);

-- TABLE: BookPage

CREATE TABLE "BookPage" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "tenantId" text,
    "pageIndex" integer NOT NULL,
    content text NOT NULL
);

-- TABLE: BorrowedBook

CREATE TABLE "BorrowedBook" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "borrowedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "returnedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "renewalCount" integer DEFAULT 0 NOT NULL,
    "lastRenewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: ChapterDigest

CREATE TABLE "ChapterDigest" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "chapterTitle" text NOT NULL,
    "voicePair" text DEFAULT 'default'::text NOT NULL,
    "scriptJson" jsonb NOT NULL,
    "audioUri" text,
    status text DEFAULT 'SCRIPT_READY'::text NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: ConceptMastery

CREATE TABLE "ConceptMastery" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "conceptId" text NOT NULL,
    mastery double precision DEFAULT 0.3 NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "lastUpdated" timestamp(3) without time zone NOT NULL
);

-- TABLE: DeviceToken

CREATE TABLE "DeviceToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "deviceToken" text NOT NULL,
    platform text NOT NULL,
    "deviceName" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: EmailVerificationToken

CREATE TABLE "EmailVerificationToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);

-- TABLE: Flashcard

CREATE TABLE "Flashcard" (
    id text NOT NULL,
    "deckId" text NOT NULL,
    "frontContent" text NOT NULL,
    "backContent" text NOT NULL,
    type text DEFAULT 'basic'::text NOT NULL,
    tags jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: FlashcardDeck

CREATE TABLE "FlashcardDeck" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    color text,
    "userId" text NOT NULL,
    "tenantId" text,
    "bookId" text,
    "isShared" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: FlashcardReview

CREATE TABLE "FlashcardReview" (
    id text NOT NULL,
    "cardId" text NOT NULL,
    "userId" text NOT NULL,
    "interval" integer DEFAULT 0 NOT NULL,
    repetition integer DEFAULT 0 NOT NULL,
    "easinessFactor" double precision DEFAULT 2.5 NOT NULL,
    "nextReviewDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "totalReviews" integer DEFAULT 0 NOT NULL,
    "failedReviews" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: GraphCommunity

CREATE TABLE "GraphCommunity" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    level text NOT NULL,
    summary text NOT NULL,
    algorithm text DEFAULT 'louvain'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: GraphCommunityMember

CREATE TABLE "GraphCommunityMember" (
    id text NOT NULL,
    "communityId" text NOT NULL,
    "nodeId" text NOT NULL
);

-- TABLE: GraphEdge

CREATE TABLE "GraphEdge" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "sourceId" text NOT NULL,
    "targetId" text NOT NULL,
    relation text NOT NULL,
    "citedPage" integer,
    "chapterTitle" text,
    "spanStart" integer,
    "spanEnd" integer,
    "qdrantPointId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: GraphNode

CREATE TABLE "GraphNode" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    type text NOT NULL,
    label text NOT NULL,
    description text NOT NULL,
    "firstPage" integer,
    "firstChapter" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: GraphNodeEmbedding

CREATE TABLE "GraphNodeEmbedding" (
    "nodeId" text NOT NULL,
    "bookId" text NOT NULL,
    vector double precision[],
    model text NOT NULL,
    dims integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: Invitation

CREATE TABLE "Invitation" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    email citext NOT NULL,
    role text,
    status text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "inviterId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: JoinRequest

CREATE TABLE "JoinRequest" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text NOT NULL,
    "requestedRole" "TenantRole" DEFAULT 'student'::"TenantRole" NOT NULL,
    message text,
    "proofDocument" text,
    status "JoinRequestStatus" DEFAULT 'pending'::"JoinRequestStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: LoginAttempt

CREATE TABLE "LoginAttempt" (
    id text NOT NULL,
    "userId" text NOT NULL,
    email citext NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    success boolean DEFAULT false NOT NULL,
    "failureReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: MediaAccess

CREATE TABLE "MediaAccess" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "resourceType" text NOT NULL,
    "resourceId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);

-- TABLE: MediaFile

CREATE TABLE "MediaFile" (
    id text NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    "s3Key" text NOT NULL,
    "s3Bucket" text NOT NULL,
    "cdnUrl" text,
    "encryptionKey" text,
    status text DEFAULT 'processing'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: MediaSettings

CREATE TABLE "MediaSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "s3Bucket" text NOT NULL,
    "cdnDomain" text,
    "defaultEncryption" boolean DEFAULT true NOT NULL,
    "allowedFormats" jsonb NOT NULL,
    "maxFileSize" integer NOT NULL,
    "adaptiveBitrate" boolean DEFAULT true NOT NULL,
    "bitrateSettings" jsonb,
    "storageLifecycle" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: MediaUpload

CREATE TABLE "MediaUpload" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "presignedUrl" text NOT NULL,
    "fileType" text NOT NULL,
    filename text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "errorMessage" text,
    "mediaFileId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: MediaVariant

CREATE TABLE "MediaVariant" (
    id text NOT NULL,
    "mediaFileId" text NOT NULL,
    quality text NOT NULL,
    bitrate integer,
    format text NOT NULL,
    "s3Key" text NOT NULL,
    "cdnUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: Notification

CREATE TABLE "Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "actionUrl" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: OtpVerification

CREATE TABLE "OtpVerification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type "OtpType" NOT NULL,
    destination citext NOT NULL,
    "hashedOtp" text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: PasswordResetToken

CREATE TABLE "PasswordResetToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);

-- TABLE: PersonalFile

CREATE TABLE "PersonalFile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "folderId" text,
    "isStarred" boolean DEFAULT false NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    color text,
    title text NOT NULL,
    author text,
    format text NOT NULL,
    "mimeType" text NOT NULL,
    "fileSize" integer NOT NULL,
    "storageKey" text NOT NULL,
    "coverUrl" text,
    "lastReadAt" timestamp(3) without time zone,
    progress double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);

-- TABLE: PersonalFolder

CREATE TABLE "PersonalFolder" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "parentId" text,
    name text NOT NULL,
    color text,
    "isStarred" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);

-- TABLE: PersonalReadingProgress

CREATE TABLE "PersonalReadingProgress" (
    id text NOT NULL,
    "personalFileId" text NOT NULL,
    "userId" text NOT NULL,
    "currentPage" integer DEFAULT 0 NOT NULL,
    "totalPagesRead" integer DEFAULT 0 NOT NULL,
    "timeSpentSeconds" integer DEFAULT 0 NOT NULL,
    "percentComplete" double precision DEFAULT 0 NOT NULL,
    "lastReadAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    bookmarks jsonb DEFAULT '[]'::jsonb NOT NULL,
    "readerSettings" jsonb DEFAULT '{}'::jsonb NOT NULL
);

-- TABLE: QuizAttempt

CREATE TABLE "QuizAttempt" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "itemId" text NOT NULL,
    answer text NOT NULL,
    correct boolean NOT NULL,
    "answeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: QuizItem

CREATE TABLE "QuizItem" (
    id text NOT NULL,
    "bookId" text NOT NULL,
    "chapterTitle" text NOT NULL,
    "conceptId" text,
    type text NOT NULL,
    prompt text NOT NULL,
    choices jsonb,
    answer text NOT NULL,
    "citedPage" integer,
    "spanStart" integer,
    "spanEnd" integer,
    "qdrantPointId" text,
    "qualityScore" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: ReadingAssignment

CREATE TABLE "ReadingAssignment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "bookId" text NOT NULL,
    title text NOT NULL,
    description text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    "teacherId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: ReadingProgress

CREATE TABLE "ReadingProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text,
    "bookId" text NOT NULL,
    "currentPage" integer DEFAULT 0 NOT NULL,
    "totalPagesRead" integer DEFAULT 0 NOT NULL,
    "timeSpentSeconds" integer DEFAULT 0 NOT NULL,
    "wordsRead" integer DEFAULT 0 NOT NULL,
    "percentComplete" double precision DEFAULT 0 NOT NULL,
    "lastReadAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "dailyProgress" jsonb DEFAULT '{}'::jsonb NOT NULL,
    bookmarks jsonb DEFAULT '[]'::jsonb NOT NULL,
    "readerSettings" jsonb DEFAULT '{}'::jsonb NOT NULL
);

-- TABLE: RefreshToken

CREATE TABLE "RefreshToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isRevoked" boolean DEFAULT false NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "replacedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ipAddress" text,
    "userAgent" text
);

-- TABLE: ResurfacingEvent

CREATE TABLE "ResurfacingEvent" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bookId" text NOT NULL,
    "conceptId" text NOT NULL,
    "scheduledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "sentAt" timestamp(3) without time zone,
    actioned boolean DEFAULT false NOT NULL
);

-- TABLE: Session

CREATE TABLE "Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: SimplifiedParagraph

CREATE TABLE "SimplifiedParagraph" (
    id text NOT NULL,
    "paragraphId" text NOT NULL,
    "targetLevel" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- TABLE: StudentAssignment

CREATE TABLE "StudentAssignment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "assignmentId" text NOT NULL,
    status "StudentAssignmentStatus" DEFAULT 'pending'::"StudentAssignmentStatus" NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: Tenant

CREATE TABLE "Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    domain text NOT NULL,
    type "TenantType" DEFAULT 'school'::"TenantType" NOT NULL,
    description text,
    location text,
    "logoUrl" text,
    branding jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "allowJoinRequests" boolean DEFAULT true NOT NULL,
    "isGlobalPublisher" boolean DEFAULT false NOT NULL,
    slug text,
    logo text,
    metadata text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);

-- TABLE: TenantInvitation

CREATE TABLE "TenantInvitation" (
    id text NOT NULL,
    email citext NOT NULL,
    token text NOT NULL,
    "tenantName" text NOT NULL,
    "tenantType" "TenantType" DEFAULT 'school'::"TenantType" NOT NULL,
    status "InvitationStatus" DEFAULT 'pending'::"InvitationStatus" NOT NULL,
    "invitedBy" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: TenantSettings

CREATE TABLE "TenantSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "allowStudentSignup" boolean DEFAULT false NOT NULL,
    "requireApproval" boolean DEFAULT true NOT NULL,
    "allowAnnotations" boolean DEFAULT true NOT NULL,
    "allowSharing" boolean DEFAULT true NOT NULL,
    "maxBorrowDays" integer DEFAULT 14 NOT NULL,
    "maxBooksPerUser" integer DEFAULT 5 NOT NULL,
    "allowRenewals" boolean DEFAULT true NOT NULL,
    "maxRenewals" integer DEFAULT 2 NOT NULL,
    "customDomain" text,
    "logoUrl" text,
    "primaryColor" text,
    "personalLibraryQuota" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: TenantSubscription

CREATE TABLE "TenantSubscription" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    tier text NOT NULL,
    price double precision,
    "billingCycle" text DEFAULT 'annual'::text NOT NULL,
    "maxUsers" integer,
    "maxBooks" integer,
    "maxStorage" integer,
    features jsonb,
    status "SubscriptionStatus" DEFAULT 'active'::"SubscriptionStatus" NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "autoRenew" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: User

CREATE TABLE "User" (
    id text NOT NULL,
    email citext NOT NULL,
    name text,
    password text,
    "googleId" text,
    "profilePicture" text,
    "authProvider" text DEFAULT 'email'::text NOT NULL,
    role "UserRole" DEFAULT 'student'::"UserRole" NOT NULL,
    "accountType" "AccountType" DEFAULT 'independent'::"AccountType" NOT NULL,
    "subscriptionTier" text,
    "subscriptionStatus" "SubscriptionStatus",
    "trialEndsAt" timestamp(3) without time zone,
    "subscriptionEndsAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    image text,
    "lastLoginAt" timestamp(3) without time zone,
    "onboardingCompleted" boolean DEFAULT false NOT NULL,
    "onboardingStep" integer DEFAULT 1 NOT NULL,
    phone text,
    "phoneVerified" boolean DEFAULT false NOT NULL,
    "pendingPhone" text,
    "pendingEmail" citext,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "lockReason" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "gradeLevel" integer
);

-- TABLE: UserStreak

CREATE TABLE "UserStreak" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text,
    "currentStreak" integer DEFAULT 0 NOT NULL,
    "longestStreak" integer DEFAULT 0 NOT NULL,
    "lastReadDate" timestamp(3) without time zone,
    "dailyGoalMinutes" integer DEFAULT 20 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: UserTenantMembership

CREATE TABLE "UserTenantMembership" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text NOT NULL,
    "organizationId" text,
    role "TenantRole" NOT NULL,
    status "MembershipStatus" DEFAULT 'active'::"MembershipStatus" NOT NULL,
    "assignedCollections" jsonb,
    metadata jsonb,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedBy" text,
    "approvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: VartaUsageLog

CREATE TABLE "VartaUsageLog" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    date date NOT NULL,
    "tokensUsed" integer DEFAULT 0 NOT NULL,
    "queryCount" integer DEFAULT 0 NOT NULL
);

-- TABLE: Verification

CREATE TABLE "Verification" (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: VocabularyItem

CREATE TABLE "VocabularyItem" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text,
    word text NOT NULL,
    definition text,
    context text,
    "bookId" text,
    "masteryLevel" integer DEFAULT 0 NOT NULL,
    "lastReviewed" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- TABLE: WordCache

CREATE TABLE "WordCache" (
    id text NOT NULL,
    word text NOT NULL,
    definition text,
    "hindiTranslation" text,
    pronunciation text,
    "partOfSpeech" text,
    example text,
    "wikiExtract" text,
    "wikiUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

-- CONSTRAINT: Account Account_pkey

ALTER TABLE ONLY "Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);

-- CONSTRAINT: AiFeatureUsage AiFeatureUsage_pkey

ALTER TABLE ONLY "AiFeatureUsage"
    ADD CONSTRAINT "AiFeatureUsage_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Annotation Annotation_pkey

ALTER TABLE ONLY "Annotation"
    ADD CONSTRAINT "Annotation_pkey" PRIMARY KEY (id);

-- CONSTRAINT: AudioBookmark AudioBookmark_pkey

ALTER TABLE ONLY "AudioBookmark"
    ADD CONSTRAINT "AudioBookmark_pkey" PRIMARY KEY (id);

-- CONSTRAINT: AudioChapter AudioChapter_pkey

ALTER TABLE ONLY "AudioChapter"
    ADD CONSTRAINT "AudioChapter_pkey" PRIMARY KEY (id);

-- CONSTRAINT: AudioProgress AudioProgress_pkey

ALTER TABLE ONLY "AudioProgress"
    ADD CONSTRAINT "AudioProgress_pkey" PRIMARY KEY (id);

-- CONSTRAINT: AudioSection AudioSection_pkey

ALTER TABLE ONLY "AudioSection"
    ADD CONSTRAINT "AudioSection_pkey" PRIMARY KEY (id);

-- CONSTRAINT: AudioTrack AudioTrack_pkey

ALTER TABLE ONLY "AudioTrack"
    ADD CONSTRAINT "AudioTrack_pkey" PRIMARY KEY (id);

-- CONSTRAINT: AuditLog AuditLog_pkey

ALTER TABLE ONLY "AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);

-- CONSTRAINT: BookCategoryOnBook BookCategoryOnBook_pkey

ALTER TABLE ONLY "BookCategoryOnBook"
    ADD CONSTRAINT "BookCategoryOnBook_pkey" PRIMARY KEY ("bookId", "categoryId");

-- CONSTRAINT: BookCategory BookCategory_pkey

ALTER TABLE ONLY "BookCategory"
    ADD CONSTRAINT "BookCategory_pkey" PRIMARY KEY (id);

-- CONSTRAINT: BookChatMessage BookChatMessage_pkey

ALTER TABLE ONLY "BookChatMessage"
    ADD CONSTRAINT "BookChatMessage_pkey" PRIMARY KEY (id);

-- CONSTRAINT: BookChunkMapping BookChunkMapping_pkey

ALTER TABLE ONLY "BookChunkMapping"
    ADD CONSTRAINT "BookChunkMapping_pkey" PRIMARY KEY (id);

-- CONSTRAINT: BookEmbeddingStatus BookEmbeddingStatus_pkey

ALTER TABLE ONLY "BookEmbeddingStatus"
    ADD CONSTRAINT "BookEmbeddingStatus_pkey" PRIMARY KEY (id);

-- CONSTRAINT: BookFormat BookFormat_pkey

ALTER TABLE ONLY "BookFormat"
    ADD CONSTRAINT "BookFormat_pkey" PRIMARY KEY (id);

-- CONSTRAINT: BookPage BookPage_pkey

ALTER TABLE ONLY "BookPage"
    ADD CONSTRAINT "BookPage_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Book Book_pkey

ALTER TABLE ONLY "Book"
    ADD CONSTRAINT "Book_pkey" PRIMARY KEY (id);

-- CONSTRAINT: BorrowedBook BorrowedBook_pkey

ALTER TABLE ONLY "BorrowedBook"
    ADD CONSTRAINT "BorrowedBook_pkey" PRIMARY KEY (id);

-- CONSTRAINT: ChapterDigest ChapterDigest_pkey

ALTER TABLE ONLY "ChapterDigest"
    ADD CONSTRAINT "ChapterDigest_pkey" PRIMARY KEY (id);

-- CONSTRAINT: ConceptMastery ConceptMastery_pkey

ALTER TABLE ONLY "ConceptMastery"
    ADD CONSTRAINT "ConceptMastery_pkey" PRIMARY KEY (id);

-- CONSTRAINT: DeviceToken DeviceToken_pkey

ALTER TABLE ONLY "DeviceToken"
    ADD CONSTRAINT "DeviceToken_pkey" PRIMARY KEY (id);

-- CONSTRAINT: EmailVerificationToken EmailVerificationToken_pkey

ALTER TABLE ONLY "EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY (id);

-- CONSTRAINT: FlashcardDeck FlashcardDeck_pkey

ALTER TABLE ONLY "FlashcardDeck"
    ADD CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY (id);

-- CONSTRAINT: FlashcardReview FlashcardReview_pkey

ALTER TABLE ONLY "FlashcardReview"
    ADD CONSTRAINT "FlashcardReview_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Flashcard Flashcard_pkey

ALTER TABLE ONLY "Flashcard"
    ADD CONSTRAINT "Flashcard_pkey" PRIMARY KEY (id);

-- CONSTRAINT: GraphCommunityMember GraphCommunityMember_pkey

ALTER TABLE ONLY "GraphCommunityMember"
    ADD CONSTRAINT "GraphCommunityMember_pkey" PRIMARY KEY (id);

-- CONSTRAINT: GraphCommunity GraphCommunity_pkey

ALTER TABLE ONLY "GraphCommunity"
    ADD CONSTRAINT "GraphCommunity_pkey" PRIMARY KEY (id);

-- CONSTRAINT: GraphEdge GraphEdge_pkey

ALTER TABLE ONLY "GraphEdge"
    ADD CONSTRAINT "GraphEdge_pkey" PRIMARY KEY (id);

-- CONSTRAINT: GraphNodeEmbedding GraphNodeEmbedding_pkey

ALTER TABLE ONLY "GraphNodeEmbedding"
    ADD CONSTRAINT "GraphNodeEmbedding_pkey" PRIMARY KEY ("nodeId");

-- CONSTRAINT: GraphNode GraphNode_pkey

ALTER TABLE ONLY "GraphNode"
    ADD CONSTRAINT "GraphNode_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Invitation Invitation_pkey

ALTER TABLE ONLY "Invitation"
    ADD CONSTRAINT "Invitation_pkey" PRIMARY KEY (id);

-- CONSTRAINT: JoinRequest JoinRequest_pkey

ALTER TABLE ONLY "JoinRequest"
    ADD CONSTRAINT "JoinRequest_pkey" PRIMARY KEY (id);

-- CONSTRAINT: LoginAttempt LoginAttempt_pkey

ALTER TABLE ONLY "LoginAttempt"
    ADD CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY (id);

-- CONSTRAINT: MediaAccess MediaAccess_pkey

ALTER TABLE ONLY "MediaAccess"
    ADD CONSTRAINT "MediaAccess_pkey" PRIMARY KEY (id);

-- CONSTRAINT: MediaFile MediaFile_pkey

ALTER TABLE ONLY "MediaFile"
    ADD CONSTRAINT "MediaFile_pkey" PRIMARY KEY (id);

-- CONSTRAINT: MediaSettings MediaSettings_pkey

ALTER TABLE ONLY "MediaSettings"
    ADD CONSTRAINT "MediaSettings_pkey" PRIMARY KEY (id);

-- CONSTRAINT: MediaUpload MediaUpload_pkey

ALTER TABLE ONLY "MediaUpload"
    ADD CONSTRAINT "MediaUpload_pkey" PRIMARY KEY (id);

-- CONSTRAINT: MediaVariant MediaVariant_pkey

ALTER TABLE ONLY "MediaVariant"
    ADD CONSTRAINT "MediaVariant_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Notification Notification_pkey

ALTER TABLE ONLY "Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);

-- CONSTRAINT: OtpVerification OtpVerification_pkey

ALTER TABLE ONLY "OtpVerification"
    ADD CONSTRAINT "OtpVerification_pkey" PRIMARY KEY (id);

-- CONSTRAINT: PasswordResetToken PasswordResetToken_pkey

ALTER TABLE ONLY "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);

-- CONSTRAINT: PersonalFile PersonalFile_pkey

ALTER TABLE ONLY "PersonalFile"
    ADD CONSTRAINT "PersonalFile_pkey" PRIMARY KEY (id);

-- CONSTRAINT: PersonalFolder PersonalFolder_pkey

ALTER TABLE ONLY "PersonalFolder"
    ADD CONSTRAINT "PersonalFolder_pkey" PRIMARY KEY (id);

-- CONSTRAINT: PersonalReadingProgress PersonalReadingProgress_pkey

ALTER TABLE ONLY "PersonalReadingProgress"
    ADD CONSTRAINT "PersonalReadingProgress_pkey" PRIMARY KEY (id);

-- CONSTRAINT: QuizAttempt QuizAttempt_pkey

ALTER TABLE ONLY "QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY (id);

-- CONSTRAINT: QuizItem QuizItem_pkey

ALTER TABLE ONLY "QuizItem"
    ADD CONSTRAINT "QuizItem_pkey" PRIMARY KEY (id);

-- CONSTRAINT: ReadingAssignment ReadingAssignment_pkey

ALTER TABLE ONLY "ReadingAssignment"
    ADD CONSTRAINT "ReadingAssignment_pkey" PRIMARY KEY (id);

-- CONSTRAINT: ReadingProgress ReadingProgress_pkey

ALTER TABLE ONLY "ReadingProgress"
    ADD CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY (id);

-- CONSTRAINT: RefreshToken RefreshToken_pkey

ALTER TABLE ONLY "RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);

-- CONSTRAINT: ResurfacingEvent ResurfacingEvent_pkey

ALTER TABLE ONLY "ResurfacingEvent"
    ADD CONSTRAINT "ResurfacingEvent_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Session Session_pkey

ALTER TABLE ONLY "Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);

-- CONSTRAINT: SimplifiedParagraph SimplifiedParagraph_pkey

ALTER TABLE ONLY "SimplifiedParagraph"
    ADD CONSTRAINT "SimplifiedParagraph_pkey" PRIMARY KEY (id);

-- CONSTRAINT: StudentAssignment StudentAssignment_pkey

ALTER TABLE ONLY "StudentAssignment"
    ADD CONSTRAINT "StudentAssignment_pkey" PRIMARY KEY (id);

-- CONSTRAINT: TenantInvitation TenantInvitation_pkey

ALTER TABLE ONLY "TenantInvitation"
    ADD CONSTRAINT "TenantInvitation_pkey" PRIMARY KEY (id);

-- CONSTRAINT: TenantSettings TenantSettings_pkey

ALTER TABLE ONLY "TenantSettings"
    ADD CONSTRAINT "TenantSettings_pkey" PRIMARY KEY (id);

-- CONSTRAINT: TenantSubscription TenantSubscription_pkey

ALTER TABLE ONLY "TenantSubscription"
    ADD CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Tenant Tenant_pkey

ALTER TABLE ONLY "Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);

-- CONSTRAINT: UserStreak UserStreak_pkey

ALTER TABLE ONLY "UserStreak"
    ADD CONSTRAINT "UserStreak_pkey" PRIMARY KEY (id);

-- CONSTRAINT: UserTenantMembership UserTenantMembership_pkey

ALTER TABLE ONLY "UserTenantMembership"
    ADD CONSTRAINT "UserTenantMembership_pkey" PRIMARY KEY (id);

-- CONSTRAINT: User User_pkey

ALTER TABLE ONLY "User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

-- CONSTRAINT: VartaUsageLog VartaUsageLog_pkey

ALTER TABLE ONLY "VartaUsageLog"
    ADD CONSTRAINT "VartaUsageLog_pkey" PRIMARY KEY (id);

-- CONSTRAINT: Verification Verification_pkey

ALTER TABLE ONLY "Verification"
    ADD CONSTRAINT "Verification_pkey" PRIMARY KEY (id);

-- CONSTRAINT: VocabularyItem VocabularyItem_pkey

ALTER TABLE ONLY "VocabularyItem"
    ADD CONSTRAINT "VocabularyItem_pkey" PRIMARY KEY (id);

-- CONSTRAINT: WordCache WordCache_pkey

ALTER TABLE ONLY "WordCache"
    ADD CONSTRAINT "WordCache_pkey" PRIMARY KEY (id);

-- INDEX: Account_userId_idx

CREATE INDEX "Account_userId_idx" ON "Account" USING btree ("userId");

-- INDEX: AiFeatureUsage_userId_date_idx

CREATE INDEX "AiFeatureUsage_userId_date_idx" ON "AiFeatureUsage" USING btree ("userId", date);

-- INDEX: AiFeatureUsage_userId_feature_date_key

CREATE UNIQUE INDEX "AiFeatureUsage_userId_feature_date_key" ON "AiFeatureUsage" USING btree ("userId", feature, date);

-- INDEX: Annotation_bookId_idx

CREATE INDEX "Annotation_bookId_idx" ON "Annotation" USING btree ("bookId");

-- INDEX: Annotation_shared_idx

CREATE INDEX "Annotation_shared_idx" ON "Annotation" USING btree (shared);

-- INDEX: Annotation_tenantId_idx

CREATE INDEX "Annotation_tenantId_idx" ON "Annotation" USING btree ("tenantId");

-- INDEX: Annotation_type_idx

CREATE INDEX "Annotation_type_idx" ON "Annotation" USING btree (type);

-- INDEX: Annotation_userId_idx

CREATE INDEX "Annotation_userId_idx" ON "Annotation" USING btree ("userId");

-- INDEX: AudioBookmark_sectionId_idx

CREATE INDEX "AudioBookmark_sectionId_idx" ON "AudioBookmark" USING btree ("sectionId");

-- INDEX: AudioBookmark_userId_idx

CREATE INDEX "AudioBookmark_userId_idx" ON "AudioBookmark" USING btree ("userId");

-- INDEX: AudioChapter_bookId_idx

CREATE INDEX "AudioChapter_bookId_idx" ON "AudioChapter" USING btree ("bookId");

-- INDEX: AudioProgress_bookId_idx

CREATE INDEX "AudioProgress_bookId_idx" ON "AudioProgress" USING btree ("bookId");

-- INDEX: AudioProgress_userId_bookId_key

CREATE UNIQUE INDEX "AudioProgress_userId_bookId_key" ON "AudioProgress" USING btree ("userId", "bookId");

-- INDEX: AudioProgress_userId_idx

CREATE INDEX "AudioProgress_userId_idx" ON "AudioProgress" USING btree ("userId");

-- INDEX: AudioSection_chapterId_idx

CREATE INDEX "AudioSection_chapterId_idx" ON "AudioSection" USING btree ("chapterId");

-- INDEX: AudioTrack_sectionId_idx

CREATE INDEX "AudioTrack_sectionId_idx" ON "AudioTrack" USING btree ("sectionId");

-- INDEX: AuditLog_action_createdAt_idx

CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog" USING btree (action, "createdAt" DESC);

-- INDEX: AuditLog_createdAt_idx

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog" USING btree ("createdAt" DESC);

-- INDEX: AuditLog_tenantId_createdAt_idx

CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog" USING btree ("tenantId", "createdAt" DESC);

-- INDEX: AuditLog_userId_createdAt_idx

CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog" USING btree ("userId", "createdAt" DESC);

-- INDEX: BookCategoryOnBook_bookId_idx

CREATE INDEX "BookCategoryOnBook_bookId_idx" ON "BookCategoryOnBook" USING btree ("bookId");

-- INDEX: BookCategoryOnBook_categoryId_idx

CREATE INDEX "BookCategoryOnBook_categoryId_idx" ON "BookCategoryOnBook" USING btree ("categoryId");

-- INDEX: BookCategory_name_key

CREATE UNIQUE INDEX "BookCategory_name_key" ON "BookCategory" USING btree (name);

-- INDEX: BookCategory_parentId_idx

CREATE INDEX "BookCategory_parentId_idx" ON "BookCategory" USING btree ("parentId");

-- INDEX: BookCategory_type_idx

CREATE INDEX "BookCategory_type_idx" ON "BookCategory" USING btree (type);

-- INDEX: BookChatMessage_tenantId_createdAt_idx

CREATE INDEX "BookChatMessage_tenantId_createdAt_idx" ON "BookChatMessage" USING btree ("tenantId", "createdAt" DESC);

-- INDEX: BookChatMessage_userId_bookId_idx

CREATE INDEX "BookChatMessage_userId_bookId_idx" ON "BookChatMessage" USING btree ("userId", "bookId");

-- INDEX: BookChatMessage_userId_idx

CREATE INDEX "BookChatMessage_userId_idx" ON "BookChatMessage" USING btree ("userId");

-- INDEX: BookChunkMapping_bookId_idx

CREATE INDEX "BookChunkMapping_bookId_idx" ON "BookChunkMapping" USING btree ("bookId");

-- INDEX: BookChunkMapping_bookPageId_idx

CREATE INDEX "BookChunkMapping_bookPageId_idx" ON "BookChunkMapping" USING btree ("bookPageId");

-- INDEX: BookChunkMapping_qdrantPointId_idx

CREATE INDEX "BookChunkMapping_qdrantPointId_idx" ON "BookChunkMapping" USING btree ("qdrantPointId");

-- INDEX: BookChunkMapping_qdrantPointId_key

CREATE UNIQUE INDEX "BookChunkMapping_qdrantPointId_key" ON "BookChunkMapping" USING btree ("qdrantPointId");

-- INDEX: BookChunkMapping_runId_idx

CREATE INDEX "BookChunkMapping_runId_idx" ON "BookChunkMapping" USING btree ("runId");

-- INDEX: BookEmbeddingStatus_bookId_key

CREATE UNIQUE INDEX "BookEmbeddingStatus_bookId_key" ON "BookEmbeddingStatus" USING btree ("bookId");

-- INDEX: BookEmbeddingStatus_status_idx

CREATE INDEX "BookEmbeddingStatus_status_idx" ON "BookEmbeddingStatus" USING btree (status);

-- INDEX: BookFormat_bookId_idx

CREATE INDEX "BookFormat_bookId_idx" ON "BookFormat" USING btree ("bookId");

-- INDEX: BookFormat_bookId_type_partIndex_key

CREATE UNIQUE INDEX "BookFormat_bookId_type_partIndex_key" ON "BookFormat" USING btree ("bookId", type, "partIndex");

-- INDEX: BookFormat_type_idx

CREATE INDEX "BookFormat_type_idx" ON "BookFormat" USING btree (type);

-- INDEX: BookPage_bookId_idx

CREATE INDEX "BookPage_bookId_idx" ON "BookPage" USING btree ("bookId");

-- INDEX: BookPage_bookId_pageIndex_key

CREATE UNIQUE INDEX "BookPage_bookId_pageIndex_key" ON "BookPage" USING btree ("bookId", "pageIndex");

-- INDEX: BookPage_tenantId_idx

CREATE INDEX "BookPage_tenantId_idx" ON "BookPage" USING btree ("tenantId");

-- INDEX: Book_accessTier_idx

CREATE INDEX "Book_accessTier_idx" ON "Book" USING btree ("accessTier");

-- INDEX: Book_available_idx

CREATE INDEX "Book_available_idx" ON "Book" USING btree (available);

-- INDEX: Book_catalogScope_idx

CREATE INDEX "Book_catalogScope_idx" ON "Book" USING btree ("catalogScope");

-- INDEX: Book_deletedAt_idx

CREATE INDEX "Book_deletedAt_idx" ON "Book" USING btree ("deletedAt");

-- INDEX: Book_format_idx

CREATE INDEX "Book_format_idx" ON "Book" USING btree (format);

-- INDEX: Book_genre_idx

CREATE INDEX "Book_genre_idx" ON "Book" USING btree (genre);

-- INDEX: Book_globalPublishStatus_idx

CREATE INDEX "Book_globalPublishStatus_idx" ON "Book" USING btree ("globalPublishStatus");

-- INDEX: Book_isbn_idx

CREATE INDEX "Book_isbn_idx" ON "Book" USING btree (isbn);

-- INDEX: Book_mediaFileId_key

CREATE UNIQUE INDEX "Book_mediaFileId_key" ON "Book" USING btree ("mediaFileId");

-- INDEX: Book_tenantId_idx

CREATE INDEX "Book_tenantId_idx" ON "Book" USING btree ("tenantId");

-- INDEX: BorrowedBook_bookId_idx

CREATE INDEX "BorrowedBook_bookId_idx" ON "BorrowedBook" USING btree ("bookId");

-- INDEX: BorrowedBook_dueDate_idx

CREATE INDEX "BorrowedBook_dueDate_idx" ON "BorrowedBook" USING btree ("dueDate");

-- INDEX: BorrowedBook_returnedAt_idx

CREATE INDEX "BorrowedBook_returnedAt_idx" ON "BorrowedBook" USING btree ("returnedAt");

-- INDEX: BorrowedBook_tenantId_idx

CREATE INDEX "BorrowedBook_tenantId_idx" ON "BorrowedBook" USING btree ("tenantId");

-- INDEX: BorrowedBook_userId_bookId_returnedAt_key

CREATE UNIQUE INDEX "BorrowedBook_userId_bookId_returnedAt_key" ON "BorrowedBook" USING btree ("userId", "bookId", "returnedAt");

-- INDEX: BorrowedBook_userId_idx

CREATE INDEX "BorrowedBook_userId_idx" ON "BorrowedBook" USING btree ("userId");

-- INDEX: ChapterDigest_bookId_chapterTitle_idx

CREATE INDEX "ChapterDigest_bookId_chapterTitle_idx" ON "ChapterDigest" USING btree ("bookId", "chapterTitle");

-- INDEX: ChapterDigest_bookId_chapterTitle_voicePair_key

CREATE UNIQUE INDEX "ChapterDigest_bookId_chapterTitle_voicePair_key" ON "ChapterDigest" USING btree ("bookId", "chapterTitle", "voicePair");

-- INDEX: ConceptMastery_userId_bookId_conceptId_key

CREATE UNIQUE INDEX "ConceptMastery_userId_bookId_conceptId_key" ON "ConceptMastery" USING btree ("userId", "bookId", "conceptId");

-- INDEX: ConceptMastery_userId_bookId_idx

CREATE INDEX "ConceptMastery_userId_bookId_idx" ON "ConceptMastery" USING btree ("userId", "bookId");

-- INDEX: DeviceToken_deviceToken_idx

CREATE INDEX "DeviceToken_deviceToken_idx" ON "DeviceToken" USING btree ("deviceToken");

-- INDEX: DeviceToken_deviceToken_key

CREATE UNIQUE INDEX "DeviceToken_deviceToken_key" ON "DeviceToken" USING btree ("deviceToken");

-- INDEX: DeviceToken_platform_idx

CREATE INDEX "DeviceToken_platform_idx" ON "DeviceToken" USING btree (platform);

-- INDEX: DeviceToken_userId_idx

CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken" USING btree ("userId");

-- INDEX: EmailVerificationToken_expiresAt_idx

CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken" USING btree ("expiresAt");

-- INDEX: EmailVerificationToken_isUsed_idx

CREATE INDEX "EmailVerificationToken_isUsed_idx" ON "EmailVerificationToken" USING btree ("isUsed");

-- INDEX: EmailVerificationToken_token_idx

CREATE INDEX "EmailVerificationToken_token_idx" ON "EmailVerificationToken" USING btree (token);

-- INDEX: EmailVerificationToken_token_key

CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken" USING btree (token);

-- INDEX: EmailVerificationToken_userId_idx

CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken" USING btree ("userId");

-- INDEX: FlashcardDeck_bookId_idx

CREATE INDEX "FlashcardDeck_bookId_idx" ON "FlashcardDeck" USING btree ("bookId");

-- INDEX: FlashcardDeck_tenantId_idx

CREATE INDEX "FlashcardDeck_tenantId_idx" ON "FlashcardDeck" USING btree ("tenantId");

-- INDEX: FlashcardDeck_userId_idx

CREATE INDEX "FlashcardDeck_userId_idx" ON "FlashcardDeck" USING btree ("userId");

-- INDEX: FlashcardReview_cardId_idx

CREATE INDEX "FlashcardReview_cardId_idx" ON "FlashcardReview" USING btree ("cardId");

-- INDEX: FlashcardReview_nextReviewDate_idx

CREATE INDEX "FlashcardReview_nextReviewDate_idx" ON "FlashcardReview" USING btree ("nextReviewDate");

-- INDEX: FlashcardReview_userId_cardId_key

CREATE UNIQUE INDEX "FlashcardReview_userId_cardId_key" ON "FlashcardReview" USING btree ("userId", "cardId");

-- INDEX: FlashcardReview_userId_idx

CREATE INDEX "FlashcardReview_userId_idx" ON "FlashcardReview" USING btree ("userId");

-- INDEX: Flashcard_deckId_idx

CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard" USING btree ("deckId");

-- INDEX: GraphCommunityMember_communityId_nodeId_key

CREATE UNIQUE INDEX "GraphCommunityMember_communityId_nodeId_key" ON "GraphCommunityMember" USING btree ("communityId", "nodeId");

-- INDEX: GraphCommunityMember_nodeId_idx

CREATE INDEX "GraphCommunityMember_nodeId_idx" ON "GraphCommunityMember" USING btree ("nodeId");

-- INDEX: GraphCommunity_bookId_level_idx

CREATE INDEX "GraphCommunity_bookId_level_idx" ON "GraphCommunity" USING btree ("bookId", level);

-- INDEX: GraphEdge_bookId_idx

CREATE INDEX "GraphEdge_bookId_idx" ON "GraphEdge" USING btree ("bookId");

-- INDEX: GraphEdge_sourceId_idx

CREATE INDEX "GraphEdge_sourceId_idx" ON "GraphEdge" USING btree ("sourceId");

-- INDEX: GraphEdge_targetId_idx

CREATE INDEX "GraphEdge_targetId_idx" ON "GraphEdge" USING btree ("targetId");

-- INDEX: GraphNodeEmbedding_bookId_idx

CREATE INDEX "GraphNodeEmbedding_bookId_idx" ON "GraphNodeEmbedding" USING btree ("bookId");

-- INDEX: GraphNode_bookId_label_idx

CREATE INDEX "GraphNode_bookId_label_idx" ON "GraphNode" USING btree ("bookId", label);

-- INDEX: GraphNode_bookId_type_idx

CREATE INDEX "GraphNode_bookId_type_idx" ON "GraphNode" USING btree ("bookId", type);

-- INDEX: Invitation_email_idx

CREATE INDEX "Invitation_email_idx" ON "Invitation" USING btree (email);

-- INDEX: Invitation_organizationId_idx

CREATE INDEX "Invitation_organizationId_idx" ON "Invitation" USING btree ("organizationId");

-- INDEX: JoinRequest_createdAt_idx

CREATE INDEX "JoinRequest_createdAt_idx" ON "JoinRequest" USING btree ("createdAt");

-- INDEX: JoinRequest_status_idx

CREATE INDEX "JoinRequest_status_idx" ON "JoinRequest" USING btree (status);

-- INDEX: JoinRequest_tenantId_idx

CREATE INDEX "JoinRequest_tenantId_idx" ON "JoinRequest" USING btree ("tenantId");

-- INDEX: JoinRequest_userId_idx

CREATE INDEX "JoinRequest_userId_idx" ON "JoinRequest" USING btree ("userId");

-- INDEX: LoginAttempt_createdAt_idx

CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt" USING btree ("createdAt");

-- INDEX: LoginAttempt_email_idx

CREATE INDEX "LoginAttempt_email_idx" ON "LoginAttempt" USING btree (email);

-- INDEX: LoginAttempt_ipAddress_idx

CREATE INDEX "LoginAttempt_ipAddress_idx" ON "LoginAttempt" USING btree ("ipAddress");

-- INDEX: LoginAttempt_success_idx

CREATE INDEX "LoginAttempt_success_idx" ON "LoginAttempt" USING btree (success);

-- INDEX: LoginAttempt_userId_idx

CREATE INDEX "LoginAttempt_userId_idx" ON "LoginAttempt" USING btree ("userId");

-- INDEX: MediaAccess_expiresAt_idx

CREATE INDEX "MediaAccess_expiresAt_idx" ON "MediaAccess" USING btree ("expiresAt");

-- INDEX: MediaAccess_resourceType_resourceId_idx

CREATE INDEX "MediaAccess_resourceType_resourceId_idx" ON "MediaAccess" USING btree ("resourceType", "resourceId");

-- INDEX: MediaAccess_token_idx

CREATE INDEX "MediaAccess_token_idx" ON "MediaAccess" USING btree (token);

-- INDEX: MediaAccess_token_key

CREATE UNIQUE INDEX "MediaAccess_token_key" ON "MediaAccess" USING btree (token);

-- INDEX: MediaAccess_userId_idx

CREATE INDEX "MediaAccess_userId_idx" ON "MediaAccess" USING btree ("userId");

-- INDEX: MediaFile_s3Key_idx

CREATE INDEX "MediaFile_s3Key_idx" ON "MediaFile" USING btree ("s3Key");

-- INDEX: MediaFile_status_idx

CREATE INDEX "MediaFile_status_idx" ON "MediaFile" USING btree (status);

-- INDEX: MediaSettings_tenantId_key

CREATE UNIQUE INDEX "MediaSettings_tenantId_key" ON "MediaSettings" USING btree ("tenantId");

-- INDEX: MediaUpload_expiresAt_idx

CREATE INDEX "MediaUpload_expiresAt_idx" ON "MediaUpload" USING btree ("expiresAt");

-- INDEX: MediaUpload_status_idx

CREATE INDEX "MediaUpload_status_idx" ON "MediaUpload" USING btree (status);

-- INDEX: MediaUpload_userId_idx

CREATE INDEX "MediaUpload_userId_idx" ON "MediaUpload" USING btree ("userId");

-- INDEX: MediaVariant_mediaFileId_idx

CREATE INDEX "MediaVariant_mediaFileId_idx" ON "MediaVariant" USING btree ("mediaFileId");

-- INDEX: MediaVariant_quality_idx

CREATE INDEX "MediaVariant_quality_idx" ON "MediaVariant" USING btree (quality);

-- INDEX: Notification_createdAt_idx

CREATE INDEX "Notification_createdAt_idx" ON "Notification" USING btree ("createdAt");

-- INDEX: Notification_isRead_idx

CREATE INDEX "Notification_isRead_idx" ON "Notification" USING btree ("isRead");

-- INDEX: Notification_type_idx

CREATE INDEX "Notification_type_idx" ON "Notification" USING btree (type);

-- INDEX: Notification_userId_idx

CREATE INDEX "Notification_userId_idx" ON "Notification" USING btree ("userId");

-- INDEX: OtpVerification_expiresAt_idx

CREATE INDEX "OtpVerification_expiresAt_idx" ON "OtpVerification" USING btree ("expiresAt");

-- INDEX: OtpVerification_userId_type_key

CREATE UNIQUE INDEX "OtpVerification_userId_type_key" ON "OtpVerification" USING btree ("userId", type);

-- INDEX: PasswordResetToken_expiresAt_idx

CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken" USING btree ("expiresAt");

-- INDEX: PasswordResetToken_isUsed_idx

CREATE INDEX "PasswordResetToken_isUsed_idx" ON "PasswordResetToken" USING btree ("isUsed");

-- INDEX: PasswordResetToken_token_idx

CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken" USING btree (token);

-- INDEX: PasswordResetToken_token_key

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken" USING btree (token);

-- INDEX: PasswordResetToken_userId_idx

CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken" USING btree ("userId");

-- INDEX: PersonalFile_userId_createdAt_idx

CREATE INDEX "PersonalFile_userId_createdAt_idx" ON "PersonalFile" USING btree ("userId", "createdAt" DESC);

-- INDEX: PersonalFile_userId_folderId_deletedAt_idx

CREATE INDEX "PersonalFile_userId_folderId_deletedAt_idx" ON "PersonalFile" USING btree ("userId", "folderId", "deletedAt");

-- INDEX: PersonalFile_userId_idx

CREATE INDEX "PersonalFile_userId_idx" ON "PersonalFile" USING btree ("userId");

-- INDEX: PersonalFile_userId_isStarred_idx

CREATE INDEX "PersonalFile_userId_isStarred_idx" ON "PersonalFile" USING btree ("userId", "isStarred");

-- INDEX: PersonalFolder_userId_isStarred_idx

CREATE INDEX "PersonalFolder_userId_isStarred_idx" ON "PersonalFolder" USING btree ("userId", "isStarred");

-- INDEX: PersonalFolder_userId_parentId_deletedAt_idx

CREATE INDEX "PersonalFolder_userId_parentId_deletedAt_idx" ON "PersonalFolder" USING btree ("userId", "parentId", "deletedAt");

-- INDEX: PersonalReadingProgress_personalFileId_key

CREATE UNIQUE INDEX "PersonalReadingProgress_personalFileId_key" ON "PersonalReadingProgress" USING btree ("personalFileId");

-- INDEX: PersonalReadingProgress_userId_idx

CREATE INDEX "PersonalReadingProgress_userId_idx" ON "PersonalReadingProgress" USING btree ("userId");

-- INDEX: QuizAttempt_itemId_idx

CREATE INDEX "QuizAttempt_itemId_idx" ON "QuizAttempt" USING btree ("itemId");

-- INDEX: QuizAttempt_userId_itemId_idx

CREATE INDEX "QuizAttempt_userId_itemId_idx" ON "QuizAttempt" USING btree ("userId", "itemId");

-- INDEX: QuizItem_bookId_chapterTitle_idx

CREATE INDEX "QuizItem_bookId_chapterTitle_idx" ON "QuizItem" USING btree ("bookId", "chapterTitle");

-- INDEX: QuizItem_conceptId_idx

CREATE INDEX "QuizItem_conceptId_idx" ON "QuizItem" USING btree ("conceptId");

-- INDEX: ReadingAssignment_bookId_idx

CREATE INDEX "ReadingAssignment_bookId_idx" ON "ReadingAssignment" USING btree ("bookId");

-- INDEX: ReadingAssignment_dueDate_idx

CREATE INDEX "ReadingAssignment_dueDate_idx" ON "ReadingAssignment" USING btree ("dueDate");

-- INDEX: ReadingAssignment_teacherId_idx

CREATE INDEX "ReadingAssignment_teacherId_idx" ON "ReadingAssignment" USING btree ("teacherId");

-- INDEX: ReadingAssignment_tenantId_idx

CREATE INDEX "ReadingAssignment_tenantId_idx" ON "ReadingAssignment" USING btree ("tenantId");

-- INDEX: ReadingProgress_tenantId_idx

CREATE INDEX "ReadingProgress_tenantId_idx" ON "ReadingProgress" USING btree ("tenantId");

-- INDEX: ReadingProgress_userId_bookId_key

CREATE UNIQUE INDEX "ReadingProgress_userId_bookId_key" ON "ReadingProgress" USING btree ("userId", "bookId");

-- INDEX: ReadingProgress_userId_idx

CREATE INDEX "ReadingProgress_userId_idx" ON "ReadingProgress" USING btree ("userId");

-- INDEX: RefreshToken_expiresAt_idx

CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken" USING btree ("expiresAt");

-- INDEX: RefreshToken_isRevoked_idx

CREATE INDEX "RefreshToken_isRevoked_idx" ON "RefreshToken" USING btree ("isRevoked");

-- INDEX: RefreshToken_token_idx

CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken" USING btree (token);

-- INDEX: RefreshToken_token_key

CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken" USING btree (token);

-- INDEX: RefreshToken_userId_idx

CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken" USING btree ("userId");

-- INDEX: ResurfacingEvent_bookId_idx

CREATE INDEX "ResurfacingEvent_bookId_idx" ON "ResurfacingEvent" USING btree ("bookId");

-- INDEX: ResurfacingEvent_conceptId_idx

CREATE INDEX "ResurfacingEvent_conceptId_idx" ON "ResurfacingEvent" USING btree ("conceptId");

-- INDEX: ResurfacingEvent_userId_sentAt_idx

CREATE INDEX "ResurfacingEvent_userId_sentAt_idx" ON "ResurfacingEvent" USING btree ("userId", "sentAt");

-- INDEX: Session_token_key

CREATE UNIQUE INDEX "Session_token_key" ON "Session" USING btree (token);

-- INDEX: Session_userId_idx

CREATE INDEX "Session_userId_idx" ON "Session" USING btree ("userId");

-- INDEX: SimplifiedParagraph_paragraphId_idx

CREATE INDEX "SimplifiedParagraph_paragraphId_idx" ON "SimplifiedParagraph" USING btree ("paragraphId");

-- INDEX: SimplifiedParagraph_paragraphId_targetLevel_key

CREATE UNIQUE INDEX "SimplifiedParagraph_paragraphId_targetLevel_key" ON "SimplifiedParagraph" USING btree ("paragraphId", "targetLevel");

-- INDEX: StudentAssignment_assignmentId_idx

CREATE INDEX "StudentAssignment_assignmentId_idx" ON "StudentAssignment" USING btree ("assignmentId");

-- INDEX: StudentAssignment_status_idx

CREATE INDEX "StudentAssignment_status_idx" ON "StudentAssignment" USING btree (status);

-- INDEX: StudentAssignment_userId_assignmentId_key

CREATE UNIQUE INDEX "StudentAssignment_userId_assignmentId_key" ON "StudentAssignment" USING btree ("userId", "assignmentId");

-- INDEX: StudentAssignment_userId_idx

CREATE INDEX "StudentAssignment_userId_idx" ON "StudentAssignment" USING btree ("userId");

-- INDEX: TenantInvitation_email_idx

CREATE INDEX "TenantInvitation_email_idx" ON "TenantInvitation" USING btree (email);

-- INDEX: TenantInvitation_email_key

CREATE UNIQUE INDEX "TenantInvitation_email_key" ON "TenantInvitation" USING btree (email);

-- INDEX: TenantInvitation_status_idx

CREATE INDEX "TenantInvitation_status_idx" ON "TenantInvitation" USING btree (status);

-- INDEX: TenantInvitation_token_idx

CREATE INDEX "TenantInvitation_token_idx" ON "TenantInvitation" USING btree (token);

-- INDEX: TenantInvitation_token_key

CREATE UNIQUE INDEX "TenantInvitation_token_key" ON "TenantInvitation" USING btree (token);

-- INDEX: TenantSettings_tenantId_key

CREATE UNIQUE INDEX "TenantSettings_tenantId_key" ON "TenantSettings" USING btree ("tenantId");

-- INDEX: TenantSubscription_endDate_idx

CREATE INDEX "TenantSubscription_endDate_idx" ON "TenantSubscription" USING btree ("endDate");

-- INDEX: TenantSubscription_status_idx

CREATE INDEX "TenantSubscription_status_idx" ON "TenantSubscription" USING btree (status);

-- INDEX: TenantSubscription_tenantId_idx

CREATE INDEX "TenantSubscription_tenantId_idx" ON "TenantSubscription" USING btree ("tenantId");

-- INDEX: Tenant_deletedAt_idx

CREATE INDEX "Tenant_deletedAt_idx" ON "Tenant" USING btree ("deletedAt");

-- INDEX: Tenant_domain_idx

CREATE INDEX "Tenant_domain_idx" ON "Tenant" USING btree (domain);

-- INDEX: Tenant_domain_key

CREATE UNIQUE INDEX "Tenant_domain_key" ON "Tenant" USING btree (domain);

-- INDEX: Tenant_isActive_idx

CREATE INDEX "Tenant_isActive_idx" ON "Tenant" USING btree ("isActive");

-- INDEX: Tenant_slug_key

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant" USING btree (slug);

-- INDEX: Tenant_type_idx

CREATE INDEX "Tenant_type_idx" ON "Tenant" USING btree (type);

-- INDEX: UserStreak_userId_idx

CREATE INDEX "UserStreak_userId_idx" ON "UserStreak" USING btree ("userId");

-- INDEX: UserStreak_userId_key

CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak" USING btree ("userId");

-- INDEX: UserTenantMembership_role_idx

CREATE INDEX "UserTenantMembership_role_idx" ON "UserTenantMembership" USING btree (role);

-- INDEX: UserTenantMembership_status_idx

CREATE INDEX "UserTenantMembership_status_idx" ON "UserTenantMembership" USING btree (status);

-- INDEX: UserTenantMembership_tenantId_idx

CREATE INDEX "UserTenantMembership_tenantId_idx" ON "UserTenantMembership" USING btree ("tenantId");

-- INDEX: UserTenantMembership_userId_idx

CREATE INDEX "UserTenantMembership_userId_idx" ON "UserTenantMembership" USING btree ("userId");

-- INDEX: UserTenantMembership_userId_tenantId_key

CREATE UNIQUE INDEX "UserTenantMembership_userId_tenantId_key" ON "UserTenantMembership" USING btree ("userId", "tenantId");

-- INDEX: User_accountType_idx

CREATE INDEX "User_accountType_idx" ON "User" USING btree ("accountType");

-- INDEX: User_email_idx

CREATE INDEX "User_email_idx" ON "User" USING btree (email);

-- INDEX: User_email_key

CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree (email);

-- INDEX: User_googleId_idx

CREATE INDEX "User_googleId_idx" ON "User" USING btree ("googleId");

-- INDEX: User_googleId_key

CREATE UNIQUE INDEX "User_googleId_key" ON "User" USING btree ("googleId");

-- INDEX: User_isActive_idx

CREATE INDEX "User_isActive_idx" ON "User" USING btree ("isActive");

-- INDEX: User_role_idx

CREATE INDEX "User_role_idx" ON "User" USING btree (role);

-- INDEX: User_subscriptionStatus_idx

CREATE INDEX "User_subscriptionStatus_idx" ON "User" USING btree ("subscriptionStatus");

-- INDEX: VartaUsageLog_tenantId_date_idx

CREATE INDEX "VartaUsageLog_tenantId_date_idx" ON "VartaUsageLog" USING btree ("tenantId", date);

-- INDEX: VartaUsageLog_tenantId_date_key

CREATE UNIQUE INDEX "VartaUsageLog_tenantId_date_key" ON "VartaUsageLog" USING btree ("tenantId", date);

-- INDEX: Verification_identifier_idx

CREATE INDEX "Verification_identifier_idx" ON "Verification" USING btree (identifier);

-- INDEX: VocabularyItem_tenantId_idx

CREATE INDEX "VocabularyItem_tenantId_idx" ON "VocabularyItem" USING btree ("tenantId");

-- INDEX: VocabularyItem_userId_idx

CREATE INDEX "VocabularyItem_userId_idx" ON "VocabularyItem" USING btree ("userId");

-- INDEX: VocabularyItem_userId_word_key

CREATE UNIQUE INDEX "VocabularyItem_userId_word_key" ON "VocabularyItem" USING btree ("userId", word);

-- INDEX: WordCache_word_idx

CREATE INDEX "WordCache_word_idx" ON "WordCache" USING btree (word);

-- INDEX: WordCache_word_key

CREATE UNIQUE INDEX "WordCache_word_key" ON "WordCache" USING btree (word);

-- FK CONSTRAINT: Account Account_userId_fkey

ALTER TABLE ONLY "Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AiFeatureUsage AiFeatureUsage_userId_fkey

ALTER TABLE ONLY "AiFeatureUsage"
    ADD CONSTRAINT "AiFeatureUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: Annotation Annotation_bookId_fkey

ALTER TABLE ONLY "Annotation"
    ADD CONSTRAINT "Annotation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: Annotation Annotation_userId_fkey

ALTER TABLE ONLY "Annotation"
    ADD CONSTRAINT "Annotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AudioBookmark AudioBookmark_sectionId_fkey

ALTER TABLE ONLY "AudioBookmark"
    ADD CONSTRAINT "AudioBookmark_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AudioSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AudioBookmark AudioBookmark_userId_fkey

ALTER TABLE ONLY "AudioBookmark"
    ADD CONSTRAINT "AudioBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AudioChapter AudioChapter_bookId_fkey

ALTER TABLE ONLY "AudioChapter"
    ADD CONSTRAINT "AudioChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AudioProgress AudioProgress_userId_fkey

ALTER TABLE ONLY "AudioProgress"
    ADD CONSTRAINT "AudioProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AudioSection AudioSection_chapterId_fkey

ALTER TABLE ONLY "AudioSection"
    ADD CONSTRAINT "AudioSection_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "AudioChapter"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AudioTrack AudioTrack_sectionId_fkey

ALTER TABLE ONLY "AudioTrack"
    ADD CONSTRAINT "AudioTrack_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AudioSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: AuditLog AuditLog_tenantId_fkey

ALTER TABLE ONLY "AuditLog"
    ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: AuditLog AuditLog_userId_fkey

ALTER TABLE ONLY "AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: BookCategoryOnBook BookCategoryOnBook_bookId_fkey

ALTER TABLE ONLY "BookCategoryOnBook"
    ADD CONSTRAINT "BookCategoryOnBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BookCategoryOnBook BookCategoryOnBook_categoryId_fkey

ALTER TABLE ONLY "BookCategoryOnBook"
    ADD CONSTRAINT "BookCategoryOnBook_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BookCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BookCategory BookCategory_parentId_fkey

ALTER TABLE ONLY "BookCategory"
    ADD CONSTRAINT "BookCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BookCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: BookChatMessage BookChatMessage_bookId_fkey

ALTER TABLE ONLY "BookChatMessage"
    ADD CONSTRAINT "BookChatMessage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BookChatMessage BookChatMessage_userId_fkey

ALTER TABLE ONLY "BookChatMessage"
    ADD CONSTRAINT "BookChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BookChunkMapping BookChunkMapping_bookId_fkey

ALTER TABLE ONLY "BookChunkMapping"
    ADD CONSTRAINT "BookChunkMapping_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BookChunkMapping BookChunkMapping_bookPageId_fkey

ALTER TABLE ONLY "BookChunkMapping"
    ADD CONSTRAINT "BookChunkMapping_bookPageId_fkey" FOREIGN KEY ("bookPageId") REFERENCES "BookPage"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: BookEmbeddingStatus BookEmbeddingStatus_bookId_fkey

ALTER TABLE ONLY "BookEmbeddingStatus"
    ADD CONSTRAINT "BookEmbeddingStatus_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BookFormat BookFormat_bookId_fkey

ALTER TABLE ONLY "BookFormat"
    ADD CONSTRAINT "BookFormat_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BookPage BookPage_bookId_fkey

ALTER TABLE ONLY "BookPage"
    ADD CONSTRAINT "BookPage_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: Book Book_mediaFileId_fkey

ALTER TABLE ONLY "Book"
    ADD CONSTRAINT "Book_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: Book Book_tenantId_fkey

ALTER TABLE ONLY "Book"
    ADD CONSTRAINT "Book_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BorrowedBook BorrowedBook_bookId_fkey

ALTER TABLE ONLY "BorrowedBook"
    ADD CONSTRAINT "BorrowedBook_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: BorrowedBook BorrowedBook_userId_fkey

ALTER TABLE ONLY "BorrowedBook"
    ADD CONSTRAINT "BorrowedBook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ChapterDigest ChapterDigest_bookId_fkey

ALTER TABLE ONLY "ChapterDigest"
    ADD CONSTRAINT "ChapterDigest_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ConceptMastery ConceptMastery_bookId_fkey

ALTER TABLE ONLY "ConceptMastery"
    ADD CONSTRAINT "ConceptMastery_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ConceptMastery ConceptMastery_conceptId_fkey

ALTER TABLE ONLY "ConceptMastery"
    ADD CONSTRAINT "ConceptMastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "GraphNode"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ConceptMastery ConceptMastery_userId_fkey

ALTER TABLE ONLY "ConceptMastery"
    ADD CONSTRAINT "ConceptMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: DeviceToken DeviceToken_userId_fkey

ALTER TABLE ONLY "DeviceToken"
    ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: EmailVerificationToken EmailVerificationToken_userId_fkey

ALTER TABLE ONLY "EmailVerificationToken"
    ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: FlashcardDeck FlashcardDeck_bookId_fkey

ALTER TABLE ONLY "FlashcardDeck"
    ADD CONSTRAINT "FlashcardDeck_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: FlashcardDeck FlashcardDeck_userId_fkey

ALTER TABLE ONLY "FlashcardDeck"
    ADD CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: FlashcardReview FlashcardReview_cardId_fkey

ALTER TABLE ONLY "FlashcardReview"
    ADD CONSTRAINT "FlashcardReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Flashcard"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: FlashcardReview FlashcardReview_userId_fkey

ALTER TABLE ONLY "FlashcardReview"
    ADD CONSTRAINT "FlashcardReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: Flashcard Flashcard_deckId_fkey

ALTER TABLE ONLY "Flashcard"
    ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphCommunityMember GraphCommunityMember_communityId_fkey

ALTER TABLE ONLY "GraphCommunityMember"
    ADD CONSTRAINT "GraphCommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "GraphCommunity"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphCommunityMember GraphCommunityMember_nodeId_fkey

ALTER TABLE ONLY "GraphCommunityMember"
    ADD CONSTRAINT "GraphCommunityMember_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "GraphNode"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphCommunity GraphCommunity_bookId_fkey

ALTER TABLE ONLY "GraphCommunity"
    ADD CONSTRAINT "GraphCommunity_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphEdge GraphEdge_bookId_fkey

ALTER TABLE ONLY "GraphEdge"
    ADD CONSTRAINT "GraphEdge_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphEdge GraphEdge_sourceId_fkey

ALTER TABLE ONLY "GraphEdge"
    ADD CONSTRAINT "GraphEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "GraphNode"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphEdge GraphEdge_targetId_fkey

ALTER TABLE ONLY "GraphEdge"
    ADD CONSTRAINT "GraphEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "GraphNode"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphNodeEmbedding GraphNodeEmbedding_nodeId_fkey

ALTER TABLE ONLY "GraphNodeEmbedding"
    ADD CONSTRAINT "GraphNodeEmbedding_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "GraphNode"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: GraphNode GraphNode_bookId_fkey

ALTER TABLE ONLY "GraphNode"
    ADD CONSTRAINT "GraphNode_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: Invitation Invitation_inviterId_fkey

ALTER TABLE ONLY "Invitation"
    ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: JoinRequest JoinRequest_tenantId_fkey

ALTER TABLE ONLY "JoinRequest"
    ADD CONSTRAINT "JoinRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: JoinRequest JoinRequest_userId_fkey

ALTER TABLE ONLY "JoinRequest"
    ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: LoginAttempt LoginAttempt_userId_fkey

ALTER TABLE ONLY "LoginAttempt"
    ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: MediaAccess MediaAccess_userId_fkey

ALTER TABLE ONLY "MediaAccess"
    ADD CONSTRAINT "MediaAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: MediaSettings MediaSettings_tenantId_fkey

ALTER TABLE ONLY "MediaSettings"
    ADD CONSTRAINT "MediaSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: MediaUpload MediaUpload_userId_fkey

ALTER TABLE ONLY "MediaUpload"
    ADD CONSTRAINT "MediaUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: MediaVariant MediaVariant_mediaFileId_fkey

ALTER TABLE ONLY "MediaVariant"
    ADD CONSTRAINT "MediaVariant_mediaFileId_fkey" FOREIGN KEY ("mediaFileId") REFERENCES "MediaFile"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: Notification Notification_userId_fkey

ALTER TABLE ONLY "Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: OtpVerification OtpVerification_userId_fkey

ALTER TABLE ONLY "OtpVerification"
    ADD CONSTRAINT "OtpVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: PasswordResetToken PasswordResetToken_userId_fkey

ALTER TABLE ONLY "PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: PersonalFile PersonalFile_folderId_fkey

ALTER TABLE ONLY "PersonalFile"
    ADD CONSTRAINT "PersonalFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "PersonalFolder"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: PersonalFile PersonalFile_userId_fkey

ALTER TABLE ONLY "PersonalFile"
    ADD CONSTRAINT "PersonalFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: PersonalFolder PersonalFolder_parentId_fkey

ALTER TABLE ONLY "PersonalFolder"
    ADD CONSTRAINT "PersonalFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PersonalFolder"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: PersonalFolder PersonalFolder_userId_fkey

ALTER TABLE ONLY "PersonalFolder"
    ADD CONSTRAINT "PersonalFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: PersonalReadingProgress PersonalReadingProgress_personalFileId_fkey

ALTER TABLE ONLY "PersonalReadingProgress"
    ADD CONSTRAINT "PersonalReadingProgress_personalFileId_fkey" FOREIGN KEY ("personalFileId") REFERENCES "PersonalFile"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: QuizAttempt QuizAttempt_itemId_fkey

ALTER TABLE ONLY "QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "QuizItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: QuizAttempt QuizAttempt_userId_fkey

ALTER TABLE ONLY "QuizAttempt"
    ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: QuizItem QuizItem_bookId_fkey

ALTER TABLE ONLY "QuizItem"
    ADD CONSTRAINT "QuizItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: QuizItem QuizItem_conceptId_fkey

ALTER TABLE ONLY "QuizItem"
    ADD CONSTRAINT "QuizItem_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "GraphNode"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: ReadingAssignment ReadingAssignment_bookId_fkey

ALTER TABLE ONLY "ReadingAssignment"
    ADD CONSTRAINT "ReadingAssignment_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ReadingAssignment ReadingAssignment_teacherId_fkey

ALTER TABLE ONLY "ReadingAssignment"
    ADD CONSTRAINT "ReadingAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ReadingAssignment ReadingAssignment_tenantId_fkey

ALTER TABLE ONLY "ReadingAssignment"
    ADD CONSTRAINT "ReadingAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ReadingProgress ReadingProgress_userId_fkey

ALTER TABLE ONLY "ReadingProgress"
    ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: RefreshToken RefreshToken_userId_fkey

ALTER TABLE ONLY "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ResurfacingEvent ResurfacingEvent_bookId_fkey

ALTER TABLE ONLY "ResurfacingEvent"
    ADD CONSTRAINT "ResurfacingEvent_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ResurfacingEvent ResurfacingEvent_conceptId_fkey

ALTER TABLE ONLY "ResurfacingEvent"
    ADD CONSTRAINT "ResurfacingEvent_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "GraphNode"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: ResurfacingEvent ResurfacingEvent_userId_fkey

ALTER TABLE ONLY "ResurfacingEvent"
    ADD CONSTRAINT "ResurfacingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: Session Session_userId_fkey

ALTER TABLE ONLY "Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: StudentAssignment StudentAssignment_assignmentId_fkey

ALTER TABLE ONLY "StudentAssignment"
    ADD CONSTRAINT "StudentAssignment_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReadingAssignment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: StudentAssignment StudentAssignment_userId_fkey

ALTER TABLE ONLY "StudentAssignment"
    ADD CONSTRAINT "StudentAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: TenantSettings TenantSettings_tenantId_fkey

ALTER TABLE ONLY "TenantSettings"
    ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: TenantSubscription TenantSubscription_tenantId_fkey

ALTER TABLE ONLY "TenantSubscription"
    ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: UserStreak UserStreak_userId_fkey

ALTER TABLE ONLY "UserStreak"
    ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: UserTenantMembership UserTenantMembership_tenantId_fkey

ALTER TABLE ONLY "UserTenantMembership"
    ADD CONSTRAINT "UserTenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: UserTenantMembership UserTenantMembership_userId_fkey

ALTER TABLE ONLY "UserTenantMembership"
    ADD CONSTRAINT "UserTenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- FK CONSTRAINT: VocabularyItem VocabularyItem_bookId_fkey

ALTER TABLE ONLY "VocabularyItem"
    ADD CONSTRAINT "VocabularyItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- FK CONSTRAINT: VocabularyItem VocabularyItem_userId_fkey

ALTER TABLE ONLY "VocabularyItem"
    ADD CONSTRAINT "VocabularyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE;
