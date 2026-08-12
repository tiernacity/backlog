#!/usr/bin/env bash
# Dev wrapper: run backlog from source in this repo. The installed release
# binary on PATH is a separate thing — this script targets the working copy.
set -euo pipefail
cd "$(dirname "$0")"
exec deno run -A mod.ts "$@"