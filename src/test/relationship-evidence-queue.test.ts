import { describe, expect, it } from "vitest";
import {
  buildRelationshipEvidenceQueue,
  relationshipQueueCoverageSummary,
} from "@/lib/immune/relationshipEvidenceQueue";
import { edgeByRel } from "@/lib/immune/engine";

describe("relationship evidence queue", () => {
  it("builds unreviewed relationship-mapped candidates from KG cites only", () => {
    const m = buildRelationshipEvidenceQueue({ generatedAt: "2026-10-11T00:00:00.000Z" });
    expect(m.meta.curation).toBe("unreviewed");
    expect(m.meta.stats.candidateSlots).toBeGreaterThan(0);
    expect(m.meta.stats.relationshipsWithCite).toBeGreaterThan(0);
    expect(m.meta.stats.remainingWithoutCite).toBeGreaterThan(0);

    for (const g of m.evidence_records) {
      for (const e of g.evidence) {
        expect(e.claim_support).toBe("unassessed");
        expect(e.status).toBe("candidate");
        expect(edgeByRel[e.relationship_id]).toBeTruthy();
        expect(e.source_ref).toBeTruthy();
        expect(e.source_ref).not.toBe("TO_BE_CURATED");
      }
    }

    const cov = relationshipQueueCoverageSummary(m);
    expect(cov.approvedClaimLinks).toBe(0);
    expect(cov.mappedRelationships).toBe(m.meta.stats.relationshipsWithCite);
  });

  it("attaches PMIDs only when provided (never invents them)", () => {
    const bare = buildRelationshipEvidenceQueue();
    const firstCite = bare.evidence_records[0]?.evidence[0]?.source_ref;
    expect(firstCite).toBeTruthy();
    const withPmid = buildRelationshipEvidenceQueue({
      pmidByCite: { [firstCite!]: "12345678" },
    });
    const hit = withPmid.evidence_records.flatMap((g) => g.evidence).find((e) => e.source_ref === firstCite);
    expect(hit?.pmid).toBe("12345678");
    const other = withPmid.evidence_records.flatMap((g) => g.evidence).find((e) => e.source_ref !== firstCite);
    if (other) expect(other.pmid).toBeUndefined();
  });
});
