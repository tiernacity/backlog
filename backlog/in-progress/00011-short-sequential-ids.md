# Short sequential ids

## Scope

### Goal

Drop the fixed 5-digit zero-padded increment ids for short, unpadded sequential
numbers (1, 2, … 10, 11) so ids are quick to type and read, while keeping
numeric sorting and lifecycle semantics (`start`, `done`, `list`) intact.

### Context

Feedback on v0.2.0: `00005` is very slow to type. Current naming is always
`NNNNN-slug.md`, a fixed 5-digit zero-padded plate from `padId`. This couples
drafting convenience (a sequential plate) to a hard-for-humans representation.
We want the same sorted sequential semantics with a shorter token: files become
`1-foo.md`, `2-bar.md`, … `10-baz.md`, sorting numerically (bash example given:
`ls -1 | sort -n`).

Key compatibility constraint: `idFromFile` already parses a leading `(\d+)-`
and `Number()`s it, and `nextId`/`recentDone`/`list` all operate on the parsed
numeric id — so an unpadded `10-` parses to `10` exactly like `00010-` does
today. The file-*name* changes, but every parsed-authoritative code path is
already numeric. The main work is changing what we *write* for a new file, and
checking nothing else does string-width assumptions (padding, leading-zeros,
`localeCompare` on the prefix).

### Done When

- [ ] `backlog new foo` produces `1-foo.md`, then `2-bar.md`, `10-baz.md` at the
      right boundaries (no leading zeros, correct lexicographic-vs-numeric
      split handled by the numeric sort).
- [ ] `backlog start 5` and `backlog done 5` (etc.) select by the short id.
- [ ] `backlog list` orders short ids numerically (1, 2, … 10, 11) — not
      lexicographically (which would put 10 before 2).
- [ ] Existing already-padded files (`00003-...`) are still parsed, sortable,
      and selectable alongside new short ones (mixed-prefix tolerance).
- [ ] Any reference to `padId`/`fileName` width assumptions is audited and, if
      intended, updated (e.g. `padId` may become obsolete or a no-op).
- [ ] **In this repo**, retrospectively rename our existing increment files —
      todo, in-progress, and done — from padded (`00004-tmdb.md`) to short
      (`4-tmdb.md`) ids via `git mv`, so this repo's own backlog itself adopts
      the short-id convention.

### Uncertainties

- [ ] Whether to *rewrite/rename* existing `NNNNN-` files to short ids, or only
      apply short ids to newly created increments (leaving history/titling as
      `00004-...`). Renaming is disruptive to done-history and any referenced
      ids; likely prefer new-ids-only and let attrition converge. **Decision
      made for this repo: rename existing files too** (see Done When) — the
      repo's own backlog should dogfood the convention it ships.
- [ ] Whether the fixed-width prefix was used anywhere else (docs, shell
      completion in 00006, matching in 00009) that assumes 5 digits. The
      `matches`/completion work must accept both paddings — see 00009 and 00006.
- [ ] Does anything key on `padId` output string length (e.g. alignment in
      `list`)? If so, alignment must be re-derived or dropped.

### Notes and analysis

Fault location: `padId`/`fileName` in `src/core.ts` and `newCmd` in
`src/cli.ts` which calls `fileName(id, slug)`. To go short:
- `core.ts`: `fileName` should stop zero-padding. Options: (a) change `fileName`
  to `\`${id}-${slug}.md\``, dropping `padId`; or (b) keep `padId` for legacy
  but add a short `fileName`. Prefer making the filename production short and
  deprecating/removing `padId` if nothing else needs it.
- `idFromFile` regex `/^(\d+)-/` already handles short ids — no change.
- `matches` numeric branch (`Number(q) === id`) already handles short query
  `5` — works today because it compares numbers, but only if a short-id file
  exists to match; for newly-created short files it matches naturally.
- `recentDone` and the new numeric list sort (00010) operate on parsed ids, so
  short ids sort correctly by construction. Lexicographic comparison (e.g.
  `slugFromFile(a).localeCompare`) would break `10` vs `2`, which is exactly why
  00010 replaces slug-sort with numeric-sort — the two increments are coupled:
  00010 should land alongside/with this one so the numeric sort is in place for
  short ids.

Dependencies:
- 00010 (deterministic list ordering) — its numeric-by-id sort is what makes
  short ids safe in `list`; without it, `10` sorts before `2` lexicographically.
- 00009 (resilient matching) — matching must accept `5` and `5-slug` for short
  files (its rules already treat numeric tokens numerically, so mainly needs
  tests to confirm short forms).
- 00006 (shell autocomplete) — completion patterns may assume `NNNNN-`; should
  accept optional/minimal digits.

Tests: extend `core_test.ts` — `fileName(3, "x")` ⇒ `3-x.md`; `idFromFile` on
`10-x.md` ⇒ 10; `recentDone` mixing padded and short ids sorts numerically;
`nextId([1, 10, 2])` ⇒ 11. Adjust the existing `padId` assertion or retire it.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

WORKFLOW: decide this repo's branching/commit/PR requirements

[hook: pre-exit] This increment is _ready for in-progress_ only when Done When criteria are complete and approved. Commit the file before moving to in-progress

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
