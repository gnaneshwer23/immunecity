import { readFileSync } from "node:fs";
import { loadVendoredHsiDiscovery } from "../src/lib/hsi/vendoredDiscovery";
const provenance = JSON.parse(readFileSync(new URL("../public/hsi-discovery/source-provenance.json", import.meta.url), "utf8"));
if (provenance.schemaVersion !== "hsi-consumer-provenance-1" || provenance.repository !== "gnaneshwer23/hsi-core" || !/^[a-f0-9]{40}$/.test(provenance.revision) || provenance.workingTree !== "clean") throw new Error("Release requires a recorded clean HSI producer revision");
const result = await loadVendoredHsiDiscovery();
console.log(`Verified HSI release from ${provenance.revision}; ${result.loadedFiles.length} contract artifacts; no database writes.`);
