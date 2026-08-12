# Clearer command output: commit guidance, actionable move errors, readable blocks

## Scope

### Goal

Make `backlog`'s stdout guidance clearer for humans and agents:
1. `backlog new` tells the user to commit the fresh increment — as part of the
   command's own output, independent of any template prose.
2. `backlog start`/`done` explain *how* to fix an uncommitted increment with a
   concrete, actionable message instead of a terse "is it committed?".
3. Replace the noisy `next:` / `confirm:` prefixes with visually-distinct
   blocks, separated by blank lines and a `---` rule between blocks.

### Context

`new` only hinted at committing via template hook-prose, which is easy to miss
and contingent on the user's workflow templates. `start`/`done` failed git-mv on
an uncommitted increment with a short question that gave no fix. And all guidance
was prefixed `next:`/`confirm:`, which is visually noisy when reading lots of
hook output. These reduce clarity for both humans and agents.

### Done When

- [ ] `backlog new` prints a commit instruction as its own output line.
- [ ] `backlog start`/`done` on an uncommitted increment print a clear, actionable
      message (relative path + commands), naming the correct subcommand.
- [ ] No `next:` / `confirm:` prefixes remain in output; hook guidance prints as
      distinct blocks separated by blank lines / a `---` rule.
- [ ] `deno fmt`, `deno lint`, `deno check`, and `deno test` all pass.

### Uncertainties

- [ ] Whether the `---` separator is better than just blank lines for all cases —
      blank-line + `---` chosen for visual distinction.

### Notes and analysis

- `printNext`/`printGates` in `src/cli.ts` rewritten to drop prefixes and add
  `---` between blocks.
- `newCmd` gained an `out(...)` commit-guidance line; `moveWithAppend` gained a
  `cmd` parameter to name the subcommand in its error path.
- `README.md` agent-friendly section updated for the new stdout format.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

Workflow — semi-linear `main`:
- This increment will live on a topic branch; do not commit it to `main`.
- `main` only ever receives an increment via `merge --no-ff` (see done step).
- A topic branch is created on `start`; if you already put this increment on a
  branch, that branch is kept going forward.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.
