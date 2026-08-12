# add --version flag reporting baked-in version

## Scope

### Goal

Support `backlog --version` so the tool reports the release version it was
built from. The version is baked into the compiled binary at build time; in
development (source tree) it reports a sensible dev fallback.

### Context

There is no `backlog --version` today: `unknown command: --version` falls
through to help and exits 1. We are preparing a v0.1.0 release and the compiled
release binaries must report that version. Deno compile supports embedding an
env file (`--env "<file>"`) whose values become the default runtime env of the
binary, readable via `Deno.env.get`. The release workflow already runs
`deno compile` with `--include` for templates, so an env file is a natural
addition.

### Done When

- [x] `backlog --version` prints a version string and exits 0.
- [x] The compiled release binary reports the tag it was built from (baked at
      compile time via `--env`).
- [x] In the source tree (`./backlog.sh --version`) it reports a dev fallback
      rather than failing.
- [x] USAGE/help reflects the new `--version` flag and `SUBHELP` covers it.

### Uncertainties

- [x] Exact dev fallback string when no version is baked. Prefer something
      useful over empty — likely `git describe` semantics or a literal `dev`.

      Resolved: when `BACKLOG_VERSION` is unset, fall back to
      `git describe --tags --always --dirty`; if git fails, `unknown`.
- [x] Whether `--version` should also be derivable from git at build time vs
      only from an explicit env input. Keep it simple: env input wins, git is
      only a dev fallback.

      Resolved: `BACKLOG_VERSION` (baked) wins; git is only a dev fallback.

### Notes and analysis

Verified `deno compile --env=file` bakes values into the binary's default env;
runtime env vars override the baked default. Use a `.env`-style file
(`BACKLOG_VERSION=v0.1.0`). The release.yml build step can write it on the fly.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.

## Implementation Plan

### Phase 1

- [x] Add `version()` helper in src/cli.ts that prefers baked
      `BACKLOG_VERSION` env, else `git describe --tags --always --dirty`.
- [x] Handle `--version` and `version` in `run()` before the switch: print
      version, exit 0.
- [x] Document `--version` in USAGE and add `--version`/`version` entries to
      `SUBHELP`.
- [x] release.yml writes `.env.backlog` (`BACKLOG_VERSION=<tag minus v>`)
      and passes `--env="$PWD/.env.backlog"` to `deno compile`.

#### Tests

- [x] `deno task check` passes (17 tests, fmt, lint, check).
- [x] Dev: `./backlog.sh --version` reports `git describe` (dev fallback).
- [x] Compiled: binary built with `--env` reports the baked version (`0.1.0`)
      and still runs normal commands (help verified).
- [x] Verified `--env` equals-form + absolute path bakes correctly; runtime
      env can override.

### Guidance [hook: post-enter]

Work on this increment MUST be done in a topic branch. If the branch does not already exist
create it now. Commit the in-progress file to the branch.

Populate the implementation plan and tests, and keep them up-to-date as implementation
proceeds.

[hook: pre-exit] This increment is _ready for done_ only when:

- Done When criteria are met, and Test criteria are passing and demonstrated
- Commit the file before moving to done.

## Guidance [hook: post-enter]

This increment is _done_ on its topic branch. To integrate into `main`
with human approval required before merging:

- After the `done` file is committed on the topic branch, get approval to merge.
- The user/agent then merges with `--no-ff` into `main`:
  `git switch main && git merge --no-ff <branch>`
- Then remove the feature branch
- MUST: get approval before merging into `main`.
- `main` only receives an increment via `merge --no-ff`.
