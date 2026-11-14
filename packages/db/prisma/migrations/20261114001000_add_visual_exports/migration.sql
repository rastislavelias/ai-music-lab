ALTER TABLE "Track" ADD COLUMN "lyricsLrc" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Track" ADD COLUMN "coverPrompt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Track" ADD COLUMN "coverStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Track" ADD COLUMN "coverFileName" TEXT;
ALTER TABLE "Track" ADD COLUMN "coverMimeType" TEXT;
ALTER TABLE "Track" ADD COLUMN "coverSeed" INTEGER;
ALTER TABLE "Track" ADD COLUMN "coverError" TEXT;
ALTER TABLE "Track" ADD COLUMN "videoStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Track" ADD COLUMN "videoFileName" TEXT;
ALTER TABLE "Track" ADD COLUMN "videoMimeType" TEXT;
ALTER TABLE "Track" ADD COLUMN "videoError" TEXT;

CREATE INDEX "Track_coverStatus_createdAt_idx" ON "Track"("coverStatus", "createdAt");
CREATE INDEX "Track_videoStatus_createdAt_idx" ON "Track"("videoStatus", "createdAt");
