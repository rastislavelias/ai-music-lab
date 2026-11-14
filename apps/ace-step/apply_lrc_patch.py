"""Apply a fail-fast, version-specific patch to the pinned ACE-Step image."""

from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    target = Path(path)
    source = target.read_text()
    count = source.count(old)
    if count != expected:
        raise RuntimeError(
            f"Refusing to patch {path}: expected {expected} matches, found {count}."
        )
    target.write_text(source.replace(old, new))


blocking = "/app/acestep/api/job_blocking_generation.py"
replace_exact(
    blocking,
    "from acestep.api.job_analysis_runtime import maybe_handle_analysis_only_modes\n",
    "from acestep.api.job_analysis_runtime import maybe_handle_analysis_only_modes\n"
    "from acestep.api.ai_music_lab_lrc import generate_lrc\n",
)
replace_exact(
    blocking,
    '    lm_model_name = os.getenv("ACESTEP_LM_MODEL_PATH", "acestep-5Hz-lm-0.6B")\n'
    "    return build_generation_success_response(\n",
    '    lm_model_name = os.getenv("ACESTEP_LM_MODEL_PATH", "acestep-5Hz-lm-0.6B")\n'
    "    lrc_text = generate_lrc(\n"
    "        result=result,\n"
    "        dit_handler=selected_handler,\n"
    "        audio_duration=prepared_inputs.audio_duration,\n"
    "        vocal_language=req.vocal_language,\n"
    "        inference_steps=req.inference_steps,\n"
    "    )\n"
    "    response = build_generation_success_response(\n",
)
replace_exact(
    blocking,
    "        dit_model_name=selected_model_name,\n"
    "    )\n",
    "        dit_model_name=selected_model_name,\n"
    "    )\n"
    '    response["lrc_text"] = lrc_text\n'
    "    return response\n",
)

cache = "/app/acestep/api/jobs/local_cache_updates.py"
replace_exact(
    cache,
    '            dit_model = result.get("dit_model", "")\n',
    '            dit_model = result.get("dit_model", "")\n'
    '            lrc_text = result.get("lrc_text", "")\n',
)
replace_exact(
    cache,
    '                        "dit_model": dit_model,\n'
    '                        "progress": 1.0,\n',
    '                        "dit_model": dit_model,\n'
    '                        "lrc_text": lrc_text,\n'
    '                        "progress": 1.0,\n',
)
replace_exact(
    cache,
    '                    "dit_model": dit_model,\n'
    '                    "progress": 1.0,\n',
    '                    "dit_model": dit_model,\n'
    '                    "lrc_text": lrc_text,\n'
    '                    "progress": 1.0,\n',
)
