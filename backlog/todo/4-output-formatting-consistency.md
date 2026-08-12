# Output formatting consistency

## Scope

### Goal

Examine how `backlog` formats its terminal output and land a design that is
consistent, gives clear visual distinction between command-generated results
and hook guidance, and preserves hook formatting from the template files.

### Context

After the rendering fixes (00003), output is still inconsistent in places:
- Blank-line behavior varies: with no "regular" output and only a single hook,
  leading/trailing blank lines render differently than when status lines are
  present, and the collision logic between status/gate/guidance is ad-hoc.
- Command-generated output (`[ok]`, commit hints, errors) and hook guidance
  are visually undifferentiated; distinct hooks run together with only a ``---``
  between them in some paths and nothing in others.
- We want to keep hook content rendered exactly as authored in the templates
  (wrapping, blank lines, lists), which constrains how we can impose structure.

### Done When

- [ ] A single documented rule governs when a blank line separates output
      blocks (status → hint → guidance → guidance).
- [ ] Command-generated output and hook guidance are visually distinct (e.g.
      prefix, color, emphasis, or explicit marker).
- [ ] Individual hooks are clearly visually separated from each other.
- [ ] Hook text is still rendered from the template as authored (wrapping,
      blank lines, bullet lists preserved).
- [ ] The no-regular-output / single-hook case looks deliberate, not accidental.

### Uncertainties

- [ ] How much visual styling (color/emphasis) is appropriate for a tool that
      also feeds scripts and agents (colour-blind / no-TTY / piping).
- [ ] Whether the collapsed-blank-line dedup in print paths should be replaced
      by a single small stateful writer, or dropped in favour of explicit
      separation at each call site.

### Notes and analysis

Related code lives in src/cli.ts (okLine, outLn, renderContent, printNext,
printGates) and src/core.ts (extractBlock). The 00003 commit introduced
outLn/okLine/printNext/printGates; this increment is a follow-up to make that
coherent and consistent. Consider whether the `---` separator between hooks
should be used uniformly in gates too, and whether an explicit "audience"
convention (human vs agent) belongs in help.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.
