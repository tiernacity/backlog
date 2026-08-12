# done without arg fails on gitkeep

## Scope

### Goal

Fix `backlog done` (and the same latent case in `start`/`new` selection) so
that a single real in-progress increment is completed without an argument,
ignoring the `.gitkeep` sentinel files that keep empty state dirs tracked.

### Context

When an increment is the only item in `in-progress/`, running `backlog done`
with no argument fails: the directory always contains a `.gitkeep` file (0
bytes, seeded by `backlog init`), so `resolveOne` sees two files and reports
"multiple items in in-progress; specify one". The `.gitkeep` files are also
present in `todo/` and `done/`, so the same ambiguity hits `start` after `init`
and any solo-item selection.

### Done When

- [x] With a single in-progress increment (plus `.gitkeep`), `backlog done`
      with no argument moves it without error.
- [x] `backlog start` works for a single todo increment (plus `.gitkeep`).
- [x] `.gitkeep` sentinels are never offered as selectable increments or
      reported as ambiguous.
- [x] Multiple real increments still require an explicit argument.

### Uncertainties

- [x] Whether selection filtering should exclude only `.gitkeep` or any
      non-increment file in the state dirs.

      Resolved: filter by `idFromFile(f) !== null`, i.e. any non-increment
      file, not just `.gitkeep`.

### Notes and analysis

Bug: `resolveOne` in src/cli.ts counts `.gitkeep` as an item.

Known related issue: the three increments created in parallel in this session
collided on id 00004 (a `nextId` race) and were manually renumbered to
00004/00005/00006 - worth considering whether parallel drafting should be
serialised (see also shell-autocomplete increment).

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.

## Implementation Plan

### Phase 1

- [x] Add `selectable(files)` in src/cli.ts that filters to real increments
      (`idFromFile(f) !== null`), excluding `.gitkeep` and any other
      non-increment file.
- [x] Call `selectable` at the top of `resolveOne` so both query and solo
      selection ignore non-increment files.

#### Tests

- [x] `deno check mod.ts`, `deno test` (17 pass), `deno fmt --check`, `deno lint`.
- [x] Behavioral: `backlog done` (no arg) completed the solo in-progress
      increment alongside `.gitkeep`.
- [x] Behavioral: `backlog start` (no arg) errors on multiple real todo
      increments (correctly still requires explicit arg).

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
