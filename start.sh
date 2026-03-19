#!/usr/bin/env bash
# Start the full FinTrack stack locally:
#   - Postgres via Docker
#   - Backend (FastAPI/uvicorn)
#   - Frontend (Expo web)
#
# Usage: ./start.sh
# Stop:  press Ctrl-C (kills all three processes)

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Shutting down…"
  # Kill background process groups
  kill 0 2>/dev/null
  docker stop fintrack-postgres 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# ── Load .env ────────────────────────────────────────────────────
set -a
source "$ROOT_DIR/.env"
set +a

# ── Postgres (Docker) ───────────────────────────────────────────
echo "Starting Postgres…"
docker rm -f fintrack-postgres 2>/dev/null || true
docker run -d --name fintrack-postgres \
  -e POSTGRES_USER="${POSTGRES_USER:-postgres}" \
  -e POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}" \
  -e POSTGRES_DB="${POSTGRES_DB:-fintrack}" \
  -p 5432:5432 \
  postgres:17-alpine >/dev/null

echo "Waiting for Postgres to be ready…"
until docker exec fintrack-postgres pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
  sleep 0.5
done
echo "Postgres is ready."

# ── Backend ──────────────────────────────────────────────────────
echo "Starting backend on http://localhost:8000…"
(
  cd "$ROOT_DIR/backend"
  source venv/bin/activate
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) &

# ── Frontend ─────────────────────────────────────────────────────
echo "Starting frontend on http://localhost:8081…"
(
  cd "$ROOT_DIR/frontend"
  npx expo start --web --port 8081
) &

echo ""
echo "All services running. Press Ctrl-C to stop."
wait
