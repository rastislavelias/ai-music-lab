# Image model verification

Verified on 14 November 2026 from the model publishers' own model cards.

## Default: Z-Image-Turbo

- Official model: `Tongyi-MAI/Z-Image-Turbo`
- Model card: <https://huggingface.co/Tongyi-MAI/Z-Image-Turbo>
- Declared licence: Apache License 2.0
- Published size: 6B parameters; the publisher states that it fits within 16 GB consumer GPUs.
- Access: the official checkpoint is downloadable without a Hugging Face login or access token.

The service follows the official Turbo settings: nine scheduler steps, zero guidance, BF16, and 1024×576 output. Sequential CPU offload is enabled because ACE-Step shares the same 16 GB GPU. The first request downloads weights into `data/huggingface`; subsequent reinstalls can restore that directory from backup. Allow at least 40 GB of free disk for the image cache and download staging. The first verified download on the target host settled at approximately 31 GB; upstream revisions can change that figure.

## Optional: FLUX.1-schnell

- Official model: `black-forest-labs/FLUX.1-schnell`
- Model card: <https://huggingface.co/black-forest-labs/FLUX.1-schnell>
- Declared licence: Apache License 2.0
- The official card states that personal, scientific, and commercial use is permitted.
- This verification applies to FLUX.1-schnell. FLUX.1-dev is a different model with different terms and is intentionally not the default.
- The official Hugging Face repository is gated. A deployment must first accept its terms and provide an authorised `HF_TOKEN`; a model licence alone does not remove that access requirement.

If selected, set `IMAGE_MODEL_ID=black-forest-labs/FLUX.1-schnell`, `IMAGE_INFERENCE_STEPS=4`, and provide the token securely to the image service. Do not commit the token.

## Evaluated alternative: Qwen-Image

- Official model: `Qwen/Qwen-Image`
- Model card: <https://huggingface.co/Qwen/Qwen-Image>
- Declared licence: Apache License 2.0
- Published size: approximately 57.7 GB; model card identifies a 20B-parameter model.

The licence is suitable for a commercial evaluation, but the full model is a poor operational default for the current RTX 4060 Ti 16 GB host. It remains a future quality comparison, preferably on a larger GPU.

`Qwen/Qwen-Image-2.1` declares `qwen-research`, not Apache-2.0. It must undergo a separate legal and technical review before any commercial deployment.

## Output responsibility

A permissive model licence does not prove that a particular output is non-infringing. Production prompts must avoid artist names, copyrighted characters, logos, celebrity likenesses, and requests to reproduce a specific existing image. Keep the prompt, model ID, seed, and generated file together as provenance.
