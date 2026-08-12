import {
  appendTemplate,
  baseName,
  DONE,
  extractHooks,
  fileName,
  idFromFile,
  IN_PROGRESS,
  matches,
  nextId,
  recentDone,
  slugFromFile,
  slugify,
  TODO,
} from "./core.ts";
import {
  cwd,
  defaultTemplateUrl,
  ensureDir,
  exists,
  gitAdd,
  gitMv,
  isGitRepo,
  joinPath,
  listFiles,
  plainMv,
  readOptional,
  readText,
  writeText,
} from "./fs.ts";

const INSTALL =
  "Install, if needed, via https://github.com/tiernacity/backlog/releases";

// Baked into compiled release binaries via `deno compile --env` (see
// .github/workflows/release.yml). In dev this resolves from git and reports
// a stable-ish string.
function version(): string {
  const baked = Deno.env.get("BACKLOG_VERSION");
  if (baked) return baked;
  const r = new Deno.Command("git", {
    args: ["describe", "--tags", "--always", "--dirty"],
  }).outputSync();
  return r.success && r.stdout.length
    ? new TextDecoder().decode(r.stdout).trim()
    : "unknown";
}

const STORE = "backlog";
const STORE_DIR = (state: string): string => `${STORE}/${state}/`;
const STORE_TEMPLATE = (state: string): string => `${STORE}/.${state}.md`;
const STORE_GITKEEP = (state: string): string => `${STORE}/${state}/.gitkeep`;
const STORE_GITIGNORE = ".gitignore";
// Runtime-only files inside the backlog dir that must never be committed.
const STORE_IGNORED = ".lock\n";

const HEADLINE =
  `Use \`backlog\` for task workflow support. Manage an increment from todo → in-progress → done

${INSTALL}`;

const HELP = `${HEADLINE}

USAGE
  backlog init
  backlog new <name>
  backlog start [-y] [<id-or-name>]
  backlog done [-y] [<id-or-name>]
  backlog list [--done [--all]] [--grep <regex>]
  backlog help [--short]
  backlog --version

WORKFLOW
  1. backlog new <increment name>     → drafts numbered increment in ${
  STORE_DIR(
    TODO,
  )
}
  2. backlog start <increment name or number>   → moves to ${
  STORE_DIR(
    IN_PROGRESS,
  )
} (git mv)
  3. backlog done <increment name or number>    → moves to ${
  STORE_DIR(
    DONE,
  )
} (git mv, verified)

Commits are yours — backlog only moves files.
Hooks on *templates* gate each move; but are useful context in increment files, so don't remove them.
Don't swallow backlog stdout — it carries workflow guidance for humans and agents.`;

const HOOKS =
  `HOOKS — templates gate and annotate transitions with [hook: <name>].
Four names fire relative to the current state, as a gate (pre-*, must be accepted)
or guidance (post-*, printed):

  pre-enter   before moving into this state (gate)
  post-enter  after moving into this state  (guidance)
  pre-exit    before moving out of this state (gate)
  post-exit   after moving out of this state (guidance)

Transition order:
  new  → todo enter hooks
  start → todo exit, then in-progress enter
  done → in-progress exit, then done enter (done is terminal)
Default templates show each; add/sharpen them in backlog/.*.md to shape your workflow.
See also: backlog help (workflow), backlog init (setup & template customisation).`;

const out = (s: string): void => {
  Deno.stdout.writeSync(new TextEncoder().encode(s + "\n"));
};

const err = (s: string): void => {
  Deno.stderr.writeSync(new TextEncoder().encode(s + "\n"));
};

// Collapses consecutive blank lines so status, gate, and guidance output
// reads cleanly when they meet.
let lastBlank = true;
const outLn = (s: string): void => {
  if (!s && lastBlank) return;
  out(s);
  lastBlank = s === "";
};

const okLine = (s: string): void => {
  outLn(`[ok] ${s}`);
  outLn("");
};

function backlogRoot(): string {
  return joinPath(cwd(), "backlog");
}

function hooksFor(tpl: string | null, name: string): string[] {
  if (!tpl) return [];
  return extractHooks(tpl)
    .filter((h) => h.name === name)
    .map((h) => h.content);
}

function renderContent(content: string): void {
  for (const ln of content.split("\n")) outLn(ln);
}

function printNext(contents: string[]): void {
  if (!contents.length) return;
  outLn("");
  const blocks = contents.filter((c) => c.trim());
  blocks.forEach((content, i) => {
    if (i > 0) outLn("---");
    renderContent(content);
  });
  outLn("");
}

function printGates(contents: string[]): void {
  const blocks = contents.filter((c) => c.trim());
  blocks.forEach((content, i) => {
    if (i > 0) outLn("---");
    renderContent(content);
  });
}

async function confirm(lines: string[], yes: boolean): Promise<boolean> {
  if (!lines.length || yes) return true;
  printGates(lines);
  if (!isTTY()) {
    out("pre-hooks not confirmed; re-run with -y to accept.");
    return false;
  }
  await Deno.stdout.write(new TextEncoder().encode("Proceed? [y/N] "));
  return /^\s*y/i.test(await readLine());
}

function isTTY(): boolean {
  try {
    return Deno.stdin.isTerminal();
  } catch {
    return false;
  }
}

async function readLine(): Promise<string> {
  const buf = new Uint8Array(1024);
  const decoder = new TextDecoder();
  let data = "";
  for (;;) {
    const n = await Deno.stdin.read(buf);
    if (n === null) break;
    data += decoder.decode(buf.subarray(0, n));
    if (data.includes("\n")) break;
  }
  return data.replace(/\r?\n$/, "");
}

function initCmd(): number {
  const root = backlogRoot();
  ensureDir(root);
  for (const state of [TODO, IN_PROGRESS, DONE]) {
    ensureDir(joinPath(root, state));
    okLine(`created ${STORE_DIR(state)}`);
    const gk = STORE_GITKEEP(state);
    if (!exists(gk)) {
      writeText(gk, "");
      okLine(`created ${gk} (keeps empty dir tracked)`);
    }
  }
  for (const state of [TODO, IN_PROGRESS, DONE]) {
    const tplPath = joinPath(root, `.${state}.md`);
    const name = STORE_TEMPLATE(state);
    if (exists(tplPath)) {
      okLine(`seeded ${name} (already exists — left unchanged)`);
      continue;
    }
    writeText(tplPath, readText(defaultTemplateUrl(state)));
    okLine(`seeded ${name}`);
  }
  const gitignorePath = joinPath(root, STORE_GITIGNORE);
  if (!exists(gitignorePath)) {
    writeText(gitignorePath, STORE_IGNORED);
    okLine(`created ${STORE_GITIGNORE} (ignores runtime files)`);
  }
  out(
    `${STORE}/ now holds your workflow — three templates and three state dirs`,
  );
  out('resolve every "WORKFLOW" marker in the templates now (one-time policy)');
  out(
    "templates may also gain extra [hook: <name>]s to gate or guide transitions",
  );
  out("  see `backlog help` (HOOKS section) for hook names & semantics");
  out("---");
  out(`commit the shaped templates:  git add ${STORE} && git commit`);
  out(
    "then increments flow: `backlog new <name>` → fill it in → `backlog start` → `backlog done`",
  );
  out("");
  return 0;
}

function newCmd(args: string[]): Promise<number> {
  const yes = args.includes("-y");
  const nameArgs = args.filter((a) => a !== "-y");
  if (!nameArgs.length) {
    err("backlog new requires a name");
    return Promise.resolve(1);
  }
  const todoDir = joinPath(backlogRoot(), TODO);
  const templatePath = joinPath(backlogRoot(), ".todo.md");
  if (!exists(templatePath)) {
    err("backlog not initialized; run `backlog init` first");
    return Promise.resolve(1);
  }
  const todoTpl = readText(templatePath);
  const slug = slugify(nameArgs.join(" "));
  const existing = listFiles(backlogRoot()).filter(
    (f) => f.endsWith(".md") && idFromFile(f) !== null,
  );
  const id = nextId(existing.map((f) => idFromFile(f) as number));
  const target = joinPath(todoDir, fileName(id, slug));
  if (exists(target)) {
    err(`increment ${baseName(target)} already exists`);
    return Promise.resolve(1);
  }
  return confirm(hooksFor(todoTpl, "pre-enter"), yes).then((ok) => {
    if (!ok) return 1;
    writeText(target, todoTpl);
    okLine(`created ${STORE_DIR(TODO)}${baseName(target)}`);
    outLn(
      `fill out the increment, then commit it before moving it on:  git add ${
        STORE_DIR(TODO)
      }${baseName(target)} && git commit`,
    );
    outLn("");
    printNext(hooksFor(todoTpl, "post-enter"));
    return 0;
  });
}

// Only real increments (NNNNN-slug.md) are selectable so `.gitkeep` sentinels
// and other non-increment files never count toward ambiguity.
function selectable(files: string[]): string[] {
  return files.filter((f) => idFromFile(f) !== null);
}

function resolveOne(
  files: string[],
  query: string | undefined,
  label: string,
): string | null {
  files = selectable(files);
  if (query !== undefined) {
    const cands = files.filter((f) => matches(f, query));
    if (cands.length === 0) {
      err(`no backlog item in ${label} matching '${query}'`);
      return null;
    }
    if (cands.length > 1) {
      err(
        `ambiguous match in ${label}; be more specific: ${
          cands
            .map(baseName)
            .join(", ")
        }`,
      );
      return null;
    }
    return cands[0];
  }
  if (files.length === 0) {
    err(`nothing in ${label}; provide an increment or create one`);
    return null;
  }
  if (files.length > 1) {
    err(
      `multiple items in ${label}; specify one: ${
        files
          .map(baseName)
          .join(", ")
      }`,
    );
    return null;
  }
  return files[0];
}

function moveWithAppend(
  src: string,
  dstDir: string,
  tpl: string | null,
  cmd: string,
): string | null {
  const name = baseName(src);
  const dst = joinPath(dstDir, name);
  if (isGitRepo()) {
    if (!gitMv(src, dst)) {
      err(
        `cannot move ${name} with git mv — the increment is not under version`,
      );
      err(`control. Commit it first, then re-run \`backlog ${cmd}\`:`);
      err(`  git add ${src.replace(/.*\/backlog\//, "backlog/")}`);
      err("  git commit -m <message>");
      return null;
    }
  } else {
    plainMv(src, dst);
    out(
      "warning: not a git repo — moved with plain mv (history not preserved)",
    );
  }
  if (tpl !== null) {
    writeText(dst, appendTemplate(readText(dst), tpl));
  }
  // Stage the appended section alongside the rename so a single commit
  // captures the whole transition (git mv always stages the pre-append
  // content; re-staging dst keeps it all in one clean, stageable unit).
  if (isGitRepo()) {
    gitAdd(dst);
  }
  return dst;
}

function startCmd(args: string[]): Promise<number> {
  const flags = parseSelect(args);
  if (flags.error) {
    err(flags.error);
    return Promise.resolve(1);
  }
  const root = backlogRoot();
  const srcDir = joinPath(root, TODO);
  const files = listFiles(srcDir).sort();
  const item = resolveOne(files, flags.query, "todo");
  if (!item) return Promise.resolve(1);
  const todoTpl = readOptional(joinPath(root, ".todo.md"));
  const ipTpl = readOptional(joinPath(root, ".in-progress.md"));
  const gates = [
    ...hooksFor(todoTpl, "pre-exit"),
    ...hooksFor(ipTpl, "pre-enter"),
  ];
  return confirm(gates, flags.yes).then((ok) => {
    if (!ok) return 1;
    const moved = moveWithAppend(
      item,
      joinPath(root, IN_PROGRESS),
      ipTpl,
      "start",
    );
    if (!moved) return 1;
    okLine(`moved ${baseName(item)}: todo → in-progress`);
    printNext([
      ...hooksFor(ipTpl, "post-enter"),
      ...hooksFor(todoTpl, "post-exit"),
    ]);
    return 0;
  });
}

function doneCmd(args: string[]): Promise<number> {
  const flags = parseSelect(args);
  if (flags.error) {
    err(flags.error);
    return Promise.resolve(1);
  }
  const root = backlogRoot();
  const srcDir = joinPath(root, IN_PROGRESS);
  const files = listFiles(srcDir).sort();
  const item = resolveOne(files, flags.query, "in-progress");
  if (!item) return Promise.resolve(1);
  const ipTpl = readOptional(joinPath(root, ".in-progress.md"));
  const doneTpl = readOptional(joinPath(root, ".done.md"));
  const gates = [
    ...hooksFor(ipTpl, "pre-exit"),
    ...hooksFor(doneTpl, "pre-enter"),
  ];
  return confirm(gates, flags.yes).then((ok) => {
    if (!ok) return 1;
    const moved = moveWithAppend(item, joinPath(root, DONE), doneTpl, "done");
    if (!moved) return 1;
    okLine(`moved ${baseName(item)}: in-progress → done`);
    printNext([
      ...hooksFor(doneTpl, "post-enter"),
      ...hooksFor(ipTpl, "post-exit"),
    ]);
    return 0;
  });
}

function parseSelect(args: string[]): {
  yes: boolean;
  query?: string;
  error?: string;
} {
  let yes = false;
  const positional: string[] = [];
  for (const a of args) {
    if (a === "-y" || a === "--yes") {
      yes = true;
    } else if (a.startsWith("-")) {
      return { yes: false, error: `unknown option: ${a}` };
    } else {
      positional.push(a);
    }
  }
  if (positional.length > 1) {
    return { yes: false, error: "provide at most one <id-or-name>" };
  }
  return { yes, query: positional[0], error: undefined };
}

function listCmd(args: string[]): number {
  let showDone = false;
  let allDone = false;
  let grep: RegExp | null = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--done") showDone = true;
    else if (a === "--all") allDone = true;
    else if (a === "--grep") {
      grep = parseGrep(args[i + 1]);
      if (!grep) return 1;
      i++;
    } else if (a.startsWith("--grep=")) {
      grep = parseGrep(a.slice("--grep=".length));
      if (!grep) return 1;
    } else {
      err(`unknown option: ${a}`);
      return 1;
    }
  }

  const filter = (f: string): boolean =>
    (!grep || grep.test(baseName(withoutExt(f)))) && idFromFile(f) !== null;

  const sortBySlug = (fs: string[]): string[] =>
    fs.sort((a, b) => slugFromFile(a).localeCompare(slugFromFile(b)));

  const root = backlogRoot();
  const show = (label: string, items: string[]): void => {
    out(`${label}:`);
    for (const item of items) out(`  ${baseName(item)}`);
  };

  const inProgress = sortBySlug(
    listFiles(joinPath(root, IN_PROGRESS)).filter(filter),
  );
  const todo = sortBySlug(listFiles(joinPath(root, TODO)).filter(filter));
  show("in-progress", inProgress);
  show("todo", todo);
  if (showDone) {
    let done = sortBySlug(listFiles(joinPath(root, DONE)).filter(filter));
    if (!allDone) done = recentDone(done, 5);
    show("done", done);
  }
  return 0;
}

function withoutExt(p: string): string {
  return p.endsWith(".md") ? p.slice(0, -3) : p;
}

function parseGrep(regex: string | undefined): RegExp | null {
  if (!regex) {
    err("--grep requires a regular expression");
    return null;
  }
  try {
    return new RegExp(regex);
  } catch (e) {
    err(`invalid regex: ${(e as Error).message}`);
    return null;
  }
}

function helpCmd(args: string[]): number {
  if (args.includes("--short")) {
    out(HEADLINE);
    out("\nRun `backlog help` **now** for workflow instructions.");
    return 0;
  }
  out(HELP);
  out(HOOKS);
  return 0;
}

const SUBHELP: Record<string, string> = {
  init: `backlog init
  Creates ${STORE_DIR(TODO)}, ${STORE_DIR(IN_PROGRESS)}, ${
    STORE_DIR(
      DONE,
    )
  } and seeds
  the three project template files (${STORE_TEMPLATE(TODO)},
  ${STORE_TEMPLATE(IN_PROGRESS)}, ${STORE_TEMPLATE(DONE)}). Idempotent: existing
  template files are left unchanged. After seeding, resolve the \"WORKFLOW\"
  markers in each template (one-time policy decisions) and shape your hooks;
  \"backlog help\" documents hook names & semantics.`,
  new: `backlog new <name> [-y]
  Drafts a numbered increment in ${STORE_DIR(TODO)}. The name is slugified
  (lowercase, kebab-case) and prefixed with the next 5-digit sequence number
  (global max+1 across ${STORE}/**/*.md, starting at 00001). The increment is
  scaffolded from ${STORE_TEMPLATE(TODO)}, which may include [hook: pre-enter]
  and [hook: post-enter] entries. -y skips the pre-enter gate (non-interactive).`,
  start: `backlog start [-y] [<id-or-name>]
  Moves a todo increment to in-progress/. <id-or-name> matches by full name,
  slug, or number; omitting it implies the solo todo item (error if none or
  several). Fires todo [hook: pre-exit] then in-progress [hook: pre-enter] as
  gates, appends ${STORE_TEMPLATE(IN_PROGRESS)}, and moves the file (git mv when
  inside a repo, otherwise plain mv with a warning).`,
  done: `backlog done [-y] [<id-or-name>]
  Moves an in-progress increment to done/. Matching rules are the same as
  start. Fires in-progress [hook: pre-exit] then done [hook: pre-enter] as
  gates, appends ${
    STORE_TEMPLATE(
      DONE,
    )
  }, and moves the file. done is terminal: its
  exit hooks never fire.`,
  list: `backlog list [--done [--all]] [--grep <regex>]
  Shows in-progress, then todo (each sorted by slug). --done appends the 5
  most recent done increments; --done --all shows every done increment.
  --grep filters each filename (slug) by a regular expression.`,
  help: `backlog help [--short]
  Prints workflow + usage. --short adds \"run backlog help now\".`,
  "--version": `backlog --version
  Prints the version this backlog binary was built from and exits.`,
  version: `backlog version
  Prints the version this backlog binary was built from and exits.`,
};

function wantHelp(rest: string[]): boolean {
  return rest.includes("-h") || rest.includes("--help");
}

export async function run(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd && SUBHELP[cmd] && wantHelp(rest)) {
    out(SUBHELP[cmd]);
    return 0;
  }
  if (cmd === "--version" || cmd === "version") {
    out(version());
    return 0;
  }
  switch (cmd) {
    case "init":
      return initCmd();
    case "new":
      return await newCmd(rest);
    case "start":
      return await startCmd(rest);
    case "done":
      return await doneCmd(rest);
    case "list":
      return listCmd(rest);
    case "help":
    case undefined:
      return helpCmd(rest);
    default:
      err(`unknown command: ${cmd}`);
      out(HELP);
      return 1;
  }
}
