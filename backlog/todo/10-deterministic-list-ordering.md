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

### Done When

- [ ] `backlog list` shows increments sorted by ascending numeric id (not slug,
      not OS order) within each state section.
- [ ] `list --done` and `list --done --all` keep their "recent done first"
      (descending-id) semantics; only the visible default sections change.
- [ ] Output is byte-identical across runs on the same repo (deterministic,
      independent of OS readdir order and locale).
- [ ] Sorting is demonstrated in a test (no reliance on filesystem enumeration
      order or `localeCompare`).

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

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

WORKFLOW: decide this repo's branching/commit/PR requirements

[hook: pre-exit] This increment is _ready for in-progress_ only when Done When criteria are complete and approved. Commit the file before moving to in-progress