# Operations and recovery

## GPU prerequisites

The recommended target is an x86_64 Linux server with an NVIDIA GPU. Install a compatible NVIDIA driver, Docker Engine, the Compose plugin, and NVIDIA Container Toolkit. Restart Docker and verify `nvidia-smi` from inside a CUDA container as shown in the README. A GPU visible on the host alone is not sufficient.

ACE-Step also documents CPU, MPS, ROCm, and Intel XPU support, but the official generic Dockerfile and Compose configuration used by this stack target CUDA/NVIDIA. This Compose file does not claim support for other accelerators.

## First deployment

```bash
git clone <repo-url> ai-music-lab
cd ai-music-lab
cp .env.example .env
docker compose pull acestep
docker compose up -d --build
docker compose ps
docker compose logs -f acestep imagegen worker
```

`migrate` is a one-shot service. Web and worker start only after Prisma migrations succeed. ACE-Step downloads models lazily when the first song is submitted. The image service starts quickly but downloads and loads its model lazily on the first cover request. Both use persistent bind mounts; monitor disk usage and logs.

Allow at least 40 GB of free disk for the image cache and temporary download data. The cover endpoint streams JSON whitespace while a long first-run download or generation is active. This is intentional: it prevents the default five-minute HTTP header timeout from incorrectly marking an otherwise healthy first cover as failed.

On the current 16 GB GPU, keep `IMAGE_OFFLOAD_MODE=sequential`. It is slower but minimises peak VRAM while ACE-Step remains loaded. If the first cover fails, inspect `docker compose logs imagegen worker` before retrying; do not repeatedly queue requests during a model download.

## Private Mac access

Keep the service bound to the server and create a local SSH tunnel from the Mac:

```bash
ssh -N -L 3300:127.0.0.1:3300 ai-node
```

This command matches a server configured with `WEB_PORT=3300`. Browse to `http://127.0.0.1:3300` on the Mac. For a different `WEB_PORT`, use that same port on both sides of the tunnel. Keep the SSH session open while using the application.

## Routine commands

```bash
docker compose ps
docker compose logs -f web worker acestep imagegen
docker compose restart worker
docker compose down
docker compose up -d
```

Do not use `docker compose down -v` as a routine cleanup command. Bind mounts are safe from that command today, but the habit becomes dangerous if named volumes are introduced later.

## Backup

`scripts/backup.sh` stops the application writers, archives `data/` plus an optional `.env`, creates a SHA-256 file, and restarts web and worker. Copy the archive off the server and test recovery on a separate machine.

For a smaller backup, `data/huggingface` and `data/acestep/checkpoints` may be omitted because weights can be downloaded again. This omits both the ACE-Step auxiliary cache and Z-Image-Turbo weights. A complete offline or fast recovery requires them.

## Reinstalling the server

1. Create a backup and move the archive and checksum off the server.
2. Install the OS, NVIDIA driver, Docker/Compose, and NVIDIA Container Toolkit.
3. Verify GPU access through a CUDA container.
4. Clone the exact same Git commit or tag.
5. Transfer the archive, run `sha256sum -c ...sha256`, and execute `scripts/restore.sh`.
6. Run `docker compose up -d --build`.
7. Verify `docker compose ps`, health checks, playback of an existing MP3, display of a PNG cover, and download of an MP4 export.

The restore script does not delete existing `data/`; it renames the directory to `data.before-restore-<timestamp>`.

## Upgrading ACE-Step

1. Read the upstream release notes and API changes.
2. Create a backup.
3. Set `ACESTEP_IMAGE` in `.env` to a specific tag.
4. Run `docker compose pull acestep && docker compose up -d acestep worker`.
5. Verify health, a test generation, and MP3 download.

If the API contract changed, restore the previous tag. The model cache and application data remain in bind mounts.

## Changing the image model

1. Read the model card and complete licence, not only the repository title.
2. Create a backup and confirm free disk/RAM/VRAM.
3. Set `IMAGE_MODEL_ID` and model-specific inference settings in `.env`.
4. Rebuild and restart with `docker compose up -d --build imagegen worker`.
5. Generate a non-production test cover and inspect logs, peak VRAM, output dimensions, and commercial-use restrictions.

The generic diffusers service does not guarantee that every pipeline accepts the same guidance and step parameters. A materially different model may require an adapter in `apps/image-service/app.py`.
