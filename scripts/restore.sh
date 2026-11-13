#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Usage: $0 /absolute/path/to/ai-music-lab-YYYYMMDDTHHMMSSZ.tar.gz" >&2
  exit 2
fi

archive="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

tar -tzf "${archive}" >/dev/null
cd "${project_root}"
docker compose down

if [[ -d data ]]; then
  mv data "data.before-restore-${stamp}"
fi

tar -xzf "${archive}"
echo "Restore complete. Previous data, if present, is in data.before-restore-${stamp}."
echo "Start with: docker compose up -d --build"
