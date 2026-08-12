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

- [ ] `[ok]`/status lines are followed by a blank line in command output.
- [ ] Hook content is rendered with the `[hook: ...]` tag left in place,
      consistently across all render sites.
- [ ] Hook blocks preserve blank lines, so inline bullet lists (after a
      lead-in line) and multi-paragraph content render correctly, in both
      gates (pre-hook confirm) and guidance (post-enter/post-exit).
- [ ] Existing workflow still behaves correctly for template-based hooks in
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
