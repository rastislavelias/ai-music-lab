CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "instrumental" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "upstreamTaskId" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "submittedAt" DATETIME,
    "completedAt" DATETIME
);

CREATE UNIQUE INDEX "Track_upstreamTaskId_key" ON "Track"("upstreamTaskId");
CREATE INDEX "Track_status_createdAt_idx" ON "Track"("status", "createdAt");
