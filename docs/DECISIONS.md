# Decisions and limitations

## Pinned upstream

Compose defaults to `ghcr.io/ace-step/ace-step-1.5:0.1.8`, an existing official release tag verified on 13 November 2026. `.env` permits a deliberate upgrade. `latest` is not the default because a reinstall could otherwise deploy a different version.

## Instrumental mode

The documented `/release_task` API has no dedicated `instrumental` boolean. The official API reference specifies the `[inst]` marker, so the worker sends `lyrics: "[inst]"` when instrumental mode is enabled and sends the user's lyrics for a vocal track. AI lyrics generation is outside the MVP.

## Image model and licence boundary

The default is the ungated `Tongyi-MAI/Z-Image-Turbo`. Its official model card declares Apache-2.0, describes a 6B-parameter model that fits within 16 GB consumer GPUs, and specifies nine scheduler steps (eight transformer evaluations) with zero guidance. It avoids requiring a Hugging Face account or token during a clean reinstall.

`black-forest-labs/FLUX.1-schnell` is also Apache-2.0 and permits commercial use, but its official Hugging Face download is gated behind account acceptance. It is therefore documented as an optional model rather than the unattended-install default. This is not the same model or licence as FLUX.1-dev.

The original `Qwen/Qwen-Image` is also Apache-2.0, but its published repository is approximately 58 GB and the model card describes a 20B-parameter model. It is not the practical default for the current 16 GB GPU. `Qwen/Qwen-Image-2.1` uses a separate Qwen Research licence and must not be treated as interchangeable with the Apache-2.0 release.

`IMAGE_MODEL_ID` keeps the service replaceable, but changing it is an explicit operator decision: review the new model's licence, memory requirements, API parameters, and output policy before deployment. An open model licence permits use of the model; it is not an originality guarantee or IP indemnity for every generated image.

## Single-GPU scheduling

ACE-Step remains loaded on the GPU. The image service therefore defaults to sequential CPU offload and the application worker only starts cover generation when no music job is queued or active. This favours reliability over cover speed on the RTX 4060 Ti 16 GB host. Video rendering is CPU-bound and is also serialised by the MVP worker to keep the queue behaviour simple.

## Timed lyrics

ACE-Step documents Auto-LRC, but the pinned official REST request model discards the latent tensors before exposing the result. The project builds a minimal, fail-fast overlay on the pinned official image that calls ACE-Step's native latent-attention aligner before those tensors are released and adds `lrc_text` to the existing result item. The worker removes non-sung section and performance directions before storing standard LRC. Estimated timing remains only as a fallback when native alignment is unavailable and for tracks generated before this integration.

## Explicit musical metadata

BPM written only in prose is not reliable. A verified generation requested approximately 104 BPM in its prompt but ACE-Step selected 48 BPM because the structured request left BPM unset. The create form therefore sends explicit BPM, duration, key/scale, and meter values to the official REST fields. These values are stored per track for provenance and are shown in the library.

## UI component foundation

The web application uses project-owned shadcn/ui primitives with the `new-york` style, Tailwind 4 semantic theme variables, and Radix accessibility primitives for select and checkbox behaviour. The components remain in the repository so the product can evolve its visual identity without depending on a runtime component service.

## Quality inference mode

The worker exposes `ACESTEP_INFERENCE_STEPS` and `ACESTEP_SHIFT` as deployment settings. Turbo remains the portable eight-step, shift-3 default in the repository, while a server may deliberately select the official `acestep-v15-xl-sft` checkpoint with 50 steps and shift 1 for slower final-quality auditions. Using Turbo's shift 3 with SFT can severely degrade the generated audio. Cover generation remains a separate user action so rejected audio variants do not consume image-generation time.

The 16 GB production host uses `acestep-v15-turbo` at eight steps and shift 3. Both XL-SFT and standard SFT produced severe audible artifacts with the current pinned ACE-Step release, including when standard SFT completed without memory pressure at approximately 10.5 GB VRAM. This isolates the failure to the non-Turbo inference path rather than storage, browser playback, or VRAM capacity. The SFT checkpoints remain installed for testing after an upstream fix but are not active.

## Persistence

The official Compose mounts `/app/checkpoints`, the Hugging Face cache, `/app/gradio_outputs`, and `/app/output`. This project preserves those container paths while using bind mounts under `data/`, allowing model data to be backed up alongside SQLite, FLAC masters, MP3 previews, PNG covers, and MP4 exports. The track library is mounted read-only at `/app/references`; the worker sends a relative `references/...` value because the upstream API intentionally rejects absolute audio paths.

The ACE-Step queue and job store are in memory. SQLite is therefore the source of truth for the user-facing library. Submitted `PROCESSING` jobs are polled again after a restart using their saved `task_id`. An ambiguous `SUBMITTING` job is marked failed after a crash to avoid silently creating a duplicate.

## MVP security boundary

The application has no authentication and port 3000 must not be exposed to the internet. Neither the ACE-Step API nor the image service is published to a host port. Audio, cover, and video endpoints only accept filenames stored in the database and verify that resolved paths remain inside `TRACK_STORAGE_PATH`.

`ACESTEP_API_KEY` is deliberately absent rather than present with an empty value. The pinned official image treats an empty value as authentication enabled, which makes local worker requests fail with HTTP 401.

## Intentionally deferred

- Retry, cancellation, and priorities.
- AI lyrics generation.
- A lyric timing editor for manual corrections.
- Animated covers, parallax, image LoRA, and visual profiles.
- Manual seed and model selector.
- Uploaded reference audio, source-audio cover, repaint, and stems.
- PostgreSQL, Redis, and S3.
- Observability, quotas, and public authentication.
