# Architecture

## Job flow

1. The Next.js API writes a new `Track` to SQLite with status `QUEUED`.
2. The worker atomically changes it to `SUBMITTING` and calls the official `POST /release_task` endpoint.
3. It saves the returned `task_id`, changes the status to `PROCESSING`, and periodically calls `POST /query_result`.
4. When ACE-Step reports status `1`, the worker parses the JSON string in `result`, follows the returned `/v1/audio?path=...` URL, and copies the MP3 into `data/tracks`.
5. Only after atomically renaming the `.part` file does it set `COMPLETED`. The UI polls its own API and displays the player.

## Components

- `apps/web`: Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4, and server-side API routes.
- `apps/worker`: long-running Node worker; queue processing and polling stay outside the web process.
- `packages/db`: Prisma schema, client, and versioned SQLite migrations.
- `acestep`: official Python/CUDA image in API mode; it is neither forked nor repackaged.
- `data/` bind mounts: the single persistence and backup boundary.

## Why the worker is separate from Next.js

Long GPU jobs and polling do not belong in a request lifecycle. A dedicated process continues after the browser closes, restarts independently, and can later be replaced with a more robust queue without changing the UI contract.

## Consistency

SQLite is sufficient for this local MVP: one worker and a low volume of web writes. Claiming uses a conditional `updateMany`, preventing two worker loops from taking the same `QUEUED` item. Horizontal scaling, multiple users, or a network filesystem would justify PostgreSQL and a dedicated queue.
