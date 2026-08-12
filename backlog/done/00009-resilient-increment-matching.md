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

- [x] `backlog start -y <prefix>` starts a todo increment whose slug starts
      with that prefix, when the prefix is unique.
- [x] `backlog start -y <number>-<partial-slug>` matches when unique.
- [x] `backlog start -y beta` does NOT fail on the exact failing case from
      feedback (a slug genuinely starting with `beta` gets matched).
- [x] A non-unique prefix reports the ambiguous candidates rather than
      picking one.
- [x] Exact id / exact slug / full filename matches still work as before
      (backward compatible).

### Uncertainties

- [x] Prefix matching (not substring) was chosen. Cheap and low-surprise;
      substring can follow if feedback wants it.
- [x] A leading numeric token before a `-` is always treated as the id.
- [ ] Multi-word matching (hyphen-insensitive) was not built — not requested
      and low value; `new` auto-slugs to kebab-case anyway.

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

### Phase 1 — prefix-aware matching

- [x] Rewrote `matches()` in `src/core.ts` to resolve the query in order:
      exact filename, exact slug, leading numeric id token, then slug-prefix.
- [x] Multiple exact-match paths (filename / slug / number) are kept for
      backward compatibility.
- [x] `resolveOne()` in `src/cli.ts` was relied on unchanged for the
      unique-vs-ambiguous safety net (ambiguity is reported, not silently
      resolved).

#### Tests

- [x] Added `src/core_test.ts` cases: numeric, short numeric, slug prefix
      unique, leading id + fragment, wrong id short-circuit, non-prefix
      substring rejection, case-insensitivity.
- [x] Ran `deno task check` (fmt, lint, typecheck, full suite) — all green.

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
