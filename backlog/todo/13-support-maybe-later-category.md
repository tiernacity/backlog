# Support maybe/later category

## Scope

### Goal

Introduce a `later` (maybe/later) increment category: recorded-but-not-committed	work that can neither be started nor done directly. Items can be moved out of `todo` into `later` and back, without any template content being added on those transitions.

### Context

Today `backlog` manages a single three-state flow `todo → in-progress → done`. Some recorded ideas may never happen, or only much later, but they still want tracking. Currently there's no place to park such items; the plan introduces a `maybe/later` bucket (named `later/`) that is opt-in (not shown in `list` unless `--later`) and carve-out from the start/done flow.

Constraints:
- New state `maybe-later` parallel to `todo`/`in-progress`/`done`. The folder (and the `list` view prefix) is **`maybe-later`**; the move commands are `later` and `now`.
- Created in `backlog init` (with a `.gitkeep`), but with **no** `.maybe-later.md` template file.
- `init` must safely upgrade an existing backlog-enabled repo (idempotent: add the new dir/`.gitkeep` only when missing, leave existing state/templates untouched).
- Items land in `todo` by default via `new` (unchanged).
- `maybe-later` items cannot be `start`ed or `done`d; those transitions are disallowed with informative errors.
- Other disallowed transitions get informative remedy errors too (e.g. `start` on a `maybe-later` item, `done` from `todo`, any move out of `done`).

### Done When

- [ ] `backlog init` creates `backlog/maybe-later/` with a `.gitkeep`, does not create any `.maybe-later.md` template, and safely upgrades an existing backlog-enabled repo (idempotent, existing state/templates untouched).
- [ ] `backlog later <id-or-name>` moves a `todo` item into `maybe-later/` without appending template content.
- [ ] `backlog now <id-or-name>` moves a `maybe-later` item back into `todo/` without appending template content.
- [ ] Disallowed transitions give informative remedy errors: `start`/`done` a `maybe-later` item (`now` to revive), `done` a fresh-`todo` item (`start` first), any move out of `done` (terminal). No template content is ever added by these disallowed paths.
- [ ] `backlog list` does not show `maybe-later/` items by default; `--later` shows them.
- [ ] List ordering with flags: by default `in-progress`, `todo`; with `--later` adds `maybe-later`; any `--done` entries appear **last** (order: in-progress, todo, maybe-later, done). `--later` and `--done` are independent and cumulative.
- [ ] Help output and subcommand help updated; `backlog help` (AGENTS.md-oriented short form) updated.
- [ ] Unit and integration tests cover the new state, transitions, upgrade, and error messaging.
- [ ] README and AGENTS.md updated for the new category.

### Uncertainties

All three previously-open naming/ordering questions are resolved:
- [x] Folder/prefix is `maybe-later`; commands are `later`/`now`.
- [x] List order: in-progress, todo, maybe-later, done (done last).
- [x] `--later` and `--done` are independent and cumulative.

### Notes and analysis

Implementation points:
- Extend `core.ts` state constants/`STATE_ORDER` with `MAYBE_LATER` (exported as the folder name `maybe-later`). `TEMPLATE_NAME` stays without a `maybe-later` entry (no template).
- `init`: create the `maybe-later` dir + `.gitkeep` for it, skip template seeding for it; keep existing state dirs/templates untouched so upgrading an existing repo only adds the new dir.
- New commands `later` and `now` in cli.ts, using `moveWithAppend(...)` with a `null` template so no content is appended.
- `list`: add `--later` flag; default hidden; append `maybe-later` after `todo`; `done` entries appear last regardless of flag combination.
- Disallowed-transition errors: give `start`/`done`/`later`/`now` explicit remedy guidance rather than a bare"nothing here" message (e.g. "item is in maybe-later; run `backlog now <id>` to bring it back to todo"). Review every transition pair for a clear remedy.
- The "no template content added on later→done or back" requirement holds because `maybe-later` items never reach `in-progress`/`done` (start/done resolve only their source dirs), and `later`/`now` append nothing. Disallowed paths error out before any append.
- Update `HELP`, `HOOKS` transition lines, `SUBHELP`, `README`, and AGENTS.md guidance.

External dev note: this dogfood repo uses the working copy via `./backlog.sh` and increments live under `backlog/`.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.
