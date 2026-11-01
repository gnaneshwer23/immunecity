#!/usr/bin/env bun
/**
 * Refresh ISI HSI consume pins from the local hsi-core checkout.
 * Run only on a machine that has ~/Projects/hsi-core (not on Vercel).
 */
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HSI_CORE = process.env.HSI_CORE_PATH ?? "/Users/gnaneshwerjadav/Projects/hsi-core";
const ROOT = join(import.meta.dir, "..");

if (!existsSync(HSI_CORE)) {
  console.error(`hsi-core not found at ${HSI_CORE}`);
  process.exit(1);
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
if (existsSync(exportSrc)) {
  cpSync(exportSrc, exportDest);
  console.log("updated src/data/hsi-isi-export.json");
}

const discoverySrc = join(HSI_CORE, "site/public/discovery");
const discoveryDest = join(ROOT, "public/hsi-discovery");
if (existsSync(discoverySrc)) {
  mkdirSync(discoveryDest, { recursive: true });
  cpSync(discoverySrc, discoveryDest, { recursive: true });
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

writeFileSync(
  join(ROOT, "src/data/.hsi-sync-stamp"),
  `${new Date().toISOString()} from ${HSI_CORE}\n`,
);
console.log("hsi sync complete");
