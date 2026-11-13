# AI Music Lab MVP

Lokálna webová aplikácia na asynchrónne generovanie hudby cez ACE-Step 1.5. Zadáš prompt, voliteľne označíš inštrumentál, worker odošle úlohu na GPU, výsledok uloží ako MP3 a UI ho ponúkne na prehratie alebo stiahnutie.

## MVP scope

- prompt a voľba „inštrumentálna skladba“;
- asynchrónna fronta a stav `vo fronte → generujem → hotovo/zlyhalo`;
- ACE-Step 1.5 REST API na samostatnom GPU kontejnere;
- perzistentná Prisma SQLite databáza a lokálne MP3;
- zoznam posledných skladieb, browser prehrávač a download;
- bez registrácie, autentifikácie a verejného nasadenia.

Mimo MVP sú lyrics editor/generátor, pokročilé parametre, referenčné audio, retry/cancel, viac používateľov, objektové úložisko a verejný deployment.

## Spustenie jedným príkazom

Požiadavky: Linux x86_64, NVIDIA GPU a ovládač, Docker Engine + Compose plugin a NVIDIA Container Toolkit. Over GPU v Dockeri:

```bash
docker run --rm --gpus all nvidia/cuda:12.8.1-runtime-ubuntu22.04 nvidia-smi
```

Potom:

```bash
cp .env.example .env
docker compose up -d --build
```

Otvor `http://localhost:3000`. Prvý štart sťahuje model weights a môže trvať výrazne dlhšie než ďalšie štarty. Rýchlosť generovania závisí od GPU, VRAM, dĺžky a zvoleného modelu; repo preto nesľubuje univerzálny čas.

Pre GPU so 6–8 GB VRAM nastav v `.env` `ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-0.6B`. Oficiálny 4B default je vhodný pre podstatne väčšiu VRAM. Presná tabuľka výberu je v [oficiálnom README ACE-Step](https://github.com/ace-step/ACE-Step-1.5#-quick-start).

## Dáta a reinštalácia

Všetko potrebné na obnovu je pod `data/`:

- `data/app/app.db` — Prisma SQLite;
- `data/tracks/` — MP3 knižnica aplikácie;
- `data/acestep/checkpoints/` a `data/huggingface/` — model weights/cache;
- `data/acestep/output/` a `gradio_outputs/` — upstream výstupy.

Záloha (na chvíľu zastaví web a worker kvôli konzistentnej SQLite snímke):

```bash
./scripts/backup.sh
```

Na novom serveri nainštaluj GPU prerequisites, naklonuj repo, prenes archív a spusti:

```bash
./scripts/restore.sh /absolute/path/to/backup.tar.gz
docker compose up -d --build
```

Podrobný runbook je v [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Vývoj

```bash
corepack enable
pnpm install
cp .env.example .env
export DATABASE_URL='file:../../../data/app/dev.db'
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

Lokálny worker očakáva ACE-Step na `http://localhost:8001`; jednoduchšia cesta je používať celý Compose stack.

## Dokumentácia

- [Architektúra](docs/ARCHITECTURE.md)
- [Rozhodnutia a limity](docs/DECISIONS.md)
- [Prevádzka, backup a obnova](docs/OPERATIONS.md)
- [Overené ACE-Step zdroje](docs/ACE_STEP_VERIFICATION.md)

Pred komerčným použitím skontroluj licencie kódu a konkrétnych model weights a právny status generovaného obsahu.
