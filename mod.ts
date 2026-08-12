import { run } from "./src/cli.ts";

Deno.exit(await run(Deno.args));
