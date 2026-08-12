# Ensure `init` creates `.gitkeep` files in empty state dirs

## Scope

### Goal

Have `backlog init` create an empty `.gitkeep` file inside each state directory
(`todo/`, `in-progress/`, `done/`), so they are tracked by git and survive fresh
clones — removing the need to add `.gitkeep` by hand after `init`.

### Context

`backlog init` currently creates the three state directories with `mkdir`, but
git does not track empty directories. When a user commits the structure created
by `init`, the state dirs vanish on a fresh clone unless the user manually adds
a guard file (this repo needed `.gitkeep` added by hand during setup). The fix:
create a `.gitkeep` file in each state dir during `init`, mirroring the ensure-dir
behaviour and keeping `init` idempotent.

### Done When

- [x] `backlog init` creates `backlog/todo/.gitkeep`, `backlog/in-progress/.gitkeep`,
      and `backlog/done/.gitkeep`.
- [x] Re-running `backlog init` when the `.gitkeep` files exist is a no-op for them
      (idempotent, no error, no overwrite).
- [x] An existing `.gitkeep` with user content is left unchanged.
- [x] Templates are still seeded as before.

### Uncertainties

- [ ] Should the guard file be named `.gitkeep` (git convention) vs a documented
      alternative? We'll follow convention: `.gitkeep`.
- [ ] Should `init` emit a line about creating `.gitkeep`? Likely yes, matching
      the `[ok] created …` pattern.

### Notes and analysis

- `initCmd()` in `src/cli.ts` loops the state dirs and already prints
  `[ok] created backlog/<state>/`; add `.gitkeep` creation in the same loop.
- Use `writeText` (empty content) guarded by `exists()` to keep idempotency:
  skip if present so user-provided content is untouched.
- Only create `.gitkeep` when not inside... actually unconditional is fine; git
  tracks it once committed. Name is conventional.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

Workflow — semi-linear `main`:
- This increment will live on a topic branch; do not commit it to `main`.
- `main` only ever receives an increment via `merge --no-ff` (see done step).
- A topic branch is created on `start`; if you already put this increment on a
  branch, that branch is kept going forward.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.

## Implementation Plan

Add a `.gitkeep` guard file in each state dir during `init`, guarded by
`exists()` so it is idempotent and never overwrites user content.

### Phase 1

- [x] Add STORE_GITKEEP(state) helper: `backlog/<state>/.gitkeep`
- [x] In initCmd()'s state-dir loop, create `.gitkeep` (empty) unless present

#### Tests

- [x] Manual: init in a fresh repo creates all three `.gitkeep` files
- [x] Manual: re-run init leaves existing `.gitkeep` untouched (idempotent)
- [x] Manual: a `.gitkeep` with user content is preserved
- [x] `deno check`, `deno lint`, `deno fmt --check`, `deno test` all pass

### Guidance [hook: post-enter]

This increment is now on a topic branch; work continues on that branch only.
Do not commit to `main`.

Create the branch covering the moved increment file (unless it already lives
on a branch), commit the move, then work through the Done When checklist and
the Implementation Plan, committing as you go.

- MUST: the increment is committed, on a branch other than `main`.
- The user MAY have already created the branch and committed the file.

[hook: pre-exit] This increment is _ready for done_ only when:
- Done When criteria are met, and Test criteria are passing and demonstrated;
- the increment is committed on a branch (not `main`).

Commit the file before moving to done.
