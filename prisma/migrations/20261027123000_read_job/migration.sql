-- AlterTable
ALTER TABLE "BillDraft" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'upload';
ALTER TABLE "BillDraft" ADD COLUMN "fileHash" TEXT;
ALTER TABLE "BillDraft" ADD COLUMN "transcript" TEXT;

-- CreateIndex
CREATE INDEX "BillDraft_fileHash_idx" ON "BillDraft"("fileHash");
