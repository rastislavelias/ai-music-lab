# AI Music Lab MVP

A local web application for asynchronous music generation with ACE-Step 1.5. Artist profiles preserve a core sound, BPM, language, and a generated style-reference track. Each new generation keeps a lossless FLAC master and a seekable MP3 browser preview.

## MVP scope

- Production prompt plus user-provided lyrics, or an instrumental flag.
- Artist profiles with reusable core sound, BPM, language, and style reference.
- One, two, or four independently seeded variants per request.
- Asynchronous queue with `queued → generating → ready/failed` states.
- ACE-Step 1.5 REST API in a dedicated GPU container.
- Persistent Prisma SQLite database, lossless FLAC masters, and MP3 previews.
- Recent track list, seekable browser playback, FLAC/MP3 download, and “Use as style reference”.
- No registration, authentication, or public deployment.

AI lyrics generation, source-audio cover/repaint, retry/cancel, multiple users, object storage, and public deployment are intentionally outside the MVP.

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

Open `http://localhost:3000`. The first start downloads model weights and can take substantially longer than later starts. Generation speed depends on the GPU, VRAM, track length, and selected model; this repository does not claim a universal generation time.

For a GPU with 6–8 GB VRAM, set `ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B` in `.env`. The official 4B default requires substantially more VRAM. See the current selection table in the [official ACE-Step README](https://github.com/ace-step/ACE-Step-1.5#-quick-start).

## Server-only deployment and Mac access

The application, database, FLAC/MP3 files, model weights, and containers belong on the Linux GPU server. Access it from a Mac through an SSH local port forward:

```bash
ssh -N -L 3000:127.0.0.1:3000 <server-alias>
```

Then open `http://localhost:3000` on the Mac. Port 3000 does not need to be exposed to the LAN or internet.

## Data and server reinstall

Everything required for recovery lives under `data/` on the server:

- `data/app/app.db` — Prisma SQLite database.
- `data/tracks/` — lossless FLAC masters, MP3 previews, and files exposed read-only to ACE-Step as style references.
- `data/acestep/checkpoints/` and `data/huggingface/` — model weights and cache.
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

Before commercial use, review the code and model-weight licences and the legal status of generated material.
