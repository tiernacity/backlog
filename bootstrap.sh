#!/usr/bin/env sh
#
# Backlog bootstrap — seed a git repo with the backlog increment workflow.
#
# Fetch the skeleton for the current released backlog workflow from GitHub and
# drop it into ./backlog.
#
#   curl -sfL https://raw.githubusercontent.com/tiernacity/backlog/main/bootstrap.sh | sh
#
# Behaviour:
#   - refuses to modify a pre-existing `backlog/` directory
#   - otherwise fetches the release tarball and copies its bootstrap/ subtree
#     (backlog/ + AGENTS.backlog.md) into the current directory
#   - does NOT modify your AGENTS.md, but prints a suggestion to copy the guidance
#
set -eu

TARBALL_URL="https://codeload.github.com/tiernacity/backlog/tar.gz/main"
TARGET_DIR="backlog"

log() { printf '%s\n' "$*"; }

# Refuse to clobber an existing backlog/.
if [ -e "$TARGET_DIR" ]; then
  log "error: './$TARGET_DIR/' already exists; refusing to modify it." >&2
  log "If you want to re-seed, remove or rename it first." >&2
  exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM HUP

log "fetching the backlog skeleton from GitHub…"
curl -sfL "$TARBALL_URL" -o "$tmp/backlog.tar.gz" || {
  log "error: could not download the backlog workflow from $TARBALL_URL" >&2
  exit 1
}

mkdir -p "$tmp/src"
# Unroll the archive into a dedicated subdir, stripping the repo-root and
# bootstrap/ prefixes so the skeleton (backlog/ + AGENTS.backlog.md) lands
# there, then copy it into the current directory. We copy (rather than mv) so
# the seeded files get fresh permissions under the target's umask instead of
# inheriting the tarball/extraction ACLs. Keeping the tarball outside $tmp/src
# means the copy source sweeps up only the skeleton.
tar -xzf "$tmp/backlog.tar.gz" -C "$tmp/src" --strip-components=2 || {
  log "error: could not extract the downloaded archive." >&2
  exit 1
}

cp -R "$tmp/src/." .

log "Seeded backlog increment workflow in ./$TARGET_DIR"
log ""
log "Your AGENTS.md was left untouched. New guidance is in AGENTS.backlog.md"
log ""
log "Next:"
log "  1. Move the guidance from AGENTS.backlog.md to your AGENTS.md."
log "  2. Edit backlog/increment-template.md to tailor your workflow and/or increments"