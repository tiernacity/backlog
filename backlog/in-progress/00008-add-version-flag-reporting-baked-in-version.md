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

- [ ] `backlog --version` prints a version string and exits 0.
- [ ] The compiled release binary reports the tag it was built from (baked at
      compile time via `--env`).
- [ ] In the source tree (`./backlog.sh --version`) it reports a dev fallback
      rather than failing.
- [ ] USAGE/help reflects the new `--version` flag and `SUBHELP` covers it.

### Uncertainties

- [ ] Exact dev fallback string when no version is baked. Prefer something
      useful over empty — likely `git describe` semantics or a literal `dev`.
- [ ] Whether `--version` should also be derivable from git at build time vs
      only from an explicit env input. Keep it simple: env input wins, git is
      only a dev fallback.

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

TODO: Fill in the Implementation Plan with phases and tests.

### Phase 1

- [ ] TODO

#### Tests

- [ ] TODO

### Guidance [hook: post-enter]

Work on this increment MUST be done in a topic branch. If the branch does not already exist
create it now. Commit the in-progress file to the branch.

Populate the implementation plan and tests, and keep them up-to-date as implementation
proceeds.

[hook: pre-exit] This increment is _ready for done_ only when:

- Done When criteria are met, and Test criteria are passing and demonstrated
- Commit the file before moving to done.
