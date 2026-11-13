# ACE-Step integration verification

Verified on 13 November 2026 against the official `ace-step/ACE-Step-1.5` repository.

## Facts used by the implementation

- Official release `v0.1.8` publishes `ghcr.io/ace-step/ace-step-1.5:0.1.8`.
- The official Compose file uses `ACESTEP_MODE=api` for the REST server on port 8001.
- The asynchronous contract is `POST /release_task`, followed by `POST /query_result` with `task_id_list`; status values are 0/1/2.
- `result` is a JSON string whose array contains a `file` value pointing to `GET /v1/audio?path=...`.
- Documented text fields include `prompt`, `lyrics`, `thinking`, `audio_format`, and `batch_size`.
- Instrumental generation uses the `[inst]` lyrics marker.
- The API server uses an in-memory queue/job store and must run with one uvicorn worker.
- Official persistent mounts cover checkpoints, Hugging Face cache, Gradio outputs, and output.
- In release `v0.1.8`, defining `ACESTEP_API_KEY` as an empty environment variable still enables the authentication dependency and causes unauthenticated requests to return HTTP 401. The local-only Compose stack therefore omits the variable entirely; setting a real key later requires adding it consistently to both ACE-Step and the worker.

## Primary sources

- [ACE-Step 1.5 repository](https://github.com/ace-step/ACE-Step-1.5)
- [Release v0.1.8](https://github.com/ace-step/ACE-Step-1.5/releases/tag/v0.1.8)
- [Official docker-compose.yml](https://github.com/ace-step/ACE-Step-1.5/blob/main/docker-compose.yml)
- [Official Dockerfile](https://github.com/ace-step/ACE-Step-1.5/blob/main/Dockerfile)
- [Official REST API documentation](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md)
- [Official API server source](https://github.com/ace-step/ACE-Step-1.5/blob/main/acestep/api_server.py)

## Claims deliberately not made

The repository does not hard-code a generation-time promise, a universal minimum VRAM figure, or an exact weight size. These vary with model, backend, offloading, duration, and hardware. The operations guide therefore links to the current upstream GPU table and avoids an unsupported SLA.
