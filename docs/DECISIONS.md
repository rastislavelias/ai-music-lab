# Rozhodnutia a limity

## Pripnutý upstream

Compose predvolene používa `ghcr.io/ace-step/ace-step-1.5:0.1.8`, existujúci oficiálny release tag overený 13. novembra 2026. `.env` umožňuje zámerný upgrade. `latest` nie je default, pretože by po reinštalácii mohol priniesť inú verziu.

## Inštrumentál

ACE-Step API nemá v zdokumentovanom `/release_task` samostatný boolean `instrumental`. Oficiálna API referencia uvádza marker `[inst]`; worker preto pri zapnutej voľbe odosiela `lyrics: "[inst]"`. Pri vypnutej voľbe posiela prázdne lyrics. Generovanie vlastných lyrics nie je súčasťou MVP.

## Perzistencia

Oficiálny Compose mountuje `/app/checkpoints`, Hugging Face cache, `/app/gradio_outputs` a `/app/output`. Náš Compose zachováva rovnaké kontajnerové cesty, ale používa bind-mounty pod `data/`, aby sa dali kopírovať a zálohovať spolu s SQLite a finálnymi MP3.

ACE-Step queue/job store je podľa upstream zdrojov v pamäti. Zdroj pravdy pre používateľský zoznam je preto naša SQLite. Po reštarte sa už odoslané `PROCESSING` úlohy znova pollujú podľa uloženého `task_id`. Nejednoznačný stav `SUBMITTING` sa po páde označí ako zlyhaný, aby worker nevytvoril tichý duplikát.

## Bezpečnostná hranica MVP

Aplikácia nemá autentifikáciu a port 3000 sa nesmie sprístupniť internetu. ACE-Step API sa na host port vôbec nepublikuje. Audio endpoint povoľuje iba názov súboru uložený v DB a kontroluje, že výsledná cesta ostáva v `TRACK_STORAGE_PATH`.

## Úmyselne odložené

- retry/cancel a priority;
- lyrics editor alebo AI lyrics;
- duration/BPM/key/seed a model selector;
- referenčné audio, repaint, cover a stems;
- PostgreSQL/Redis/S3;
- observability, quotas a verejná autentifikácia.
