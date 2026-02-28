#!/usr/bin/env bash
set -euo pipefail

# ── Prereq checks ──────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $1 is required but not installed." >&2
    exit 1
  fi
}

check_cmd docker
check_cmd npm

# Verify Docker Compose (plugin or standalone)
if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  echo "Error: docker compose is required but not installed." >&2
  exit 1
fi

# ── First-run setup ────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -f data/pinescript-docs/bm25-index.json ]; then
  echo "Building RAG index..."
  npm run build-rag
fi

# ── Start dev environment ──────────────────────────────────────
echo "Starting dev environment..."
$COMPOSE -f docker-compose.dev.yml up --build "$@"
