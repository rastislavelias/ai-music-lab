"""Generate ACE-Step's native latent-attention LRC for REST API jobs."""

from typing import Any

from loguru import logger


def generate_lrc(
    *,
    result: Any,
    dit_handler: Any,
    audio_duration: float | None,
    vocal_language: str,
    inference_steps: int,
) -> str:
    try:
        extra = result.extra_outputs or {}
        pred_latents = extra.get("pred_latents")
        encoder_hidden_states = extra.get("encoder_hidden_states")
        encoder_attention_mask = extra.get("encoder_attention_mask")
        context_latents = extra.get("context_latents")
        lyric_token_ids = extra.get("lyric_token_idss")
        required = (
            pred_latents,
            encoder_hidden_states,
            encoder_attention_mask,
            context_latents,
            lyric_token_ids,
        )
        if any(value is None for value in required):
            logger.warning("[ai-music-lab-lrc] Generation tensors are missing")
            return ""
        duration = audio_duration
        if duration is None or duration <= 0:
            duration = pred_latents.shape[1] / 25.0
        aligned = dit_handler.get_lyric_timestamp(
            pred_latent=pred_latents[0:1],
            encoder_hidden_states=encoder_hidden_states[0:1],
            encoder_attention_mask=encoder_attention_mask[0:1],
            context_latents=context_latents[0:1],
            lyric_token_ids=lyric_token_ids[0:1],
            total_duration_seconds=float(duration),
            vocal_language=vocal_language or "en",
            inference_steps=int(inference_steps),
            seed=42,
        )
        if aligned.get("success"):
            lrc_text = aligned.get("lrc_text", "")
            logger.info("[ai-music-lab-lrc] Generated {} LRC characters", len(lrc_text))
            return lrc_text
        logger.warning("[ai-music-lab-lrc] Alignment failed: {}", aligned.get("error"))
    except Exception as error:
        logger.exception("[ai-music-lab-lrc] Unexpected alignment failure: {}", error)
    return ""
