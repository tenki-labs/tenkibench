#!/usr/bin/env bash
set -euo pipefail

# TenkiBench deploy script — runs on the VPS via GitHub Actions or manually over SSH.
# Idempotent. Safe to re-run.
#
# Layout on VPS:
#   /opt/tenkibench/
#   ├── repo/                # latest source (synced via rsync/scp from CI)
#   ├── env/.env.production  # secrets (mode 600)
#   └── data/                # nothing here for now (DB lives in shared supabase-db)
#
# Edge:
#   /opt/edge/sites/bench.tenki.no.caddy is synced from docker/edge/bench.tenki.no.caddy

REPO_DIR=/opt/tenkibench/repo
ENV_DIR=/opt/tenkibench/env
EDGE_DIR=/opt/edge

cd "$REPO_DIR"

echo "▸ Loading secrets"
source "$ENV_DIR/admin.env"

echo "▸ Building image"
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://bench.tenki.no \
  -f docker/Dockerfile \
  -t tenkibench-web:latest \
  -t "tenkibench-web:$(git rev-parse --short HEAD)" .

echo "▸ Ensuring shared edge network exists"
docker network inspect edge_net >/dev/null 2>&1 || docker network create edge_net

echo "▸ Setting up tenkibench database in shared Postgres"
# Idempotent: create the database only if missing
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db psql -U postgres -d postgres -tAc \
  "select 1 from pg_database where datname = 'tenkibench'" \
  | grep -q 1 || \
  docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db psql -U postgres -d postgres \
    -c "create database tenkibench"

echo "▸ Applying migrations"
for migration in 0001_init.sql; do
  if [ -f "migrations/$migration" ]; then
    docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
      psql -U postgres -d tenkibench -v ON_ERROR_STOP=1 < "migrations/$migration"
    echo "  ✓ $migration"
  fi
done

echo "▸ Bringing up tenkibench-web"
docker compose -f compose.yml up -d --force-recreate web

echo "▸ Attaching tenkibench network to shared edge Caddy"
docker network connect tenkibench edge-caddy-1 2>/dev/null || true

echo "▸ Syncing Caddy site fragment"
sudo cp docker/edge/bench.tenki.no.caddy "$EDGE_DIR/sites/bench.tenki.no.caddy"
sudo docker exec edge-caddy-1 caddy reload --config /etc/caddy/Caddyfile

echo "▸ Health check"
for i in 1 2 3 4 5 6; do
  if docker exec tenkibench-web-1 wget -qO- http://localhost:3000/api/healthz | grep -q '"status":"ok"'; then
    echo "  ✓ healthy"
    break
  fi
  echo "  ... attempt $i"
  sleep 5
done

echo "▸ External smoke test"
curl -sf -o /dev/null -w "  https://bench.tenki.no/api/healthz → %{http_code}\n" https://bench.tenki.no/api/healthz || true

echo "✓ Deploy complete"
