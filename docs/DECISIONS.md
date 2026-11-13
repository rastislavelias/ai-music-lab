# Decisions and limitations

## Pinned upstream

Compose defaults to `ghcr.io/ace-step/ace-step-1.5:0.1.8`, an existing official release tag verified on 13 November 2026. `.env` permits a deliberate upgrade. `latest` is not the default because a reinstall could otherwise deploy a different version.

## Instrumental mode

The documented `/release_task` API has no dedicated `instrumental` boolean. The official API reference specifies the `[inst]` marker, so the worker sends `lyrics: "[inst]"` when instrumental mode is enabled and an empty lyrics value otherwise. AI lyrics generation is outside the MVP.

## Persistence

The official Compose mounts `/app/checkpoints`, the Hugging Face cache, `/app/gradio_outputs`, and `/app/output`. This project preserves those container paths while using bind mounts under `data/`, allowing model data to be backed up alongside SQLite and final MP3 files.

The ACE-Step queue and job store are in memory. SQLite is therefore the source of truth for the user-facing library. Submitted `PROCESSING` jobs are polled again after a restart using their saved `task_id`. An ambiguous `SUBMITTING` job is marked failed after a crash to avoid silently creating a duplicate.

## MVP security boundary

The application has no authentication and port 3000 must not be exposed to the internet. The ACE-Step API is not published to a host port. The audio endpoint only accepts a filename stored in the database and verifies that the resolved path remains inside `TRACK_STORAGE_PATH`.

## Intentionally deferred

- Retry, cancellation, and priorities.
- Lyrics editor or AI lyrics.
- Duration, BPM, key, seed, and model selector.
- Reference audio, repaint, cover, and stems.
- PostgreSQL, Redis, and S3.
- Observability, quotas, and public authentication.
