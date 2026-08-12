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

- [ ] `backlog list --done` shows every done increment (not just the 5 most
      recent), sorted by ascending numeric id — matching in-progress and todo.
- [ ] `--all` is removed from `list` parsing, help, sub-help, and README; no
      code path accepts it. A one-line hint in `list` help documents that
      `--done` already lists every done increment (the old `--all` behaviour).
- [ ] `recentDone` is removed from `src/core.ts` and its tests.
- [ ] On exit from lock-holding work, `.lock` is removed so no `.lock` file
      lingers after a run. The `backlog/.gitignore` installed by `backlog init`
      still lists `.lock` as a safety net.
- [ ] `deno task check` (fmt, lint, type-check, full test suite) is green.

### Uncertainties

- [ ] Whether anyone relied on the truncate-to-5 default. Treating `--done` as
      "all done items" is simpler and consistent; if a cap is ever wanted it can
      be re-added under an explicit flag.
- [ ] Race on lock-file removal: two concurrent `new` runs — the second waits on
      the lock, and the first removes the file on release. Need removal to not
      break the waiter on POSIX advisory locks (the waiting fd still refers to
      the unlinked inode, so it should complete and release without error). The
      winner's removal happens *after* the work, so the loser's already-held
      descriptor keeps working; the loser must not itself unlink. Only the lock
      holder unlinks.

### Notes and analysis

Fault locations:

- `listCmd` (`src/cli.ts`): removes the `--all` branch, and the
  `if (!allDone) done = recentDone(...)` truncation. `--done` becomes exactly
  one branch: show all done.
- `src/core.ts`: drop `recentDone` and its `sortByIdAsc` usage is unchanged.
- `src/fs.ts`: `withLock` currently does `finally { f.unlockSync(); f.close(); }`.
  Add an unlink of `path` after close so the empty file doesn't persist. Guard
  removal inside the finally but after close, and ignore a missing file
  (`Deno.removeSync` throws if absent — catch or check `exists`).
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