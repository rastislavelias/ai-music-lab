ARG ACESTEP_BASE_IMAGE=ghcr.io/ace-step/ace-step-1.5:0.1.8
FROM ${ACESTEP_BASE_IMAGE}

COPY apps/ace-step/ai_music_lab_lrc.py /app/acestep/api/ai_music_lab_lrc.py
COPY apps/ace-step/apply_lrc_patch.py /tmp/apply_lrc_patch.py
RUN /app/.venv/bin/python3 /tmp/apply_lrc_patch.py && rm /tmp/apply_lrc_patch.py
