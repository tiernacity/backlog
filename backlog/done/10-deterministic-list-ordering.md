# Deterministic list ordering

## Scope

### Goal

Make `backlog list` display increments in a stable, meaningful order rather
than the OS directory order, so numbering/priority is actually visible and
output is reproducible across machines, shells, and filesystems.

### Context

Agent feedback on v0.2.0: `list` prints state dirs in OS order, not by number —
so `00005` can appear above `00003`. Today `listCmd` in `src/cli.ts` sorts each
state's file list *by slug* (`slugFromFile(a).localeCompare(...)`); that is
already deterministic, but it is alphabetical-by-slug, not numeric-by-id, so it
does not reflect the sequencing that the `NNNNN-` prefix implies. OS order is
non-deterministic anyway, and `localeCompare` can vary by locale/build — neither
is a stable contract.

If "numbering implies priority/lifecycle order", the display should sort by id.
This pairs with 00011 (short ids): the same sort key keeps working whether the
prefix is `00003` or `3`, because we sort on the parsed numeric id, not the
string prefix.

Re-scope from agent follow-ups while implementing:

- Render each increment on its own line as `state/<filename>` (e.g.
  `todo/4-output-formatting-consistency.md`) instead of a grouped
  `state:` header with an indented list. Only filenames are listed.
- `--grep` should match file *contents* as well as the filename/slug, so
  content searches like `--grep Agent` find the increment even when the
  term is absent from its name.

### Done When

- [x] `backlog list` shows increments sorted by ascending numeric id (not slug,
      not OS order) within each state section.
- [x] `list --done` and `list --done --all` keep their "recent done first"
      (descending-id) semantics; only the visible default sections change.
- [x] Output is byte-identical across runs on the same repo (deterministic,
      independent of OS readdir order and locale).
- [x] Sorting is demonstrated in a test (no reliance on filesystem enumeration
      order or `localeCompare`).
- [x] `list` prints one line per increment as `state/<filename>`, not a grouped
      header + indented list.
- [x] `--grep <regex>` matches the increment's filename (slug) *or* its file
      contents; only filenames are printed

### Uncertainties

- [ ] Whether `--all` / `--done` should also be numeric-sorted ascending or
      intentionally remain most-recently-done-first for readability. The
      current `recentDone` (id-desc) is a deliberate "recent first" view and
      should probably stay.
- [ ] Whether semantically identical slugs under the same id (edge) need a
      tie-break; id should be unique, so likely a non-issue.

### Notes and analysis

Fault location: `listCmd` in `src/cli.ts` — the `sortBySlug` helper on lines
~478. Replace with `sortByIdAsc`: `fs.sort((a, b) => (idFromFile(a) ?? 0) -
(idFromFile(b) ?? 0))`. `idFromFile` already parses the leading numeric id, so
the sort key is locale-free and filesystem-order-free.

Keep the `recentDone` path for the truncated default `--done` view (already
id-desc) — that is intentionally "latest first". Only the three state sections
(in-progress, todo, and the full `--done --all` dump) change sort key.

Add a unit test in `src/core_test.ts` mirroring `recentDone` (sort several
prefixed filenames by id asc). `recentDone` is already the C-string desc
analogue — this is its ascending sibling.

This is independent of, but should not conflict with, the id work. Note in
00011: if ids go from padded `00003` to short `3`, `idFromFile` parses via
`/^(\d+)-/` and `Number()`, so both forms sort/parse identically today. Confirm
`listFiles` recursion picks up `.md` only (it walks everything; the sort is
where determinism is enforced).

## Implementation Plan

### Phase 1 — determine field (done)

- Add `sortByIdAsc(files)` to `src/core.ts`, ascending by parsed numeric id,
  no locale and non-mutating (mirrors `recentDone`).
- Use it in `listCmd` (`src/cli.ts`) for the in-progress, todo, and full
  `--done --all` sections; keep `recentDone` (id-desc) for the truncated
  default `--done` view. Drop the unused `sortBySlug` and its import.

#### Tests

- `sortByIdAsc sorts padded and short ids ascending numerically`
- `sortByIdAsc does not mutate the input`
- `deno task check` (fmt, lint, type-check, full suite) is green.

### Phase 2 — output format + grep-by-contents (done)

- `listCmd` prints one line per increment as `state/<filename>` via the
  module-level `out`, instead of a grouped `state:` header + indented list.
- `listCmd` filter matches an increment when `--grep` hits its slug **or** its
  file contents (`readText`), so content-only terms (e.g. `Agent`) match.

#### Tests

- Manual: `./backlog.sh list --grep Agent` finds
  `in-progress/10-deterministic-list-ordering.md` via contents.
- Manual: `./backlog.sh list --grep ordering` finds it via slug.
- Manual: `./backlog.sh list | ./backlog.sh list` id-asc and stable across
  runs; `list --done --all` keeps desc for done.

[hook: pre-exit] This increment is _ready for done_ only when:

- Done When criteria are met, and Test criteria are passing and demonstrated
- Commit the file before moving to done.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

WORKFLOW: decide this repo's branching/commit/PR requirements

[hook: pre-exit] This increment is _ready for in-progress_ only when Done When criteria are complete and approved. Commit the file before moving to in-progress

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
