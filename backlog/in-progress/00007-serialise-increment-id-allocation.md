# Serialise increment id allocation

## Scope

### Goal

Make increment numbering race-safe so that concurrent `backlog new`
invocations cannot allocate the same id, guaranteeing each draft gets a
unique, sequential plate number.

### Context

`newCmd` computes the next id via `nextId` (global max+1 across
backlog/**/*.md) from a snapshot of the filesystem at call time. Two `backlog
new` processes started together both read the same existing files and both
allocate the same id, overwriting each other's drafts. This was observed
while drafting this batch: three parallel `backlog new` calls in this repo
all produced `00004-*`, and they had to be manually renumbered. `new` should
allocate ids atomically, not from a racy read-then-write.

### Done When

- [ ] Two+ concurrent `backlog new` runs each produce a distinct, sequential,
      non-overlapping increment id.
- [ ] Files never clobber each other when drafts are created concurrently.
- [ ] A failed/interrupted allocation does not permanently consume/break the
      sequence.
- [ ] Solo (non-concurrent) `backlog new` still numbers as before (max+1).

### Proposed solution

Serialise the whole read-snapshot→compute→publish section of `newCmd` under
an exclusive advisory file lock (`flock(2)`), so every process computes
`nextId` from a consistent view of the `.md` files rather than a stale
snapshot. Deno's file locks coordinate across processes and are released
automatically when the holding process dies, so a crashed `new` leaves no
stale lock and no id gap.

1. `src/fs.ts` — add a lock-around-fn helper:
   ```ts
   export function withLock<T>(path: string, fn: () => T): T {
     try {
       const f = Deno.openSync(path, { read: true, write: true, create: true });
       f.lockSync(true); // exclusive, blocking - serializes concurrent `new`s
       try { return fn(); } finally { f.unlockSync(); f.close(); }
     } catch (cause) {
       throw new Error(`could not acquire backlog lock ${path}: ${cause}`);
     }
   }
   ```

2. `src/cli.ts` `newCmd` — once the `pre-enter` gate passes, recompute the id
   *inside* the lock so it always reflects the latest files, and write there:
   ```ts
   return withLock(joinPath(backlogRoot(), ".lock"), () => {
     const fresh = listFiles(backlogRoot()).filter(
       (f) => f.endsWith(".md") && idFromFile(f) !== null,
     );
     const id = nextId(fresh.map((f) => idFromFile(f) as number));
     const target = joinPath(todoDir, fileName(id, slug));
     writeText(target, todoTpl);
     return target;
   });
   ```

The lock file lives at `backlog/.lock` — a non-`.md` file, so
`listFiles`/`nextId`/`list` already ignore it.

`initCmd` also creates a `backlog/.gitignore` containing `.lock` (and any other
runtime-only files) so the lock file is never committed. Creating it (idempotent
— existing file left unchanged) fits alongside the existing `.gitkeep` seeding
in `initCmd`.

Why this satisfies the Done When criteria:

- **Distinct + sequential + non-overlapping.** Every `new` recomputes `nextId`
  while holding the exclusive lock, so each sees the files written by everyone
  before it and takes max+1. Concurrent runs produce distinct, contiguous ids
  with no overlaps.
- **Never clobber.** The write is serialized; each call sees its predecessors,
  so no two pick the same id.
- **Interrupted allocation doesn't break the sequence.** The lock auto-releases
  on death and `nextId` reads the real `.md` files, so no stale marker is left
  behind; an op that dies before publishing simply leaves its id free for the
  next caller.
- **Solo unchanged.** A single call acquires the uncontended lock and computes
  max+1 as before.

`start`/`done` need no serialisation: they `git mv` an existing file and
allocate no new number, so they have no id-allocation race.

Tests: a concurrency test spawning N runtimes under one temp backlog, each
`backlog new`-ing a *different* name, asserting N distinct contiguous ids and
zero shared numbers; assert `nextId([]) === 1` for the solo case; assert a
lock file held by a killed process releases automatically.

### Notes and analysis

Fault location: src/cli.ts newCmd + src/core.ts nextId — read-then-write on
listFiles. Related: the parallel-drafting collision from this session (three
increments shared 00004, manually renumbered to 00004/00005/00006) is the
motivating case.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.

## Implementation Plan

### Phase 1 — exclusive lock around id allocation

- [x] `src/fs.ts`: add `withLock<T>(path, fn)` that takes an exclusive advisory
      lock (`FsFile.lockSync(true)`) around `fn` and always unlocks/close.
- [x] `src/cli.ts` `newCmd`: move id computation + write inside
      `withLock(backlog/.lock, ...)`, so `nextId` reads a consistent file view.
- [x] `initCmd`: seed `backlog/.gitignore` with `.lock` so the lock file is
      never committed.
- [x] Update `new` subhelp to note serialised allocation.

#### Tests

- [x] Existing suite passes (17 passed / 0 failed); `deno check`/`lint`/`fmt` clean.
- [x] Manual concurrency probe: 10 parallel `backlog new` (different names)
      produced ids 00002..00011, no duplicates, no clobbering.
- [x] Solo `backlog new` still numbers max+1 (00001 seed -> 00012 next).
- [x] `backlog/.lock` is created and git-ignored.

### Guidance [hook: post-enter]

Work on this increment MUST be done in a topic branch. If the branch does not already exist
create it now. Commit the in-progress file to the branch.

Populate the implementation plan and tests, and keep them up-to-date as implementation
proceeds.

[hook: pre-exit] This increment is _ready for done_ only when:

- Done When criteria are met, and Test criteria are passing and demonstrated
- Commit the file before moving to done.
