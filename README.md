# AI Music Lab MVP

A local web application for asynchronous music generation with ACE-Step 1.5. Artist profiles preserve a core sound, BPM, language, and a generated style-reference track. Each new generation keeps a lossless FLAC master and a seekable MP3 browser preview. Completed tracks can receive locally generated 16:9 cover art, playback-synchronised lyrics, and a downloadable 1080p YouTube video.

## MVP scope

- Production prompt plus user-provided lyrics, or an instrumental flag.
- Artist profiles with reusable core sound, BPM, language, and style reference.
- One, two, or four independently seeded variants per request.
- Explicit BPM, key/scale, time signature, and duration controls for repeatable musical intent.
- Asynchronous queue with `queued → generating → ready/failed` states.
- ACE-Step 1.5 REST API in a dedicated GPU container.
- Persistent Prisma SQLite database, lossless FLAC masters, and MP3 previews.
- Local Z-Image-Turbo cover generation through an isolated, replaceable image service.
- Recent track list, visual player with timed lyrics, FLAC/MP3/PNG download, and “Use as style reference”.
- FFmpeg-rendered 1080p MP4 export with the cover, audio, and lyrics.
- A shadcn/ui component foundation with a project-owned dark theme.
- No registration, authentication, or public deployment.

AI lyrics generation, manual lyric-timing correction, animated image generation, source-audio cover/repaint, retry/cancel, multiple users, object storage, and public deployment are intentionally outside the MVP.

## Start with one command

Requirements: an x86_64 Linux server, NVIDIA GPU and driver, Docker Engine with the Compose plugin, and NVIDIA Container Toolkit. Verify GPU access from Docker:

```bash
docker run --rm --gpus all nvidia/cuda:12.8.1-runtime-ubuntu22.04 nvidia-smi
```

Then run:

```bash
cp .env.example .env
docker compose up -d --build
```

Open `http://localhost:3000`. The first music request downloads ACE-Step weights. The first cover request separately downloads Z-Image-Turbo weights and can take substantially longer than later requests. Generation speed depends on the GPU, VRAM, track length, selected models, and offload mode; this repository does not claim a universal generation time.

For a GPU with 6–8 GB VRAM, set `ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B` in `.env`. The official 4B default requires substantially more VRAM. See the current selection table in the [official ACE-Step README](https://github.com/ace-step/ACE-Step-1.5#-quick-start).

## Server-only deployment and Mac access

The application, database, audio/image/video files, model weights, and containers belong on the Linux GPU server. Access it from a Mac through an SSH local port forward:

```bash
ssh -N -L 3000:127.0.0.1:3000 <server-alias>
```

Then open `http://localhost:3000` on the Mac. Port 3000 does not need to be exposed to the LAN or internet.

## Data and server reinstall

Everything required for recovery lives under `data/` on the server:

- `data/app/app.db` — Prisma SQLite database.
- `data/tracks/` — FLAC masters, MP3 previews, PNG covers, MP4 exports, and files exposed read-only to ACE-Step as style references.
- `data/acestep/checkpoints/` and `data/huggingface/` — ACE-Step and image-model weights/cache.
- `data/acestep/output/` and `gradio_outputs/` — upstream output directories.

Create a backup (the script briefly stops web and worker processes for a consistent SQLite snapshot):

```bash
./scripts/backup.sh
```

On a reinstalled server, install the GPU prerequisites, clone the repository, transfer the archive, and run:

```bash
./scripts/restore.sh /absolute/path/to/backup.tar.gz
docker compose up -d --build
```

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for the full runbook.

## AI-assisted development

This project was developed through an AI-assisted workflow using OpenAI Codex. Codex was used to generate and revise application code, infrastructure, tests, and documentation.

I defined the product requirements, scope, constraints, and acceptance criteria; directed the architecture and implementation; reviewed generated changes; tested the system on the target NVIDIA GPU; diagnosed model, integration, and deployment failures; and validated the final behaviour. This repository demonstrates product definition, systems integration, technical decision-making, verification, and responsible AI-assisted software development. It is not presented as a claim that every line was written manually.

## Development

```bash
corepack enable
pnpm install
cp .env.example .env
export DATABASE_URL='file:../../../data/app/dev.db'
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

The local worker expects ACE-Step at `http://localhost:8001`; using the full Compose stack is normally simpler.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Decisions and limitations](docs/DECISIONS.md)
- [Operations, backup, and recovery](docs/OPERATIONS.md)
- [Verified ACE-Step sources](docs/ACE_STEP_VERIFICATION.md)
- [Image model licensing and runtime](docs/IMAGE_MODELS.md)
- [Product roadmap](docs/ROADMAP.md)

Before commercial use, review the code and model-weight licences and the legal status of generated material.
