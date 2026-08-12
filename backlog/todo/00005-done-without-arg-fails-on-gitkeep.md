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

- [ ] With a single in-progress increment (plus `.gitkeep`), `backlog done`
      with no argument moves it without error.
- [ ] `backlog start` works for a single todo increment (plus `.gitkeep`).
- [ ] `.gitkeep` sentinels are never offered as selectable increments or
      reported as ambiguous.
- [ ] Multiple real increments still require an explicit argument.

### Uncertainties

- [ ] Whether selection filtering should exclude only `.gitkeep` or any
      non-increment file in the state dirs.

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
