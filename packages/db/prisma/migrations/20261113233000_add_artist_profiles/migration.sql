CREATE TABLE "ArtistProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "basePrompt" TEXT NOT NULL DEFAULT '',
    "vocalLanguage" TEXT NOT NULL DEFAULT 'en',
    "bpm" INTEGER,
    "referenceTrackId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArtistProfile_referenceTrackId_fkey" FOREIGN KEY ("referenceTrackId") REFERENCES "Track" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

ALTER TABLE "Track" ADD COLUMN "profileId" TEXT REFERENCES "ArtistProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Track" ADD COLUMN "basePrompt" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Track" ADD COLUMN "referenceTrackId" TEXT;
ALTER TABLE "Track" ADD COLUMN "vocalLanguage" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Track" ADD COLUMN "bpm" INTEGER;
ALTER TABLE "Track" ADD COLUMN "seed" INTEGER;
ALTER TABLE "Track" ADD COLUMN "generationGroupId" TEXT;
ALTER TABLE "Track" ADD COLUMN "masterFileName" TEXT;
ALTER TABLE "Track" ADD COLUMN "masterMimeType" TEXT;

CREATE INDEX "ArtistProfile_createdAt_idx" ON "ArtistProfile"("createdAt");
CREATE INDEX "Track_profileId_createdAt_idx" ON "Track"("profileId", "createdAt");
CREATE INDEX "Track_generationGroupId_idx" ON "Track"("generationGroupId");
