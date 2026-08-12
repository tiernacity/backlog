import { TEMPLATE_NAME } from "./core.ts";

export function cwd(): string {
  return Deno.cwd();
}

export function joinPath(...parts: string[]): string {
  return parts.filter((p) => p !== "").join("/");
}

export function dirName(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : ".";
}

export function ensureDir(p: string): void {
  Deno.mkdirSync(p, { recursive: true });
}

export function exists(p: string): boolean {
  try {
    Deno.statSync(p);
    return true;
  } catch {
    return false;
  }
}

export function readText(p: string | URL): string {
  return Deno.readTextFileSync(p);
}

export function writeText(p: string, data: string): void {
  ensureDir(dirName(p));
  Deno.writeTextFileSync(p, data, { createNew: false });
}

export function readOptional(p: string): string | null {
  return exists(p) ? readText(p) : null;
}

export function listFiles(dir: string): string[] {
  const out: string[] = [];
  function walk(d: string): void {
    for (const e of Deno.readDirSync(d)) {
      const path = joinPath(d, e.name);
      if (e.isDirectory) walk(path);
      else out.push(path);
    }
  }
  if (exists(dir)) walk(dir);
  return out;
}

export function isGitRepo(): boolean {
  const r = new Deno.Command("git", {
    args: ["rev-parse", "--is-inside-work-tree"],
  }).outputSync();
  return r.success && new TextDecoder().decode(r.stdout).trim() === "true";
}

export function gitMv(src: string, dst: string): boolean {
  const r = new Deno.Command("git", { args: ["mv", src, dst] }).outputSync();
  return r.success;
}

export function plainMv(src: string, dst: string): void {
  Deno.renameSync(src, dst);
}

export function defaultTemplateUrl(state: string): URL {
  const name = TEMPLATE_NAME[state];
  // `./` from ./src/fs.ts reaches src/ (source), and the bundle root when
  // compiled, where `--include` files are placed.
  return new URL(`./${name}`, import.meta.url);
}
