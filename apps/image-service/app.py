import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any

import torch
from diffusers import DiffusionPipeline
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from starlette.responses import StreamingResponse


MODEL_ID = os.getenv("IMAGE_MODEL_ID", "Tongyi-MAI/Z-Image-Turbo")
STORAGE_ROOT = Path(os.getenv("IMAGE_STORAGE_PATH", "/data/tracks")).resolve()
OFFLOAD_MODE = os.getenv("IMAGE_OFFLOAD_MODE", "sequential")
DEFAULT_STEPS = int(os.getenv("IMAGE_INFERENCE_STEPS", "9"))
DEFAULT_GUIDANCE = float(os.getenv("IMAGE_GUIDANCE_SCALE", "0"))
FILE_NAME = re.compile(r"^[a-zA-Z0-9_-]+\.png$")

app = FastAPI(title="AI Music Lab image service", version="1.0")
pipeline: Any | None = None
pipeline_lock = asyncio.Lock()


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=10, max_length=3000)
    file_name: str = Field(min_length=5, max_length=180)
    seed: int = Field(ge=1, le=2_147_483_647)
    width: int = Field(default=1024, ge=512, le=1536, multiple_of=16)
    height: int = Field(default=576, ge=512, le=1024, multiple_of=16)


def load_pipeline() -> Any:
    global pipeline
    if pipeline is not None:
        return pipeline

    loaded = DiffusionPipeline.from_pretrained(
        MODEL_ID,
        torch_dtype=torch.bfloat16,
        use_safetensors=True,
    )
    if torch.cuda.is_available():
        if OFFLOAD_MODE == "model":
            loaded.enable_model_cpu_offload()
        else:
            loaded.enable_sequential_cpu_offload()
    else:
        loaded.to("cpu")
    if hasattr(loaded, "enable_vae_slicing"):
        loaded.enable_vae_slicing()
    if hasattr(loaded, "enable_vae_tiling"):
        loaded.enable_vae_tiling()
    pipeline = loaded
    return loaded


def generate_image(request: GenerateRequest) -> dict[str, Any]:
    if not FILE_NAME.fullmatch(request.file_name):
        raise HTTPException(status_code=400, detail="Invalid output filename.")
    STORAGE_ROOT.mkdir(parents=True, exist_ok=True)
    output = (STORAGE_ROOT / request.file_name).resolve()
    if output.parent != STORAGE_ROOT:
        raise HTTPException(status_code=400, detail="Invalid output path.")

    loaded = load_pipeline()
    generator = torch.Generator(device="cpu").manual_seed(request.seed)
    result = loaded(
        prompt=request.prompt,
        width=request.width,
        height=request.height,
        num_inference_steps=DEFAULT_STEPS,
        guidance_scale=DEFAULT_GUIDANCE,
        generator=generator,
    )
    result.images[0].save(output, format="PNG", optimize=True)
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    return {
        "file_name": request.file_name,
        "mime_type": "image/png",
        "model": MODEL_ID,
        "seed": request.seed,
        "width": request.width,
        "height": request.height,
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model": MODEL_ID,
        "model_loaded": pipeline is not None,
        "cuda": torch.cuda.is_available(),
        "offload_mode": OFFLOAD_MODE,
    }


@app.post("/generate")
async def generate(request: GenerateRequest) -> StreamingResponse:
    async def stream_result():
        try:
            async with pipeline_lock:
                task = asyncio.create_task(asyncio.to_thread(generate_image, request))
                while not task.done():
                    yield b" \n"
                    await asyncio.sleep(15)
                yield json.dumps(await task).encode("utf-8")
        except Exception as error:
            yield json.dumps({"error": str(error)}).encode("utf-8")

    # Long first-run model downloads can exceed HTTP clients' default five-minute
    # header timeout. Streaming harmless JSON whitespace keeps the request alive.
    return StreamingResponse(stream_result(), media_type="application/json")
