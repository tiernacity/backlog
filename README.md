# backlog

A tiny, agent-friendly CLI that moves one **increment file** through three states:
`todo → in-progress → done`.

It exists to give humans _and_ AI agents a single shared, git-tracked record of
"what are we working on, and where is it." State lives in files and git, never
in a chat window.

This tool encodes the three-move workflow from Umans AI's post
[_How We Actually Ship with AI_](https://blog.umans.ai/blog/how-we-ship-with-ai/) —
moving one increment file through `todo → in-progress → done` — as a standalone,
installable CLI.

---

## What it is (and isn't)

**What it is:** a file mover. `backlog new` drafts an increment, `backlog start`
and `backlog done` move that same file through three directories, and `backlog
list` reports the current state. Step-specific guidance lives in a template.

**What it isn't:** a project manager, an issue tracker, a todo list app, a
scheduler, a git commit tool, or anything with a server.

---

## Installing

`backlog` is a small standalone binary (built with Deno). Install it by
downloading the release binary for your platform from the GitHub
[releases](https://github.com/tiernacity/backlog/releases) page and putting it
on your `PATH`. There's no runtime or dependency to install.

---

## Layout

```
backlog/
  todo/           # idea → drafted increment
  in-progress/    # increment → working code
  done/           # code → verified, done when criteria met
  .todo.md        # scaffold + guidance applied on enter → todo (`new`)
  .in-progress.md # plan + guidance sections applied on enter → in-progress (`start`)
  .done.md        # guidance applied on enter → done (`done`)
```

Each increment is a single markdown file named `<NNNNN>-<slug>.md` — a 5-digit
sequence number and a kebab-case slug:

```
backlog/todo/00003-tmdb-integration.md
```

### Slug

The slug is derived from the increment's name: all positional arguments are
joined, then stripped of invalid characters, lowercased, and hyphenated into
kebab-case. So `backlog new fix the Really bad bug` produces
`00007-fix-the-really-bad-bug.md`.

### Numbering

Every file is globally unique, so a number is never reused. When `backlog new`
runs it lists every file across `backlog/*`, sorts the sequence numbers in
descending order, takes the highest, and increments it by one.

`start` and `done` match an increment by its full filename, its slug, or its
number (`<id-or-name>`).

---

## Templates

Each state has a template. `backlog init` seeds defaults; edit them to shape
your workflow. They live under `backlog/` in the project. Defaults are
[`.todo.md`](.todo.md), [`.in-progress.md`](.in-progress.md), and
[`.done.md`](.done.md).

| Template                  | Applied on                           |
| ------------------------- | ------------------------------------ |
| `backlog/.todo.md`        | entering `todo/` — on `new`          |
| `backlog/.in-progress.md` | entering `in-progress/` — on `start` |
| `backlog/.done.md`        | entering `done/` — on `done`         |

Only `.todo.md` is a scaffold — it carries the title and the Goal, Context,
Done When, and Uncertainties that seed a fresh increment. The others are
**sections only**; they're added to the task file without a title. A task file
thus grows as it moves: a `todo/` increment has no Implementation Plan yet, so
an agent is never tempted to draft one prematurely.

### Hooks

Each template can carry **hooks** that shape what its command prints and gates
on. Hooks are read from the template files, so the correct hooks are located for
the running command. A hook includes enough surrounding context to be useful;
“intelligent context identification” decides what part of the template is shown:

- A hook on a **section header line** extracts the whole section, up to the next
  section at the same heading level or the next hook.
- A hook inside a **paragraph** extracts the whole paragraph.
- Otherwise, the hook extracts only its own line.

The hook marker is written `[hook: <name>]`. It can appear anywhere on a line.
Hook text is **not removed** from the template and is reproduced **verbatim** in
the increment files when template content is copied in. Agents should not edit or
remove hook entries in increment files, so they don't drift from the templates.

Four hook names drive the command life-cycle, in terms of the _current state_:

| Hook         | When it fires                           | Behaviour                 |
| ------------ | --------------------------------------- | ------------------------- |
| `pre-enter`  | before the task moves to this state     | printed; must be accepted |
| `post-enter` | after the task moves to this state      | printed; informational    |
| `pre-exit`   | before the task moves out of this state | printed; must be accepted |
| `post-exit`  | after the task moves out of this state  | printed; informational    |

- **Enter** hooks fire as a task _moves to_ a state; **exit** hooks fire as it
  _moves from_ a state.
- `post-*` hooks are informational — printed after the event.
- `pre-*` hooks must be accepted (y/n, or `-y`) before the command proceeds.

Putting it together with the transitions:

- `backlog new` → the `todo` template's `*-enter` hooks fire (file created).
- `backlog start` → the `todo` template's `*-exit` hooks, then the
  `in-progress` template's `*-enter` hooks.
- `backlog done` → the `in-progress` template's `*-exit` hooks, then the
  `done` template's `*-enter` hooks. `done` is terminal, so its `*-exit` hooks
  never fire (there's nothing to move out of `done` to).

---

## Commands

Every command prints concise stdout: what happened, and what to do next. Hooks
supply the "what to do next" (post-hooks) and the "is this done" gates
(pre-hooks). Nothing blocks on a prompt in a non-interactive run.

### `backlog init`

Creates `backlog/todo/`, `backlog/in-progress/`, and `backlog/done/`, and seeds
the three templates if they don't already exist. Idempotent. Prints the created
structure and instructions for adapting the template files to your workflow.

### `backlog new <name>`

Drafts a new increment into `todo/` from `.todo.md`, auto-numbered to the next
sequence, named from the slugified `<name>`. Fires the `todo` enter hooks.

### `backlog start [<id-or-name>]`

Moves an increment from `todo/` to `in-progress/`, applying `.in-progress.md` to
the task file. Inside a git repo the move uses `git mv` so file history is
preserved. Fires the `todo` exit hooks then the `in-progress` enter hooks.

### `backlog done [<id-or-name>]`

Moves an increment from `in-progress/` to `done/`, applying `.done.md` to the
task file — the moment work is declared _verified_. Fires the `in-progress` exit
hooks then the `done` enter hooks.

`<id-or-name>` is optional: when it's the only item in the source directory, it's
implied. Specify it when there are several candidates.

### `backlog list [--done [--all]] [--grep <regex>]`

Reports current state. By default shows `in-progress/` then `todo/`. `--done`
adds the most recent items from `done/`; `--done --all` shows the whole of
`done/`. `--grep <regex>` filters to increments whose filename matches the
regular expression.

### `backlog help [--short]`

Prints the workflow and usage — suitable for pasting into an `AGENTS.md` /
`CLAUDE.md` so any agent knows the workflow on first read. `--short` prints a
shorter version and includes the instruction to run `backlog help` for the full
workflow. Both variants end with a pointer to the GitHub releases page for
installing/updating the binary.

```
backlog — move one increment file: todo → in-progress → done
USAGE
  backlog init
  backlog new <name>
  backlog start [<id-or-name>]
  backlog done [<id-or-name>]
  backlog list [--done [--all]] [--grep <regex>]
  backlog help [--short]
WORKFLOW
  1. backlog new idea     → drafts numbered increment in todo/
  2. backlog start idea   → moves to in-progress/ (git mv)
  3. backlog done idea    → moves to done/ (git mv, verified)
Commits are yours — backlog only moves files.
```

---

## Git policy

- `backlog` **never commits**. Committing is the user's/agent's responsibility.
- The only git operation `backlog` performs is `git mv` for `start`/`done`, to
  preserve file history across state changes, and only inside a git repo.

---

## Agent-friendly

- **Stable, parseable stdout.** Facts print as `[ok] …` lines; guidance and
  gates print with their hook name. Prefixes are stable. Agents should **not
  swallow stdout** — it carries the guidance and next steps.
- **Hooks are guidance, not decoration.** Guidance and gates print with the
  relevant hook fragment. Do not edit or remove hook entries in increment files
  (they're reproduced from the templates and kept in sync with them).
- **No prompts unless a pre-hook exists and the run is interactive.** Otherwise
  commands never block. Re-submit with `-y` to accept a pre-hook.
- **Non-zero exit code on any failure.**
- **Lenient `<id-or-name>` matching** for `start`/`done` (slug, number, or filename).
- **Self-describing.** `backlog help` covers the full workflow (suitable for an
  `AGENTS.md`); each command's own `-h` covers its details and flags.

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

One file, three directories, full history via `git mv`, everything visible to
any human or agent that reads the repo.
