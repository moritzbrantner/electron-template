#!/usr/bin/env bash
set -euo pipefail

find_node_candidate() {
  local candidate

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue

    if ! "$candidate" -e "process.exit(process.versions.bun ? 1 : 0)" >/dev/null 2>&1; then
      continue
    fi

    echo "$candidate"
    return 0
  done < <(which -a node nodejs 2>/dev/null | awk '!seen[$0]++')

  return 1
}

node_bin="$(find_node_candidate || true)"

if [ -z "$node_bin" ]; then
  echo "Unable to locate a real Node.js binary on PATH." >&2
  exit 1
fi

exec "$node_bin" "$@"
