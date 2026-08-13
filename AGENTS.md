## Dogfooding `backlog` (dev build)

You are developing and testing `backlog` itself, and using the tool to manage
this repo's own increments. Invoke the working copy via `./backlog.sh`. Do _not_
use an installed release binary while developing here.

Run `./backlog.sh help` **now** for the full, always-current workflow.

Increments live under `backlog/` (todo → in-progress → done, or park in
maybe-later); the seeded state templates are `src/.todo.md`,
`src/.in-progress.md`, `src/.done.md`. `maybe-later/` has no template.

## Dependencies vs hand-crafted code

- Prefer a well-tested, actively-supported dependency over hand-crafted code
- If no dependency is a good fit, building our own is an allowable choice
- New deps MUST respect the repo's `min-release-age=` supply-chain protection

## Code comments

- Code comments MUST be concise
- Code comments MUST ONLY be added if necessary for clarity or to avoid future
  regressions
- Code comments MUST ONLY describe the code that's implemented
- Code comments MUST NOT record historical designs, decisions or changes
- Code comments MUST NOT reference github issues or PRs
- Code comments SHOULD avoid jargon, unless it is necessary and has been defined
- Historic code comments that do not follow these rules MAY be updated
