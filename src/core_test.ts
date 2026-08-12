import {
  appendTemplate,
  extractHooks,
  fileName,
  idFromFile,
  matches,
  nextId,
  padId,
  recentDone,
  slugFromFile,
  slugify,
} from "./core.ts";
import { assertEquals } from "@std/assert";

Deno.test("slugify lowercases and kebab-cases", () => {
  assertEquals(slugify("fix the Really bad bug"), "fix-the-really-bad-bug");
  assertEquals(slugify("  TMDB Integration  "), "tmdb-integration");
  assertEquals(slugify("a!!b##c"), "a-b-c");
  assertEquals(slugify("   "), "");
});

Deno.test("padId zero-pads to five digits", () => {
  assertEquals(padId(1), "00001");
  assertEquals(padId(12345), "12345");
});

Deno.test("fileName composes id and slug", () => {
  assertEquals(fileName(7, "fix-bug"), "00007-fix-bug.md");
});

Deno.test("idFromFile parses leading id", () => {
  assertEquals(idFromFile("backlog/todo/00003-tmdb.md"), 3);
  assertEquals(idFromFile("00003-tmdb.md"), 3);
  assertEquals(idFromFile("tmdb.md"), null);
});

Deno.test("slugFromFile strips id", () => {
  assertEquals(slugFromFile("00003-tmdb-integration.md"), "tmdb-integration");
});

Deno.test("nextId increments from highest or starts at one", () => {
  assertEquals(nextId([]), 1);
  assertEquals(nextId([3, 1, 9]), 10);
});

Deno.test("matches resolves by number, slug, or filename", () => {
  const f = "backlog/todo/00003-tmdb-integration.md";
  assertEquals(matches(f, "3"), true);
  assertEquals(matches(f, "00003"), true);
  assertEquals(matches(f, "tmdb-integration"), true);
  assertEquals(matches(f, "00003-tmdb-integration"), true);
  assertEquals(matches(f, "other"), false);
  assertEquals(matches(f, ""), false);
});

Deno.test("matches is case-insensitive", () => {
  const f = "backlog/todo/00003-TMDB-Integration.md";
  assertEquals(matches(f, "tmdb"), true);
  assertEquals(matches(f, "TMDB"), true);
  assertEquals(matches(f, "00003-tmdb"), true);
});

Deno.test("matches a unique slug prefix", () => {
  const f = "backlog/todo/00003-tmdb-integration.md";
  assertEquals(matches(f, "tmdb"), true);
  assertEquals(matches(f, "tmdb-int"), true);
  // A leaf equality still holds.
  assertEquals(matches(f, "tmdb-integration"), true);
});

Deno.test("matches leading id alone or with a slug fragment", () => {
  const f = "backlog/todo/00003-tmdb-integration.md";
  assertEquals(matches(f, "3-tmdb"), true);
  assertEquals(matches(f, "00003-tmdb"), true);
  // Wrong id short-circuits even with a matching slug fragment.
  assertEquals(matches(f, "4-tmdb"), false);
  // A numeric query must not prefix-match an unrelated slug.
  assertEquals(matches(f, "3"), true);
});

Deno.test("matches a non-prefix substring of the slug", () => {
  const f = "backlog/todo/00003-tmdb-integration.md";
  // "tegration" is not a prefix of the slug.
  assertEquals(matches(f, "tegration"), false);
});

Deno.test("extractHooks pulls a section from a header hook and keeps the tag", () => {
  const tpl =
    `## Ship Criteria [hook: pre-exit]\n\n- [ ] a\n- [ ] b\n\n## Other\nx`;
  const hooks = extractHooks(tpl);
  assertEquals(hooks.length, 1);
  assertEquals(hooks[0].name, "pre-exit");
  assertEquals(
    hooks[0].content,
    `## Ship Criteria [hook: pre-exit]\n\n- [ ] a\n- [ ] b`,
  );
});

Deno.test("extractHooks pulls a paragraph from an inline hook and keeps the tag", () => {
  const tpl = `Fill it out and commit. [hook: post-enter]\nThen do more.`;
  const hooks = extractHooks(tpl);
  assertEquals(hooks.length, 1);
  assertEquals(hooks[0].name, "post-enter");
  assertEquals(
    hooks[0].content,
    "Fill it out and commit. [hook: post-enter]\nThen do more.",
  );
});

Deno.test("extractHooks pulls just the line for an isolated hook, keeping the tag", () => {
  const tpl = `\n[hook: pre-exit] ready only when done when criteria met\n`;
  const hooks = extractHooks(tpl);
  assertEquals(hooks.length, 1);
  assertEquals(hooks[0].name, "pre-exit");
  assertEquals(
    hooks[0].content,
    "[hook: pre-exit] ready only when done when criteria met",
  );
});

Deno.test("extractHooks keeps an inline hook's bullet list after a lead-in line", () => {
  const tpl =
    `[hook: pre-exit] ready only when:\n\n- [ ] a\n- [ ] b\n\n## Next\nx`;
  const hooks = extractHooks(tpl);
  assertEquals(hooks.length, 1);
  assertEquals(
    hooks[0].content,
    "[hook: pre-exit] ready only when:\n\n- [ ] a\n- [ ] b",
  );
});

Deno.test("extractHooks keeps blank lines inside an inline hook", () => {
  const tpl = `[hook: post-enter] first para.\n\nsecond para.\n
\n[hook: pre-exit] gate`;
  const hooks = extractHooks(tpl);
  assertEquals(
    hooks[0].content,
    "[hook: post-enter] first para.\n\nsecond para.",
  );
  assertEquals(hooks[1].name, "pre-exit");
});

Deno.test("extractHooks reproduces multiple hooks in order", () => {
  const tpl =
    `# T\n\n## A [hook: post-enter]\nbody a\n\n[hook: pre-exit] gate b\n\n## C [hook: post-enter]\nbody c`;
  const hooks = extractHooks(tpl);
  assertEquals(hooks.map((h) => h.name), [
    "post-enter",
    "pre-exit",
    "post-enter",
  ]);
});

Deno.test("appendTemplate appends a section template to task content", () => {
  const task = `# T\n\n## Goal`;
  const tpl = `## Implementation Plan\n\n- [ ] TODO`;
  const result = appendTemplate(task, tpl);
  assertEquals(
    result,
    `# T\n\n## Goal\n\n## Implementation Plan\n\n- [ ] TODO\n`,
  );
});

Deno.test("recentDone keeps the newest id first", () => {
  const files = [
    "backlog/done/00010-e.md",
    "backlog/done/00002-b.md",
    "backlog/done/00007-d.md",
    "backlog/done/00001-a.md",
    "backlog/done/00005-c.md",
  ];
  const result = recentDone(files, 5);
  assertEquals(result, [
    "backlog/done/00010-e.md",
    "backlog/done/00007-d.md",
    "backlog/done/00005-c.md",
    "backlog/done/00002-b.md",
    "backlog/done/00001-a.md",
  ]);
});

Deno.test("recentDone truncates to the limit, keeping the newest", () => {
  const files = [
    "backlog/done/00003-c.md",
    "backlog/done/00001-a.md",
    "backlog/done/00005-e.md",
    "backlog/done/00004-d.md",
    "backlog/done/00006-f.md",
    "backlog/done/00002-b.md",
    "backlog/done/00007-g.md",
  ];
  const result = recentDone(files, 5);
  assertEquals(result, [
    "backlog/done/00007-g.md",
    "backlog/done/00006-f.md",
    "backlog/done/00005-e.md",
    "backlog/done/00004-d.md",
    "backlog/done/00003-c.md",
  ]);
});

Deno.test("recentDone does not mutate the input and is capped at the limit", () => {
  const files = ["backlog/done/00001-a.md", "backlog/done/00003-c.md"];
  const result = recentDone(files, 5);
  assertEquals(result, [
    "backlog/done/00003-c.md",
    "backlog/done/00001-a.md",
  ]);
  assertEquals(files, ["backlog/done/00001-a.md", "backlog/done/00003-c.md"]);
});
