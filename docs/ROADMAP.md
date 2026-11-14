# Product roadmap

This document records product directions, not committed release dates.

## Milestone: persistent voice identity

Create a consent-based voice profile that can preserve one user's vocal identity across songs. The onboarding flow should ask the user to record a guided script covering quiet, conversational, sustained, intense, and loud delivery, plus vowels, pitch movement, and short sung phrases. The system should validate recording quality and coverage before training or adapting a voice model.

The first technical evaluation should compare ACE-Step-compatible vocal LoRA or conditioning with a separate singing-voice model. A reusable voice must be evaluated for identity similarity, intelligibility, pitch range, emotional control, and leakage from training material. A music-style LoRA and a voice identity are separate assets and must not be presented as interchangeable.

Safety and product requirements:

- explicit, recorded consent from the person whose voice is used;
- no cloning of public figures or another person without verified permission;
- encrypted source recordings and derived voice assets;
- clear ownership, export, revocation, and permanent deletion controls;
- visible disclosure or provenance for generated vocals where appropriate;
- abuse reporting, rate limits, and an audit trail before any public launch;
- separate permission for team or company profiles and for commercial reuse.

## Milestone: persistent visual identity

Let a user create a visual profile in either of two ways:

1. upload a consented photo set of themselves, covering several angles, expressions, lighting conditions, and framing; or
2. create and approve a fully generated recurring character with no real-person source.

The profile can then drive consistent covers, thumbnails, lyric videos, posters, and campaign variants while allowing scene, wardrobe, lighting, and composition to change. The technical evaluation should compare reference-image adapters, face-identity adapters, and a small user-specific LoRA against the selected commercial-use image model.

Uploaded photos, face embeddings, LoRA weights, and generated character references are sensitive identity assets. They require the same consent, encryption, deletion, audit, and anti-impersonation boundary as voice profiles. The application must never silently train on uploaded media or reuse it outside the profile's declared purpose.

## Nearer-term quality milestones

- lyric timing editor for correcting native ACE-Step LRC cues;
- reusable production presets with explicit BPM, duration, key, and meter;
- arrangement and mix evaluation across generated variants;
- optional ACE-Step XL quality evaluation on hardware with sufficient VRAM;
- stem separation and vocal/instrument balance controls;
- visual profiles before automatic cover/video campaign generation.
