# Fix hook content rendering

## Scope

### Goal

Improve how `backlog` renders `[hook: ...]` content in terminal output so it
is consistent and pleasant: keep the `[hook:]` tag in rendered output, add a
blank line after `[ok]`-style status lines, and render hook blocks (including
bullet lists and multi-paragraph content) without losing lines.

### Context

Three output rough edges when exercising the workflow by hand:
1. No blank line after `[ok]`/status output lines.
2. `extractBlock` (src/core.ts) strips the `[hook: ...]` tag from the hook
   line, which shortens a hand-wrapped first line and makes it ragged; the
   tag is useful context, so keep it.
3. Inline (non-heading) hook blocks are truncated at the first blank line,
   and the printer drops blank lines, so bullet lists after a lead-in line
   (and blank lines between paragraphs) are lost. This affects every place
   hook content is rendered — gates and guidance alike.

### Done When

- [x] `[ok]`/status lines are followed by a blank line in command output.
- [x] Hook content is rendered with the `[hook: ...]` tag left in place,
      consistently across all render sites.
- [x] Hook blocks preserve blank lines, so inline bullet lists (after a
      lead-in line) and multi-paragraph content render correctly, in both
      gates (pre-hook confirm) and guidance (post-enter/post-exit).
- [x] Existing workflow still behaves correctly for template-based hooks in
      the seeded templates.

### Uncertainties

- [ ] Changing block-extraction may alter what existing templates render; verify
      each seeded template's hooks still parse to the intended content.
- [ ] Whether keeping the tag in inline-hook output (on the covered line) is
      desirable or if it needs its own formatting.

### Notes and analysis

Fix targets:
- src/cli.ts: add blank line after `[ok]` status lines; preserve blank lines in
  printNext/printGates; stop stripping the tag (print raw hook line).
- src/core.ts (extractBlock): for inline hooks, run until the next `[hook:]`
  or a heading, preserving interior blank lines instead of ending at the first
  blank line; do not strip the `[hook:]` tag from the heading line.

### Guidance [hook: post-enter]

Fill out the Goal, Context, and Done When, then commit.

[hook: pre-exit] This increment is _ready for in-progress_ only when the Done
When criteria are complete and approved, and the file is committed. Commit the
file before moving to in-progress.

## Implementation Plan

- Adjust `extractBlock` in src/core.ts to keep hook blocks contiguous and
  keep the `[hook:]` tag.
- Adjust printNext/printGates in src/cli.ts to preserve blank lines, and add
  a blank line after `[ok]` status lines.
- Verify every render path (new/start/done, gates + guidance) with tests.

### Phase 1 — parser: contiguous hook blocks & keep tag

- [x] `extractBlock`: inline hooks run until next `[hook:]` or a heading,
      preserving interior blank lines.
- [x] Do not strip the `[hook:]` tag from the hook line (heading or inline).

#### Tests

- [x] Inline hook with a lead-in line + trailing bullets keeps all lines.
- [x] Inline hook containing a blank line keeps both paragraphs.
- [x] Heading hook still extracts under `### Guidance [hook: ...]`.
- [x] Hook line keeps its `[hook: ...]` tag in content.

### Phase 2 — output: blank lines & blank-line preservation

- [x] `printNext`/`printGates` emit blank lines for empty input lines.
- [x] `[ok]` status lines in new/init/start/done are followed by a blank line.

#### Tests

- [x] Printed guidance renders blank lines between paragraphs.
- [x] Gate confirm (pre-hook) shows bullets under a lead-in line.
- [x] Status command output has a blank line after each `[ok]` block.

### Guidance [hook: post-enter]

Work on this increment MUST be done in a topic branch. If the branch does not already exist
create it now. Commit the in-progress file to the branch.

Populate the implementation plan and tests, and keep them up-to-date as implementation
proceeds.

[hook: pre-exit] This increment is _ready for done_ only when:

- Done When criteria are met, and Test criteria are passing and demonstrated
- Commit the file before moving to done.