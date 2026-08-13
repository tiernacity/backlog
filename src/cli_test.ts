import { assertEquals } from "@std/assert";

const MOD = new URL("../mod.ts", import.meta.url).pathname;
const TMP = `${Deno.makeTempDirSync()}/bl-cli-test`;

function exists(p: string): boolean {
  try {
    Deno.statSync(p);
    return true;
  } catch {
    return false;
  }
}

function read(p: string): string {
  return Deno.readTextFileSync(p);
}

// Runs `deno run mod.ts <args>` inside `root` and returns {code, stdout}.
function cli(
  root: string,
  ...args: string[]
): { code: number; out: string } {
  const out = runIn(root, ["run", "-A", MOD, ...args]);
  return { code: out.code, out: out.out };
}

function runIn(
  root: string,
  args: string[],
): { code: number; out: string } {
  const cmd = new Deno.Command("deno", {
    args,
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  });
  const r = cmd.outputSync();
  return {
    code: r.code,
    out: new TextDecoder().decode(r.stdout) +
      new TextDecoder().decode(r.stderr),
  };
}

function prep(): string {
  try {
    Deno.removeSync(TMP, { recursive: true });
  } catch {
    // absent
  }
  const root = `${TMP}/repo`;
  const dir = new Deno.Command("mkdir", { args: ["-p", root] });
  dir.outputSync();
  return root;
}

Deno.test("init creates maybe-later dir + gitkeep, no template", () => {
  const root = prep();
  cli(root, "init");
  assertEquals(exists(`${root}/backlog/maybe-later/.gitkeep`), true);
  assertEquals(exists(`${root}/backlog/.maybe-later.md`), false);
  // upgrade: re-run init leaves existing templates untouched
  cli(root, "init");
  assertEquals(exists(`${root}/backlog/.todo.md`), true);
  assertEquals(exists(`${root}/backlog/maybe-later/.gitkeep`), true);
});

Deno.test("later moves todo -> maybe-later with no appended content", () => {
  const root = prep();
  cli(root, "init");
  cli(root, "new", "park-me", "-y");
  const todoFile = `${root}/backlog/todo/1-park-me.md`;
  const before = read(todoFile);
  cli(root, "later", "1");
  assertEquals(exists(todoFile), false);
  const laterFile = `${root}/backlog/maybe-later/1-park-me.md`;
  assertEquals(exists(laterFile), true);
  assertEquals(read(laterFile), before);
});

Deno.test("now moves maybe-later -> todo with no appended content", () => {
  const root = prep();
  cli(root, "init");
  cli(root, "new", "revive-me", "-y");
  const todoFile = `${root}/backlog/todo/1-revive-me.md`;
  const before = read(todoFile);
  cli(root, "later", "1");
  cli(root, "now", "1");
  assertEquals(exists(todoFile), true);
  assertEquals(read(todoFile), before);
});

Deno.test("start/done on maybe-later item error with a remedy hint", () => {
  const root = prep();
  cli(root, "init");
  cli(root, "new", "blocked", "-y");
  cli(root, "later", "1");
  const r = cli(root, "start", "1", "-y");
  assertEquals(r.code, 1);
  assertEquals(r.out.includes("backlog now"), true);
  const d = cli(root, "done", "1", "-y");
  assertEquals(d.code, 1);
  assertEquals(d.out.includes("backlog now"), true);
});

Deno.test("done from todo errors and move out of done disallowed", () => {
  const root = prep();
  cli(root, "init");
  cli(root, "new", "straight", "-y");
  const r = cli(root, "done", "1", "-y");
  assertEquals(r.code, 1);
  assertEquals(r.out.includes("backlog start"), true);
});

Deno.test("list hides maybe-later by default, --later shows it, done last", () => {
  const root = prep();
  cli(root, "init");
  cli(root, "new", "later-item", "-y");
  cli(root, "later", "1");
  const def = cli(root, "list");
  assertEquals(def.out.includes("maybe-later"), false);
  const withLater = cli(root, "list", "--later");
  assertEquals(withLater.out.includes("maybe-later/1-later-item.md"), true);
  // done items appear last
  cli(root, "new", "do", "-y");
  cli(root, "start", "2", "-y");
  cli(root, "done", "2", "-y");
  const all = cli(root, "list", "--later", "--done");
  const lines = all.out.trim().split("\n");
  assertEquals(
    lines.indexOf("maybe-later/1-later-item.md") <
      lines.indexOf("done/2-do.md"),
    true,
  );
});

Deno.test("later cannot park an in-progress item (hint)", () => {
  const root = prep();
  cli(root, "init");
  cli(root, "new", "wip", "-y");
  cli(root, "start", "1", "-y");
  const r = cli(root, "later", "1");
  assertEquals(r.code, 1);
  assertEquals(exists(`${root}/backlog/in-progress/1-wip.md`), true);
});

Deno.test("later errors when the pre-maybe-later dir is missing until init", () => {
  const root = prep();
  cli(root, "init");
  cli(root, "new", "upgrade", "-y");
  // Simulate a pre-maybe-later repo: drop the dir entirely.
  Deno.removeSync(`${root}/backlog/maybe-later`, { recursive: true });
  const r = cli(root, "later", "1");
  assertEquals(r.code, 1);
  assertEquals(r.out.includes("backlog init"), true);
  assertEquals(exists(`${root}/backlog/maybe-later/1-upgrade.md`), false);
  assertEquals(exists(`${root}/backlog/todo/1-upgrade.md`), true);
  // init repairs it, then later succeeds.
  cli(root, "init");
  const ok = cli(root, "later", "1");
  assertEquals(ok.code, 0);
  assertEquals(exists(`${root}/backlog/maybe-later/1-upgrade.md`), true);
});
