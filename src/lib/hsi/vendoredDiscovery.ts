/** Deployable HSI snapshot: no server self-fetch or private GitHub runtime dependency. */
import index from "../../../public/hsi-discovery/catalogue.json";
import contract from "../../../public/hsi-discovery/hsi-isi-consume-contract.json";
import lock from "../../../public/hsi-discovery/hsi-partner-lock.json";
import pack from "../../../public/hsi-discovery/hsi-pilot-evidence-pack.json";
import gateC from "../../../public/hsi-discovery/gate-c-checklist.json";
import vertical from "../../../public/hsi-discovery/hsi-vertical-decision.json";
import licensing from "../../../public/hsi-discovery/hsi-source-licensing-stub.json";
import flipReadiness from "../../../public/hsi-discovery/hsi-partner-flip-readiness.json";
import r2 from "../../../public/hsi-discovery/hsi-r2-validation.json";
import translation from "../../../public/hsi-discovery/hsi-translation-handoff.json";
import { loadHsiDiscoveryConsume } from "./discoveryConsume";

const artifacts: Record<string, unknown> = {
  "catalogue.json": index,
  "hsi-isi-consume-contract.json": contract,
  "hsi-partner-lock.json": lock,
  "hsi-pilot-evidence-pack.json": pack,
  "gate-c-checklist.json": gateC,
  "hsi-vertical-decision.json": vertical,
  "hsi-source-licensing-stub.json": licensing,
  "hsi-partner-flip-readiness.json": flipReadiness,
  "hsi-r2-validation.json": r2,
  "hsi-translation-handoff.json": translation,
};

export function loadVendoredHsiDiscovery() {
  return loadHsiDiscoveryConsume({
    preferLocal: true,
    readArtifact: async (file) => {
      if (!Object.hasOwn(artifacts, file)) throw new Error(`Missing bundled HSI artifact: ${file}`);
      return structuredClone(artifacts[file]);
    },
  });
}
