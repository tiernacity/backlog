# backlog

A tiny, agent-friendly CLI that moves one **increment file** through three
git-tracked states: `todo → in-progress → done`. Inspired by
[this](https://blog.umans.ai/blog/how-we-ship-with-ai/).

---

## Install

Download the [release](https://github.com/tiernacity/backlog/releases) binary
for your platform and put it on your `PATH`. No runtime or dependencies.

On macOS, the ad-hoc-signed binary won't open by default. Clear the Gatekeeper
quarantine attribute once after downloading (and make it executable if needed):

```
chmod +x /path/to/backlog
xattr -d com.apple.quarantine /path/to/backlog
```

---

## Layout

```
backlog/
  todo/           # idea → drafted increment
  in-progress/    # increment → working code
  done/           # code → verified
  .todo.md        # template applied on `new`
  .in-progress.md # template applied on `start`
  .done.md        # template applied on `done`
```

Each increment is a single markdown file named `<id>-<slug>.md`:

```
backlog/todo/3-tmdb-integration.md
```

- **Slug:** the increment name is joined, stripped of invalid characters,
  lowercased, and hyphenated to kebab-case.
- **Numbering:** numbers are globally unique and sequential. To count the next
  number `new` sorts all files across `backlog/*` descending and increments the
  highest.
- **Looking up:** `start`/`done` match an increment by full filename, slug, or
  number.

---

## Templates

Each state has a template under `backlog/`. `init` seeds defaults (see
[`.todo.md`](.todo.md), [`.in-progress.md`](.in-progress.md),
[`.done.md`](.done.md)); edit them to shape your workflow.

| Template                  | Applied on               |
| ------------------------- | ------------------------ |
| `backlog/.todo.md`        | `new` → `todo/`          |
| `backlog/.in-progress.md` | `start` → `in-progress/` |
| `backlog/.done.md`        | `done` → `done/`         |

`.todo.md` is a scaffold for the increment (title + Goal/Context/Done
When/Uncertainties). Others templates **add sections**, so a task file grows as
the increment progresses.

### Hooks

Templates can carry hooks that gate and annotate the transitions. A hook is the
text `[hook: <name>]` on a line; `backlog` prints or requires acceptance of the
relevant hook content.

Context is extracted by placement of the hook: on a section header it spans to
the next same-level heading or hook; inside a paragraph, the whole paragraph;
otherwise just its own line.

Four hooks fire relative to the current state:

| Hook         | When                            | Behaviour        |
| ------------ | ------------------------------- | ---------------- |
| `pre-enter`  | before moving to this state     | must be accepted |
| `post-enter` | after moving to this state      | informational    |
| `pre-exit`   | before moving out of this state | must be accepted |
| `post-exit`  | after moving out of this state  | informational    |

Transitions:

- `new` → `todo` enter hooks.
- `start` → `todo` exit hooks, then `in-progress` enter hooks.
- `done` → `in-progress` exit hooks, then `done` enter hooks (`done` does not
  support exit hooks).

`pre-*` hooks must be accepted (`y`/`n`, or supply `-y` to the command);
`post-*` hooks just print. In a non-interactive run commands never block.

---

## Commands

Each command prints concise stdout — what happened and what to do next. Hooks
supply the "what to do next" (post-hooks) and the gates (pre-hooks).

### `backlog init`

Creates `todo/`, `in-progress/`, `done/` and seeds the three templates if
missing. Idempotent.

### `backlog new <name>`

Drafts an increment into `todo/` from `.todo.md`, auto-numbered next, named from
the slugified `<name>`. Fires `todo` enter hooks.

### `backlog start [<id-or-name>]`

Moves an increment `todo/ → in-progress/`, applying `.in-progress.md`. Inside a
git repo uses `git mv`. Fires `todo` exit hooks, then `in-progress` enter hooks.

### `backlog done [<id-or-name>]`

Moves an increment `in-progress/ → done/`, applying `.done.md`. Uses `git mv` in
a git repo. Fires `in-progress` exit hooks, then `done` enter hooks.

`<id-or-name>` is optional — implied when it's the only item in the source
directory.

### `backlog list [--done [--all]] [--grep <regex>]`

Lists increments one per line as `state/<filename>`, sorted by ascending id. By
default shows `in-progress/` then `todo/`. `--done` adds the newest items from
`done/`; `--done --all` shows all of `done/`. `--grep <regex>` filters by an
increment's filename (slug) or its file contents.

### `backlog help [--short]`

Prints the workflow and usage for pasting into an `AGENTS.md`/`CLAUDE.md`.
`--short` prints a shorter version ending with a pointer to `backlog help`; both
end with a pointer to the GitHub releases page.

---

## Git policy

`backlog` never commits. Its only git operation is `git mv` for `start`/`done`,
to preserve file history, and only inside a git repo.

---

## Agent-friendly

- **Stable, parseable stdout.** Facts print as `[ok] …` lines; guidance and
  gates print as visually-distinct blocks (separated by blank lines / a `---`
  rule). Don't swallow stdout, it's part of the workflow.
- **Non-zero exit code on any failure.**
- **Lenient `<id-or-name>` matching** (slug, number, or filename).
- **Self-describing.** `backlog help` covers the workflow; each command's `-h`
  covers its details and flags.

---

## Workflow in practice

```
$ backlog init
$ backlog new content-api                    # draft → todo/
   … fill out the increment …
$ backlog start content-api                  # todo → in-progress/
   … build, test, fill the implementation plan …
$ backlog done content-api                   # in-progress → done/
```

One file, three directories, full history via `git mv`, visible to any human or
agent that reads the repo.
