import { withLock } from "./fs.ts";
import { assertEquals } from "@std/assert";

const TMP = `${Deno.cwd()}/.tmp-lock-test`;

function exists(p: string): boolean {
  try {
    Deno.statSync(p);
    return true;
  } catch {
    return false;
  }
}

function prep(): { dir: string; lock: string } {
  try {
    Deno.removeSync(TMP, { recursive: true });
  } catch {
    // dir absent — expected on a fresh run
  }
  Deno.mkdirSync(TMP, { recursive: true });
  return { dir: TMP, lock: `${TMP}/.lock` };
}

Deno.test("withLock runs fn and removes the lock file on exit", () => {
  const { dir, lock } = prep();
  let ran = 0;
  const result = withLock(lock, () => {
    ran++;
    assertEquals(exists(lock), true);
    return 42;
  });
  assertEquals(ran, 1);
  assertEquals(result, 42);
  assertEquals(exists(lock), false);
  Deno.removeSync(dir, { recursive: true });
});

Deno.test("withLock sweeps a pre-existing lock file left by an abandoned run", () => {
  const { lock } = prep();
  Deno.writeTextFileSync(lock, "");
  withLock(lock, () => {});
  assertEquals(exists(lock), false);
});

Deno.test("withLock cleans up even when fn throws", () => {
  const { lock } = prep();
  let threw = false;
  try {
    withLock(lock, () => {
      throw new Error("boom");
    });
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(exists(lock), false);
});
