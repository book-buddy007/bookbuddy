-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "hubWorkId" TEXT;

-- AlterTable
ALTER TABLE "AudioChapter" ADD COLUMN     "hubChapterId" TEXT;

-- AlterTable
ALTER TABLE "AudioSection" ADD COLUMN     "hubSectionId" TEXT;

-- AlterTable
ALTER TABLE "AudioTrack" ADD COLUMN     "hubFileId" TEXT;

-- CreateIndex
CREATE INDEX "Book_hubWorkId_idx" ON "Book"("hubWorkId");

-- CreateIndex
CREATE UNIQUE INDEX "AudioChapter_bookId_hubChapterId_key" ON "AudioChapter"("bookId", "hubChapterId");

-- CreateIndex
CREATE UNIQUE INDEX "AudioSection_chapterId_hubSectionId_key" ON "AudioSection"("chapterId", "hubSectionId");

-- Books already linked through the hub recorded the PDLMS work id on their streamed PDF/EPUB marker
-- (a BookFormat row with no file URL and metadata.hub.workId). Carry it across so they can be
-- unlinked and are found by the one-book-per-work check. Books with no marker are left alone.
UPDATE "Book" b
SET "hubWorkId" = f.metadata -> 'hub' ->> 'workId'
FROM "BookFormat" f
WHERE f."bookId" = b.id
  AND f."fileUrl" IS NULL
  AND b."hubWorkId" IS NULL
  AND f.metadata -> 'hub' ->> 'workId' IS NOT NULL;
