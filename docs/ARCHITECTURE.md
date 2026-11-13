# Architecture

## Job flow

1. The Next.js API snapshots the selected artist profile and writes one to four independently seeded `Track` rows with status `QUEUED`.
2. The worker atomically changes it to `SUBMITTING` and calls the official `POST /release_task` endpoint.
3. It saves the returned `task_id`, changes the status to `PROCESSING`, and periodically calls `POST /query_result`.
4. If the profile has a reference, the worker passes its read-only `/references/...` path to ACE-Step. The reference controls global acoustic character without becoming the structural source audio.
5. When ACE-Step reports status `1`, the worker downloads the lossless FLAC into `data/tracks` and derives a 192 kbps MP3 browser preview with FFmpeg.
6. The audio route supports HTTP byte ranges so the browser can seek without downloading the entire MP3 again. FLAC and MP3 are separately downloadable.
7. Only after atomically renaming the files does the worker set `COMPLETED`. The UI polls its own API and displays the player.

## Components

- `apps/web`: Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4, and server-side API routes.
- `apps/worker`: long-running Node worker; queue processing and polling stay outside the web process.
- `packages/db`: Prisma schema, client, and versioned SQLite migrations.
- `acestep`: official Python/CUDA image in API mode; it is neither forked nor repackaged.
- `data/` bind mounts: the single persistence and backup boundary.

## Artist-profile snapshots

An artist profile is mutable, but a queued track stores its own base prompt, reference-track ID, BPM, language, and seed. Editing a profile therefore affects future jobs without silently changing the provenance of existing jobs.

## Why the worker is separate from Next.js

Long GPU jobs and polling do not belong in a request lifecycle. A dedicated process continues after the browser closes, restarts independently, and can later be replaced with a more robust queue without changing the UI contract.

## Consistency

SQLite is sufficient for this local MVP: one worker and a low volume of web writes. Claiming uses a conditional `updateMany`, preventing two worker loops from taking the same `QUEUED` item. Horizontal scaling, multiple users, or a network filesystem would justify PostgreSQL and a dedicated queue.
