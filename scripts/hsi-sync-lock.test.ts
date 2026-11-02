import { expect, it } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

it("a blocked sync preserves another writer's lock and the retained snapshot", () => {
  const root = resolve(import.meta.dir, "..");
  const lock = join(root, ".hsi-sync.lock");
  const catalogue = join(root, "public/hsi-discovery/catalogue.json");
  const previous = readFileSync(catalogue, "utf8");
  const source = mkdtempSync(join(tmpdir(), "isi-source-fixture-"));
  mkdirSync(join(source, "src"));
  writeFileSync(join(source, "src/index.ts"), "// fixture; must never be executed");
  writeFileSync(lock, "owned by test", { flag: "wx" });
  try {
    const result = Bun.spawnSync([process.execPath, join(root, "scripts/sync-hsi-from-core.ts")], { env: { ...process.env, HSI_CORE_PATH: source } });
    expect(result.exitCode).toBe(1);
    expect(new TextDecoder().decode(result.stderr)).toContain("locked by another writer");
    expect(existsSync(lock)).toBe(true);
    expect(readFileSync(lock, "utf8")).toBe("owned by test");
    expect(readFileSync(catalogue, "utf8")).toBe(previous);
  } finally { unlinkSync(lock); rmSync(source, { recursive: true, force: true }); }
});
