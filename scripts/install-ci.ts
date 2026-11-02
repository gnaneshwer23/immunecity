/** Exact versions and integrity hashes; avoid a sandbox-only registry mirror. */
import { mkdirSync, readFileSync, writeFileSync, symlinkSync, existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const destination = resolve(root, ".ci-dependencies");
mkdirSync(destination, { recursive: true });
writeFileSync(resolve(destination, "package.json"), readFileSync(resolve(root, "package.json")));
const lock = readFileSync(resolve(root, "bun.lock"), "utf8").replaceAll("https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/", "https://registry.npmjs.org/");
writeFileSync(resolve(destination, "bun.lock"), lock);
const install = Bun.spawnSync([process.execPath, "install", "--frozen-lockfile"], { cwd: destination, stdout: "inherit", stderr: "inherit" });
if (install.exitCode) process.exit(install.exitCode);
const modules = resolve(root, "node_modules");
if (!existsSync(modules)) symlinkSync(resolve(destination, "node_modules"), modules, "dir");
else if (realpathSync(modules) !== realpathSync(resolve(destination, "node_modules"))) throw new Error("Existing node_modules belongs to another install; preserve it and use a clean checkout for install-ci.");
