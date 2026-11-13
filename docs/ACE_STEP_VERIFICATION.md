# Overenie ACE-Step integrácie

Overené 13. novembra 2026 proti oficiálnemu repozitáru `ace-step/ACE-Step-1.5`.

## Fakty použité v implementácii

- Oficiálny release `v0.1.8` publikuje image `ghcr.io/ace-step/ace-step-1.5:0.1.8`.
- Oficiálny Compose používa `ACESTEP_MODE=api` pre REST server a port 8001.
- Asynchrónny kontrakt je `POST /release_task`, potom `POST /query_result` s `task_id_list`; stavy sú 0/1/2.
- `result` je JSON reťazec a pole obsahuje `file`, ktoré smeruje na `GET /v1/audio?path=...`.
- Dokumentované textové polia zahŕňajú `prompt`, `lyrics`, `thinking`, `audio_format` a `batch_size`.
- Inštrumentál sa reprezentuje lyrics markerom `[inst]`.
- API server používa in-memory queue/job store a má bežať s jedným uvicorn workerom.
- Oficiálne perzistentné mounty sú checkpoints, Hugging Face cache, gradio outputs a output.

## Primárne zdroje

- [ACE-Step 1.5 repository](https://github.com/ace-step/ACE-Step-1.5)
- [Release v0.1.8](https://github.com/ace-step/ACE-Step-1.5/releases/tag/v0.1.8)
- [Official docker-compose.yml](https://github.com/ace-step/ACE-Step-1.5/blob/main/docker-compose.yml)
- [Official Dockerfile](https://github.com/ace-step/ACE-Step-1.5/blob/main/Dockerfile)
- [Official REST API documentation](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md)
- [Official API server source](https://github.com/ace-step/ACE-Step-1.5/blob/main/acestep/api_server.py)

## Čo nie je tvrdené

Repo nehardcoduje čas generovania, minimálnu univerzálnu VRAM ani presnú veľkosť weights. Tieto hodnoty sa menia podľa modelu, backendu, offloadingu, dĺžky a hardvéru. Prevádzková dokumentácia preto odkazuje na aktuálnu upstream GPU tabuľku a vyhýba sa nepodloženému SLA.
