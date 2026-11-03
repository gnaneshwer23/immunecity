import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import fixture from "./fixtures/shared-research-contract.json";
import provenance from "@/lib/hsi/vendor/investigationService.provenance.json";
import raProvenance from "@/lib/hsi/vendor/raEvidenceRelease.provenance.json";
import { researchRunState, parseResearchBundle } from "@/lib/hsi/vendor/researchContracts";
import { createInvestigationService, createMemoryInvestigationStore, createCorpusRetrievalProvider, INVESTIGATION_SERVICE_VERSION } from "@/lib/hsi/vendor/investigationService";

test("ISI pins the canonical executable investigation service", () => {
  expect(createHash("sha256").update(readFileSync("src/lib/hsi/vendor/investigationService.ts")).digest("hex")).toBe(provenance.sha256);
  expect(provenance.version).toBe(INVESTIGATION_SERVICE_VERSION);
  expect(createHash("sha256").update(readFileSync("src/lib/hsi/vendor/raEvidenceRelease.ts")).digest("hex")).toBe(raProvenance.sha256);
  expect(provenance.includesProductData).toBe(false);
});
test("ISI executes shared investigation through review and dossier without changing its graph", async () => {
  // Test identity adapter only: product authentication/database wiring is a separate milestone.
  const token = Symbol("fixture-session");
  const service = createInvestigationService({ store: createMemoryInvestigationStore(), providers: { retrieval: createCorpusRetrievalProvider() },
    authorize: async (credential, _action, key) => {
      if (credential !== token || key !== "isi-test") throw new Error("Denied fixture session");
      return { id: "fixture-reviewer", role: "reviewer" };
    },
  });
  const pending = await service.start("isi-test", { ...fixture, runs: [] }, token);
  expect(researchRunState(pending.bundle.runs[0]!)).toBe("awaiting_human_review");
  expect(pending.payloads.graph!.relationshipIds).toEqual([fixture.relationships[0]!.id]);
  expect(pending.payloads.hypothesis!.status).toBe("unvalidated");
  const reviewed = await service.review("isi-test", pending.revision, "request_revision", "Test fixture requires scientific evidence.", token);
  expect(researchRunState(reviewed.bundle.runs[0]!)).toBe("completed");
  expect(reviewed.bundle.claims).toEqual(parseResearchBundle(fixture).claims);
  expect(reviewed.payloads.dossier!.review.decision).toBe("request_revision");
  expect((await service.exportDossier("isi-test", token)).markdown).toContain("SYN-PASSAGE-1");
});
