# List CLI polish + lock cleanup

## Scope

### Goal

Resolve three pieces of real-world CLI feedback: remove the dead `--all` alias,
make the done-view ordering deliberate and consistent, and stop `.lock` files
leaking on the filesystem.

### Context

Real-world use surfaced three nits.

1. `--all` is a dead alias. In `listCmd` (`src/cli.ts`) it only has meaning when
   combined with `--done` (`--done --all` dumps every done increment). `--all`
   alone is a silent no-op, which is confusing.
2. Done-view ordering is inconsistent. Every other `list` view sorts by
   ascending numeric id, but the default `--done` view shows only the 5 most
   recent, sorted id-descending (`recentDone`). The feedback asks us to decide
   and make `--done` items correctly sorted like the other views.
3. `.lock` leaks. `new` opens an exclusive advisory lock on `.lock` under an
   exclusive lock (`withLock` in `src/fs.ts`) but never removes the file, so an
   empty `.lock` file lingers in `backlog/` after every run. `backlog init`
   already self-heals a `backlog/.gitignore` containing `.lock` (from the
   `init` work in 00007), so it isn't committed — but it still litters the tree.

Decision for #2: unify on **ascending numeric id** everywhere. `--done` shows
all done increments (not the 5-most-recent cap), sorted ascending like
in-progress and todo. This makes ordering a single, documented contract
(numbered/lifecycle order) rather than a special-cased "recent first" done view.
The `--done` semantics become trivial (all done items), which also makes
removing `--all` safe: there is no longer a truncated view to widen. `recentDone`
then becomes dead code and can be removed.

### Done When

- [x] `backlog list --done` shows every done increment (not just the 5 most
      recent), sorted by ascending numeric id — matching in-progress and todo.
      Verified: outputs all 9 done increments in numeric order.
- [x] `--all` is removed from `list` parsing, help, sub-help, and README; no
      code path accepts it. A one-line hint in `list` help documents that
      `--done` already lists every done increment (the old `--all` behaviour).
      Verified: `backlog list --all` → `unknown option: --all` (exit 1).
- [x] `recentDone` is removed from `src/core.ts` and its tests.
- [x] On exit from lock-holding work, `.lock` is removed so no `.lock` file
      lingers after a run. The `backlog/.gitignore` installed by `backlog init`
      still lists `.lock` as a safety net.
- [x] `deno task check` (fmt, lint, type-check, full test suite) is green.

### Uncertainties

- [x] Whether anyone relied on the truncate-to-5 default. Treating `--done` as
      "all done items" is simpler and consistent; if a cap is ever wanted it can
      be re-added under an explicit flag.
- [x] Verified delete-on-exit is safe under concurrent, multi-process load.
      `lockSync` is POSIX flock/fcntl: a blocking waiter already holds an open
      fd, and when the holder `close()` then unlinks, POSIX keeps the inode
      alive for that open descriptor (the unlink only drops the directory
      entry/name; the inode persists), so the waiter acquires on the same inode
      and releases without error. New entrants re-`openSync`+`create`, which
      recreates the name. Forced-contention test (3 procs, overlapping critical
      sections): all complete exactly-once, final state REMOVED, no hang.
      Two spec points to implement:
      - Delete is holder-only and happens *after* `close()` (in the `finally`);
        a waiter must never unlink (it could remove a path a newer holder just
        recreated, corrupting a live lock).
      - No waiter retry/EINTR handling needed on POSIX; keep it simple.
      Caveat: relies on POSIX keep-inode-on-unlink — fine for local dev repos; a
      hypothetical filesystem without that could stall a waiter.

### Notes and analysis

Fault locations:

- `listCmd` (`src/cli.ts`): removes the `--all` branch, and the
  `if (!allDone) done = recentDone(...)` truncation. `--done` becomes exactly
  one branch: show all done.
- `src/core.ts`: drop `recentDone` and its `sortByIdAsc` usage is unchanged.
- `src/fs.ts`: `withLock` currently does `finally { f.unlockSync(); f.close(); }`.
  Add a holder-only unlink of `path` after `close()` so the empty file doesn't
  persist. Guard removal inside the finally but after close, and ignore a
  missing file (`Deno.removeSync` throws if absent — catch or check `exists`).
  The waiter must not unlink, only the holder.
- Help/README text: `list [--done] [--grep <regex>]`, drop `--all` mentions,
  and add the one-line hint.
- Tests: drop `recentDone` tests; optionally add one for `--done` listing all
  done (integration) and for `withLock` removing its lock file.

[hook: pre-exit] This increment is _ready for done_ only when:

- Done When criteria are met, and Test criteria are passing and demonstrated
- Commit the file before moving to done.

## Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

WORKFLOW: decide this repo's branching/commit/PR requirements

[hook: pre-exit] This increment is _ready for in-progress_ only when Done When criteria are complete and approved. Commit the file before moving to in-progress

## Implementation Plan

### Phase 1 — unify done-view ordering + drop `--all` (list CLI)

- [x] In `listCmd` (`src/cli.ts`): remove the `allDone` flag and the `--all` parse
  branch. Drop `if (!allDone) done = recentDone(done, 5);` and the `recentDone`
  import, so `--done` shows **every** done increment sorted by `sortByIdAsc`,
  matching in-progress and todo.
- [x] Update `HELP` usage line to `backlog list [--done] [--grep <regex>]` and add
  a one-line list-flag hint (per feedback #1) noting `--done` lists every done
  increment.
- [x] Update `SUBHELP.list` to match: drop `--all`, document ascending-id sort and
  that `--done` appends every done increment.
- [x] Remove `recentDone` from `src/core.ts` (dead code; `sortByIdAsc` stays).

### Phase 2 — clean up `.lock` on exit

- [x] In `withLock` (`src/fs.ts`): after `close()`, holder-only unlink `path` so no
  `.lock` lingers. Guard with try/catch (file may already be gone). Keep the
  `backlog/.gitignore` containing `.lock` as a safety net (already present).

### Phase 3 — tests, docs, verify

- [x] Remove the `recentDone` tests from `src/core_test.ts`.
- [x] Add `withLock` delete-on-exit test (new `src/fs_test.ts`): the lock file is
  removed after the critical section, and results are surfaced.
- [x] Update `README.md` `backlog list` section: drop `--all`, document `--done`
  listing all done ascending.
- [x] Demonstrate `list --done` output.
- [x] Run `deno task check` (fmt, lint, type-check, full suite) green.

#### Tests

- `deno task check` is green.
- Unit: `withLock` removes its lock file on exit.
- Manual: `./backlog.sh list --done` prints every done increment ascending;
  `./backlog.sh list --all` errors with `unknown option`; run a `new` and a
  `list` and confirm no `backlog/.lock` remains.

### Guidance [hook: post-enter]

Work on this increment MUST be done in a topic branch. If the branch does not already exist
create it now. Commit the in-progress file to the branch.

Populate the implementation plan and tests, and keep them up-to-date as implementation
proceeds.

[hook: pre-exit] This increment is _ready for done_ only when:

- Done When criteria are met, and Test criteria are passing and demonstrated
- Commit the file before moving to done.
