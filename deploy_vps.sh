#!/usr/bin/env bash
set -euo pipefail

# Helper script to deploy on a VPS using docker compose.
# Usage: export GHCR_PAT=... && ./deploy_vps.sh

OWNER="<OWNER>"
COMPOSE_FILE="docker-compose.yml"

if [ -z "${GHCR_PAT:-}" ]; then
  echo "Please set GHCR_PAT environment variable with a Personal Access Token (read:packages)."
  exit 1
fi

echo "Logging in to ghcr.io as ${OWNER}..."
echo "$GHCR_PAT" | docker login ghcr.io -u "$OWNER" --password-stdin

echo "Pulling images..."
docker compose -f "$COMPOSE_FILE" pull

echo "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Done. Use 'docker compose ps' and 'docker compose logs -f' to inspect services."
