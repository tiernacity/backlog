# Resilient increment matching

## Scope

### Goal

Let `backlog start` / `backlog done` select an increment by any unique,
recognisable fragment — not just the exact id, slug, or full filename — so
auto-generated kebab-case slugs can be targeted by a short prefix instead of
guessed verbatim.

### Context

Agent feedback on v0.2.0: name matching is brittle. `backlog start -y beta`
and `backlog start -y 00002-beta` both fail; only an exact `00002` (numeric)
or the exact full filename work. Because `new` auto-slugifies names (e.g.
`media-sizing-fill-contain-blank-space.md`), a user cannot reliably guess the
full slug to type back. Today `matches()` in `src/core.ts` only returns true
for exact full-filename, exact slug, or exact numeric-id equality.

We want to accept, for a given increment `00003-tmdb-integration`:
- the number: `3`, `00003` (and, once short ids land, e.g. `3`)
- the slug: `tmdb-integration`
- the first unique part of a slug, if actually unique: `tmdb`
- number-slug / partial: `3-tmdb`, `00003-tmdb`
- the filename: `00003-tmdb-integration`

Prefix/substring matching on the slug must still respect uniqueness: an
ambiguous prefix (e.g. `fix` matching `fix-bug` and `fix-docs`) must be
reported as ambiguous, not silently resolved.

### Done When

- [ ] `backlog start -y <prefix>` starts a todo increment whose slug starts
      with that prefix, when the prefix is unique.
- [ ] `backlog start -y <number>-<partial-slug>` matches when unique.
- [ ] `backlog start -y beta` does NOT fail on the exact failing case from
      feedback (a slug genuinely starting with `beta` gets matched).
- [ ] A non-unique prefix reports the ambiguous candidates rather than
      picking one.
- [ ] Exact id / exact slug / full filename matches still work as before
      (backward compatible).

### Uncertainties

- [ ] Whether to match prefix (e.g. `tmdb` → `tmdb-integration`) or partial
      substring anywhere in the slug. Prefix is cheap and low-surprise; open
      to substring if feedback wants it.
- [ ] How far a query before a `-` boundary counts (e.g. `3-tmdb`). The
      leading numeric token must always be treated as an id when present.
- [ ] Whether multi-word matching (lowercased, hyphen-insensitive) is worth it
      (`3 tmdb` ← `3-tmdb`).

### Notes and analysis

Fault location: `matches()` in `src/core.ts` (`===` equality on base/slug/id)
plus `resolveOne()` in `src/cli.ts` which already reports exact-one vs
ambiguous. The uniqueness safety net is already in place: `resolveOne`
errors when `cands.length > 1`, so making `matches()` prefix-aware only needs
to worry about matching too many *distinct* prefixes tied to the same file —
confirm dedupe by file, not by prefix.

Proposed shape for `matches`:
1. Trim/normalise query (lowercase).
2. If query is fully numeric → exact id match (both current `00003` and a
   future short `3`, once short ids land).
3. Strip a leading `id-` token if present and numeric; keep remainder as
   slug fragment (empty remainder → id-only match, like `3`).
4. Remaining slug fragment: match when the target slug starts with the
   fragment, OR equals it. Fragment shorter than the full slug is the new
   behaviour.

Consider centralizing the resolve precedence and adding a small matching test
suite in `src/core_test.ts` for: numeric, short numeric, slug prefix unique,
slug prefix ambiguous (two files), `number-slug`, and non-match.

Systemic note: this pairs with 00011 (short ids) — shorter ids make the
numeric path nicer and reduce the chance two slugs share a same-prefix
collision. Short ids also make the whole filename less forbidding to type.

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
