# Architektúra

## Tok jednej úlohy

1. Next.js API zapíše nový `Track` do SQLite so stavom `QUEUED`.
2. Worker atomicky zmení stav na `SUBMITTING` a zavolá oficiálny `POST /release_task`.
3. Uloží `task_id`, nastaví `PROCESSING` a periodicky volá `POST /query_result`.
4. Pri stave `1` prečíta JSON reťazec `result`, použije vrátenú `/v1/audio?path=...` URL a MP3 skopíruje do `data/tracks`.
5. Až po atomickom premenovaní `.part` súboru nastaví `COMPLETED`. UI polluje vlastné API a zobrazí prehrávač.

## Komponenty

- `apps/web`: Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4, serverové API routes.
- `apps/worker`: dlhobežiaci Node worker; fronta a polling sú mimo web procesu.
- `packages/db`: Prisma schema, klient a verzované migrácie pre SQLite.
- `acestep`: oficiálny Python/CUDA image v API režime; nie je forknutý ani prebaľovaný.
- bind-mounty `data/`: jediná hranica perzistentných dát a zálohy.

## Prečo worker nie je v Next.js

Dlhé GPU úlohy a polling nepatria do request lifecycle. Samostatný proces prežije zatvorený browser, dá sa reštartovať nezávisle a neskôr nahradiť robustnejšou queue bez zmeny UI kontraktu.

## Konzistencia

SQLite je pre lokálne MVP dostačujúca: jeden worker a nízky počet webových zápisov. Claim používa podmienený `updateMany`, takže dve worker slučky nemajú prevziať tú istú `QUEUED` položku. Horizontálne škálovanie, multi-user prevádzka alebo sieťový filesystem sú dôvodom pre prechod na PostgreSQL a dedikovanú queue.
