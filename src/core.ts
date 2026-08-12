export const TODO = "todo";
export const IN_PROGRESS = "in-progress";
export const DONE = "done";

export const STATE_ORDER = [TODO, IN_PROGRESS, DONE] as const;

export const TEMPLATE_NAME: Record<string, string> = {
  [TODO]: ".todo.md",
  [IN_PROGRESS]: ".in-progress.md",
  [DONE]: ".done.md",
};

export type HookName = "pre-enter" | "post-enter" | "pre-exit" | "post-exit";

const HOOK_RE = /\[hook:\s*([a-zA-Z][a-zA-Z0-9-]*)\]/;
const HEADING_RE = /^\s*(#{1,6})\s+/;

export interface ParsedHook {
  name: string;
  content: string;
}

export function baseName(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1];
}

export function withoutExt(p: string): string {
  return p.endsWith(".md") ? p.slice(0, -3) : p;
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function padId(n: number): string {
  return String(n).padStart(5, "0");
}

export function fileName(id: number, slug: string): string {
  return `${padId(id)}-${slug}.md`;
}

export function idFromFile(p: string): number | null {
  const m = /^(\d+)-/.exec(baseName(p));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function slugFromFile(p: string): string {
  return baseName(withoutExt(p)).replace(/^\d+-/, "");
}

export function nextId(ids: number[]): number {
  return ids.length ? Math.max(...ids) + 1 : 1;
}

export function matches(file: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const base = baseName(withoutExt(file)).toLowerCase();
  const slug = slugFromFile(file).toLowerCase();
  const id = idFromFile(file);

  if (base === q) return true;
  if (slug === q) return true;

  // A leading numeric token is always treated as the id when present.
  const sep = q.indexOf("-");
  const first = sep === -1 ? q : q.slice(0, sep);
  const rest = sep === -1 ? "" : q.slice(sep + 1);
  const idPart = /^\d+$/.test(first) ? Number(first) : null;
  if (idPart !== null) {
    if (id === null || idPart !== id) return false;
    return rest === "" || slug.startsWith(rest);
  }

  // Plain fragment: matched when the target slug starts with it. Uniqueness
  // is enforced by resolveOne, so an ambiguous prefix stays ambiguous.
  return slug.startsWith(q);
}

function headingLevel(line: string): number {
  const m = HEADING_RE.exec(line);
  return m ? m[1].length : 0;
}

function isBodyLine(line: string): boolean {
  return line.trim() !== "" && headingLevel(line) === 0 && !HOOK_RE.test(line);
}

function trimLines(lines: string[]): string {
  while (lines.length && lines[0].trim() === "") lines.shift();
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.join("\n");
}

function extractBlock(lines: string[], i: number): string {
  const level = headingLevel(lines[i]);
  const out: string[] = [];
  if (level > 0) {
    out.push(lines[i]);
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      const lvl = headingLevel(l);
      if (lvl > 0 && lvl <= level) break;
      if (HOOK_RE.test(l)) break;
      out.push(l);
    }
    return trimLines(out);
  }

  // Inline hook: expand back over the paragraph, forward to the next heading
  // or hook marker, preserving interior blank lines so lists and paragraphs
  // after a lead-in line are kept.
  let start = i;
  while (start > 0 && isBodyLine(lines[start - 1])) start--;
  let end = i;
  while (end + 1 < lines.length) {
    const l = lines[end + 1];
    if (headingLevel(l) > 0) break;
    if (HOOK_RE.test(l)) break;
    end++;
  }
  for (let j = start; j <= end; j++) out.push(lines[j]);
  return trimLines(out);
}

export function extractHooks(template: string): ParsedHook[] {
  const lines = template.replace(/\r\n/g, "\n").split("\n");
  const hooks: ParsedHook[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HOOK_RE.exec(lines[i]);
    if (!m) continue;
    hooks.push({ name: m[1], content: extractBlock(lines, i) });
  }
  return hooks;
}

export function appendTemplate(taskContent: string, template: string): string {
  const t = template.replace(/\r\n/g, "\n").trimEnd();
  const base = taskContent.replace(/\r\n/g, "\n").trimEnd();
  return base ? `${base}\n\n${t}\n` : `${t}\n`;
}

/** Sorts done files by id desc and keeps the most recent `limit`. */
export function recentDone(files: string[], limit: number): string[] {
  return [...files].sort((a, b) => (idFromFile(b) ?? 0) - (idFromFile(a) ?? 0))
    .slice(0, limit);
}
