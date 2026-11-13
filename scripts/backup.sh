#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backup_dir="${project_root}/backups"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="${backup_dir}/ai-music-lab-${stamp}.tar.gz"

mkdir -p "${backup_dir}"
cd "${project_root}"

echo "Stopping database writers for a consistent snapshot..."
docker compose stop web worker
trap 'docker compose up -d web worker >/dev/null' EXIT

tar -czf "${archive}" data .env 2>/dev/null || tar -czf "${archive}" data
sha256sum "${archive}" > "${archive}.sha256"

echo "Backup created: ${archive}"
