/**
 * HSI Discovery product loop — load + honesty + MAP/REVIEW shaping.
 * Run: bun test src/test/hsi-discovery-loop.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertHonestyFlags,
  type IsiConsumeContract,
  type PartnerLock,
  type PilotEvidencePack,
} from "@/lib/hsi/discoveryConsume";
import {
  evidenceToGraphEdges,
  gradeCounts,
  partnerScopedEvidenceRows,
  raCompetingExplanations,
  r2HypothesisCards,
  translationCandidates,
} from "@/lib/hsi/discoveryLoopView";

const vendorDir = join(import.meta.dir, "../../public/hsi-discovery");

function loadVendor<T>(name: string): T {
  return JSON.parse(readFileSync(join(vendorDir, name), "utf8")) as T;
}

describe("HSI Discovery product loop", () => {
  it("vendored packs satisfy honesty + Gate C pending for product UI", () => {
    const index = loadVendor<Record<string, unknown>>("index.json");
    const contract = loadVendor<IsiConsumeContract>("hsi-isi-consume-contract.json");
    const lock = loadVendor<PartnerLock>("hsi-partner-lock.json");
    assertHonestyFlags(index as never, "index");
    assertHonestyFlags(contract, "contract");
    assertHonestyFlags(lock, "lock", { requireNotCds: false });
    expect(contract.notCds).toBe(true);
    expect(contract.autoApproveIntoKg).toBe(false);
    expect(contract.gateC.autoApprove).toBe(false);
    expect(contract.gateC.statusOnPublish).toBe("pending");
    expect(lock.activeScope).toBe("ra-tnf");
    expect(lock.partner?.id).toBe("partner:apolo-pharma");
  });

  it("scopes MAP evidence to partner pathway claim IDs", () => {
    const pack = loadVendor<PilotEvidencePack>("hsi-pilot-evidence-pack.json");
    const lock = loadVendor<PartnerLock>("hsi-partner-lock.json");
    const rows = partnerScopedEvidenceRows(pack.evidenceMap, lock, pack.partnerLock);
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(rows.every((r) => r.claimId.includes("-RA-") || r.claimId.includes("-IM-"))).toBe(
      true,
    );
    const counts = gradeCounts(rows);
    expect(counts.established + counts.uncertain + counts.unexplored).toBe(rows.length);
    const edges = evidenceToGraphEdges(rows);
    expect(edges.length).toBe(rows.length);
    expect(edges[0]?.subject).toBeTruthy();
  });

  it("REVIEW competing explanations exclude SLE illustrative slots", () => {
    const pack = loadVendor<PilotEvidencePack>("hsi-pilot-evidence-pack.json");
    const explanations = raCompetingExplanations(pack.competingExplanations);
    expect(explanations.length).toBeGreaterThanOrEqual(4);
    expect(explanations.every((e) => !e.id.includes("sle"))).toBe(true);
  });

  it("optional VALIDATE / TRANSLATE packs load without blocking MVP", () => {
    const r2 = loadVendor<Record<string, unknown>>("hsi-r2-validation.json");
    const translation = loadVendor<Record<string, unknown>>("hsi-translation-handoff.json");
    expect(r2.notCds).toBe(true);
    expect(translation.notCds).toBe(true);
    expect(translation.clinicalActive).toBe(false);
    const cards = r2HypothesisCards(r2);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((c) => c.autoApproved === false)).toBe(true);
    const candidates = translationCandidates(translation);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.cdsSurfacable === false)).toBe(true);
    expect(candidates.every((c) => c.clinicalUse.includes("not_for_clinical"))).toBe(true);
  });
});
