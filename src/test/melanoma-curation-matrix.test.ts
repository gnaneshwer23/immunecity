/**
 * Melanoma pilot curation matrix — engineering aid only; still unreviewed.
 */
import { describe, expect, it } from "bun:test";
import {
  ISI_MELANOMA_PILOT_VALIDATION_MATRIX,
  melanomaMatrixByFlag,
  melanomaMatrixSummary,
} from "@/data/melanomaPilotValidationMatrix";
import { edgeByRel } from "@/lib/immune/engine";

describe("Melanoma pilot validation matrix export", () => {
  it("exports 15 unreviewed rows with real graph relIds", () => {
    expect(ISI_MELANOMA_PILOT_VALIDATION_MATRIX).toHaveLength(15);
    for (const row of ISI_MELANOMA_PILOT_VALIDATION_MATRIX) {
      expect(row.reviewed).toBe(false);
      expect(edgeByRel[row.relId]).toBeTruthy();
    }
    const summary = melanomaMatrixSummary();
    expect(summary.reviewedCount).toBe(0);
    expect(summary.unreviewed).toBe(true);
  });

  it("flags TO_BE_CURATED and rejected PMID without inventing Gate C", () => {
    const toBe = melanomaMatrixByFlag("TO_BE_CURATED");
    expect(toBe.length).toBeGreaterThanOrEqual(5);
    const rejected = melanomaMatrixByFlag("REJECTED_PMID");
    expect(rejected.some((r) => r.relId === "REL-I008-demonstrates_in-TR003")).toBe(true);
    expect(rejected.every((r) => r.reviewed === false)).toBe(true);
  });

  it("S-P-O mismatch row stays SME-blocked", () => {
    const spo = melanomaMatrixByFlag("S_P_O_MISMATCH");
    expect(spo.some((r) => r.relId.includes("drives_immune_exhaustion"))).toBe(true);
    expect(spo.every((r) => /SME|do not bulk-approve/i.test(r.curatorAction))).toBe(true);
  });
});
