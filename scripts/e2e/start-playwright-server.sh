#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3006}"

bun run build
exec bun run start -- --port "$PORT"
