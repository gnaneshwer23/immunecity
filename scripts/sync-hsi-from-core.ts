#!/usr/bin/env bun
/**
 * Refresh ISI HSI consume pins from the local hsi-core checkout.
 * Defaults to a sibling hsi-core checkout; override HSI_CORE_PATH when needed.
 * Generates in isolation; run for an intentional snapshot refresh, not on Vercel.
 */
import { cpSync, existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync, readFileSync, symlinkSync, openSync, closeSync, unlinkSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { tmpdir } from "node:os";
import { assertHonestyFlags } from "../src/lib/hsi/discoveryConsume";

const ROOT = join(import.meta.dir, "..");
const SOURCE_CORE = resolve(process.env.HSI_CORE_PATH ?? join(ROOT, "../hsi-core"));

if (!existsSync(join(SOURCE_CORE, "src/index.ts"))) {
  console.error(`hsi-core not found at ${SOURCE_CORE}; set HSI_CORE_PATH to its checkout.`);
  process.exit(1);
}

// Serialise multi-file snapshot writers; never steal an existing lock.
const lockPath = join(ROOT, ".hsi-sync.lock");
let lockDescriptor: number;
try { lockDescriptor = openSync(lockPath, "wx", 0o600); } catch { throw new Error("HSI snapshot sync is locked by another writer"); }
process.on("exit", () => { closeSync(lockDescriptor); unlinkSync(lockPath); });
// Publish refreshes tracked site JSON. Generate in isolation, preserving all HSI work.
const stage = mkdtempSync(join(tmpdir(), "isi-hsi-sync-"));
process.on("exit", () => rmSync(stage, { recursive: true, force: true }));
const HSI_CORE = join(stage, "hsi-core");
cpSync(SOURCE_CORE, HSI_CORE, {
  recursive: true,
  filter: (path) => !relative(SOURCE_CORE, path).split(/[\\/]/).some((part) =>
    [".git", "node_modules", "dist"].includes(part) || part.startsWith(".env")),
});
if (existsSync(join(SOURCE_CORE, "node_modules"))) {
  symlinkSync(join(SOURCE_CORE, "node_modules"), join(HSI_CORE, "node_modules"), "dir");
}

const exportProc = Bun.spawnSync(["bun", "run", "export:isi"], {
  cwd: HSI_CORE,
  stdout: "inherit",
  stderr: "inherit",
});
if (exportProc.exitCode !== 0) process.exit(exportProc.exitCode ?? 1);

const outputsProc = Bun.spawnSync(["bun", "run", "outputs"], {
  cwd: HSI_CORE,
  stdout: "inherit",
  stderr: "inherit",
});
if (outputsProc.exitCode !== 0) process.exit(outputsProc.exitCode ?? 1);

const exportSrc = join(HSI_CORE, "exports/hsi-isi-export.json");
const exportDest = join(ROOT, "src/data/hsi-isi-export.json");
const stagedDiscovery = join(HSI_CORE, "site/public/discovery");
for (const name of ["catalogue.json", "hsi-isi-consume-contract.json", "gate-c-checklist.json"]) {
  assertHonestyFlags(JSON.parse(readFileSync(join(stagedDiscovery, name), "utf8")), name);
}
assertHonestyFlags(JSON.parse(readFileSync(join(stagedDiscovery, "hsi-partner-lock.json"), "utf8")), "partner-lock", { requireNotCds: false });
const stagedPack = JSON.parse(readFileSync(join(stagedDiscovery, "hsi-pilot-evidence-pack.json"), "utf8"));
const stagedLock = JSON.parse(readFileSync(join(stagedDiscovery, "hsi-partner-lock.json"), "utf8"));
assertHonestyFlags({ ...stagedPack, partnerSigned: undefined }, "pilot-pack");
if (stagedPack.partnerSigned !== stagedLock.partnerSigned || stagedPack.lockedPilot !== stagedLock.lockedPilot) {
  throw new Error("pilot-pack partner flags differ from validated lock");
}
if (existsSync(exportSrc)) {
  cpSync(exportSrc, exportDest);
  console.log("updated src/data/hsi-isi-export.json");
}

const discoverySrc = join(HSI_CORE, "site/public/discovery");
const discoveryDest = join(ROOT, "public/hsi-discovery");
if (existsSync(discoverySrc)) {
  mkdirSync(discoveryDest, { recursive: true });
  cpSync(discoverySrc, discoveryDest, { recursive: true });
  // Keep the old catalogue alias consistent; never retain a stale partner claim.
  cpSync(join(discoverySrc, "catalogue.json"), join(discoveryDest, "index.json"));
  console.log("updated public/hsi-discovery/");
}

const pinProc = Bun.spawnSync(
  [
    "bun",
    "-e",
    `
import {
  listIsiRelSuggestions,
  HSI_T2D_IMMUNO_SEED_EDGES,
  HSI_T2D_IMMUNO_SEED_CLAIMS,
  HSI_MARKERS,
  HSI_EXAMPLE_TRANSLATION_CARDS,
  HSI_SAFETY_RELEASE_CRITERIA_V0,
  HSI_ALLOWED_AGENT_SURFACES_V0,
  HSI_DOMAINS,
  HSI_EDGE_TYPES,
  buildIsiExportBundle,
} from "./src/index.ts";
import { writeFileSync } from "fs";
const pin = {
  schemaVersion: "hsi-isi-substrate-pin-1",
  notCds: true,
  generatedAt: new Date().toISOString(),
  domains: [...HSI_DOMAINS],
  edgeTypes: [...HSI_EDGE_TYPES],
  edges: HSI_T2D_IMMUNO_SEED_EDGES,
  claims: HSI_T2D_IMMUNO_SEED_CLAIMS,
  markers: HSI_MARKERS,
  isiRelSuggestions: listIsiRelSuggestions(),
  translationCards: HSI_EXAMPLE_TRANSLATION_CARDS,
  safetyCriteria: HSI_SAFETY_RELEASE_CRITERIA_V0,
  allowedAgentSurfaces: [...HSI_ALLOWED_AGENT_SURFACES_V0],
  exportBundle: buildIsiExportBundle({ generatedAt: new Date().toISOString() }),
};
writeFileSync(${JSON.stringify(join(ROOT, "src/data/hsi-substrate-pin.json"))}, JSON.stringify(pin, null, 2) + "\\n");
console.log("updated src/data/hsi-substrate-pin.json", pin.edges.length, "edges");
`,
  ],
  { cwd: HSI_CORE, stdout: "inherit", stderr: "inherit" },
);
if (pinProc.exitCode !== 0) process.exit(pinProc.exitCode ?? 1);

const revisionProc = Bun.spawnSync(["git", "-C", SOURCE_CORE, "rev-parse", "HEAD"]);
if (revisionProc.exitCode !== 0) throw new Error("Cannot identify HSI source revision");
const statusProc = Bun.spawnSync(["git", "-C", SOURCE_CORE, "status", "--porcelain", "--untracked-files=normal"]);
if (statusProc.exitCode !== 0) throw new Error("Cannot identify HSI source working-tree state");
writeFileSync(join(ROOT, "public/hsi-discovery/source-provenance.json"), JSON.stringify({
  schemaVersion: "hsi-consumer-provenance-1",
  repository: "gnaneshwer23/hsi-core",
  revision: new TextDecoder().decode(revisionProc.stdout).trim(),
  workingTree: new TextDecoder().decode(statusProc.stdout).trim() ? "includes_local_changes" : "clean",
}, null, 2) + "\n");

writeFileSync(
  join(ROOT, "src/data/.hsi-sync-stamp"),
  `${new Date().toISOString()} from ${SOURCE_CORE}\n`,
);
console.log("hsi sync complete");
