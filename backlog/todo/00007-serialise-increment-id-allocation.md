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

### Uncertainties

- [ ] Which mechanism fits best: a lock file, atomic create-no-replace so the
      loser retries with the next id, or a monotonic counter file. Trade-offs
      between portability and atomicity on the target platforms/filesystems.
- [ ] Whether a lock should also serialise `start`/`done` moves (they use git
      mv) or only `new`.

### Notes and analysis

Fault location: src/cli.ts newCmd + src/core.ts nextId - read-then-write on
listFiles. Existing precedents in the codebase: fs.ts uses writeText with
createNew: false, and the id allocator could reuse atomic create semantics
(Deno.writeFile with createNew:true returns/throws if the target exists) to
retry upward on collision rather than a separate lock file. Related: the
parallel-drafting collision from this session (three increments shared 00004,
manually renumbered to 00004/00005/00006) is the motivating case.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.
