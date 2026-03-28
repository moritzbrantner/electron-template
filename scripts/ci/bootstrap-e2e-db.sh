#!/usr/bin/env bash
set -euo pipefail

MARKER_FILE="/tmp/next-template-e2e-db-bootstrap.started"
export POSTGRES_PORT="${POSTGRES_PORT:-55433}"

can_reach_database() {
  bun --eval '
    const { Client } = require("pg");

    if (!process.env.DATABASE_URL) {
      process.exit(1);
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
      await client.connect();
      await client.query("SELECT 1");
      process.exit(0);
    } catch {
      process.exit(1);
    } finally {
      await client.end().catch(() => undefined);
    }
  ' >/dev/null 2>&1
}

teardown() {
  if [[ -f "$MARKER_FILE" ]]; then
    echo "ℹ️ Cleaning up Postgres service started by bootstrap script..."
    docker compose down -v --remove-orphans
    rm -f "$MARKER_FILE"
    echo "✅ Postgres cleanup complete."
  else
    echo "ℹ️ No bootstrap-owned Postgres service detected; skipping cleanup."
  fi
}

if [[ "${1:-}" == "--teardown" ]]; then
  teardown
  exit 0
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${POSTGRES_PORT}/next_template?schema=public"
  echo "ℹ️ DATABASE_URL was not set; defaulting to docker-compose Postgres endpoint."
fi

if can_reach_database; then
  echo "ℹ️ Reusing already-reachable Postgres instance from DATABASE_URL."
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker is required to start Postgres for e2e DB bootstrap." >&2
    exit 1
  fi

  if ! docker compose config --services | grep -Fxq "postgres"; then
    echo "❌ docker-compose postgres service is not defined." >&2
    exit 1
  fi

  echo "ℹ️ Starting Postgres service for e2e bootstrap..."
  docker compose up -d postgres
  touch "$MARKER_FILE"
fi

export DB_BOOTSTRAP_TIMEOUT_SECONDS="${DB_BOOTSTRAP_TIMEOUT_SECONDS:-90}"

echo "ℹ️ Waiting for Postgres readiness..."
bun --eval '
  const timeoutSeconds = Number(process.env.DB_BOOTSTRAP_TIMEOUT_SECONDS ?? "90");
  const start = Date.now();

  while (Date.now() - start < timeoutSeconds * 1_000) {
    const { Client } = require("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
      await client.connect();
      await client.query("SELECT 1");
      console.log("✅ Postgres is ready.");
      process.exit(0);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  console.error(`❌ Timed out waiting for Postgres after ${timeoutSeconds}s.`);
  process.exit(1);
'

echo "ℹ️ Applying migrations..."
bun run db:migrate

echo "ℹ️ Seeding baseline e2e users..."
bun run db:seed:test-users

echo "✅ E2E DB bootstrap complete."
