#!/usr/bin/env bash
# Dev wrapper: run backlog from source. Resolves the source tree regardless of
# the caller's cwd, but leaves the process cwd untouched so the tool manages
# the backlog of whatever repo you run it from (same semantics as the release
# binary). The installed release binary on PATH is a separate thing.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec deno run -A "$DIR/mod.ts" "$@"