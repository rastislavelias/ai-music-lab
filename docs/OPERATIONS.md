# Prevádzka a obnova

## GPU prerequisites

Odporúčaný cieľ je Linux x86_64 s NVIDIA GPU. Nainštaluj kompatibilný NVIDIA driver, Docker Engine, Compose plugin a NVIDIA Container Toolkit. Reštartuj Docker a over `nvidia-smi` zvnútra CUDA kontajnera podľa README. Samotná existencia GPU na hoste nestačí.

ACE-Step uvádza aj CPU, MPS, ROCm a Intel XPU, ale oficiálny generický Dockerfile/Compose, z ktorého vychádza tento stack, je CUDA/NVIDIA cesta. Iné akcelerátory nie sú týmto Compose deklarované ako podporované.

## Prvý deployment

```bash
git clone <repo-url> ai-music-lab
cd ai-music-lab
cp .env.example .env
docker compose pull acestep
docker compose up -d --build
docker compose ps
docker compose logs -f acestep worker
```

`migrate` je jednorazová služba. Web a worker sa spustia až po úspešnej Prisma migrácii. Modely sa pri prvom štarte automaticky stiahnu do bind-mountov; sleduj disk a logy.

## Bežné príkazy

```bash
docker compose ps
docker compose logs -f web worker acestep
docker compose restart worker
docker compose down
docker compose up -d
```

Nepoužívaj `docker compose down -v` ako spôsob „čistenia“. Bind-mounty síce nie sú named volumes, ale taký návyk je nebezpečný pri budúcich zmenách.

## Záloha

`scripts/backup.sh` zastaví zapisujúce app procesy, zabalí celý `data/` a prípadný `.env`, vytvorí SHA-256 a web/worker znovu spustí. Archív skopíruj mimo servera. Testuj obnovu na separátnom stroji.

Pre menšiu zálohu možno vynechať `data/huggingface` a `data/acestep/checkpoints`; weights sa znovu stiahnu. Úplná offline/rýchla obnova ich však potrebuje.

## Preinštalovanie servera

1. Vytvor backup a prenes archív aj checksum mimo servera.
2. Nainštaluj OS, NVIDIA driver, Docker/Compose a NVIDIA Container Toolkit.
3. Over GPU cez CUDA kontajner.
4. Naklonuj presne ten istý Git commit/tag.
5. Prenes archív, over `sha256sum -c ...sha256` a spusti `scripts/restore.sh`.
6. Spusti `docker compose up -d --build`.
7. Over `docker compose ps`, healthcheck a prehratie starého MP3.

Restore skript staré `data/` nemaže: premenuje ich na `data.before-restore-<timestamp>`.

## Upgrade ACE-Step

1. Prečítaj upstream release notes a API zmeny.
2. Urob backup.
3. Zmeň `ACESTEP_IMAGE` v `.env` na konkrétny tag.
4. `docker compose pull acestep && docker compose up -d acestep worker`.
5. Over health, testovaciu generáciu a MP3 download.

Ak sa API kontrakt zmení, vráť pôvodný tag; model cache a app dáta ostávajú v bind-mountoch.
