-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "spineContentItemId" TEXT;

-- CreateIndex
CREATE INDEX "Book_spineContentItemId_idx" ON "Book"("spineContentItemId");
