import { readdirSync, readFileSync } from "node:fs";
const suites = readdirSync("src/test")
  .filter((name) => /\.(test|spec)\.tsx?$/.test(name) && /from ["']bun:test["']/.test(readFileSync(`src/test/${name}`, "utf8")))
  .sort().map((name) => `src/test/${name}`);
if (!suites.length) throw new Error("No Bun suites discovered");
const result = Bun.spawnSync([process.execPath, "test", ...suites, "scripts/hsi-bundled-discovery.test.ts", "scripts/hsi-sync-lock.test.ts"], { stdout: "inherit", stderr: "inherit" });
process.exit(result.exitCode);
