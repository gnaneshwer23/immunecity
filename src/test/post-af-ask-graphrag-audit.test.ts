/**
 * Post A–F audit — GraphRAG / Ask Immune correctness (unit + integration layer).
 * These are NOT browser E2E tests. Run: bun test src/test/post-af-ask-graphrag-audit.test.ts
 */
import { describe, expect, it } from "bun:test";
import {
  PROMPT_VERSION,
  classifyAskQuery,
  graphContext,
  prepareAsk,
  validateAnswerCitations,
} from "@/lib/askGrounding";
import { detectConflictingEvidence } from "@/lib/immune/claimRecords";

describe("Post-AF GraphRAG — Ask path integrity", () => {
  it("runs ask-grounding-v11+", () => {
    expect(PROMPT_VERSION).toMatch(/^ask-grounding-v1[1-9]/);
  });

  it("melanoma neighbourhood paths require REVIEWED_EVIDENCE honesty (not prose-only)", () => {
    const g = graphContext("How does PD-1 blockade relate to melanoma immunotherapy?");
    expect(g.coverage.matched).toBe(true);
    expect(g.text).toMatch(/GRAPH_NEIGHBOURHOOD/);
    expect(g.text).toMatch(/NPATH/);
    // Either lists Gate C rows or honestly states none — never silent.
    expect(g.text).toMatch(/REVIEWED_EVIDENCE/);
    const hasReviewedBlock = /REVIEWED_EVIDENCE\nEVIDENCE /.test(g.text);
    const hasNone = /REVIEWED_EVIDENCE none for retrieved links/.test(g.text);
    expect(hasReviewedBlock || hasNone).toBe(true);
  });

  it("rejects unsupported mechanistic Gate C overclaims when no reviewed cites", () => {
    const g = graphContext("How does PD-1 drive immune exhaustion in melanoma?");
    expect(g.coverage.reviewedEvidenceCount).toBe(0);
    const v = validateAnswerCitations(
      "Gate C approved support proves PD-1 causally drives immune exhaustion in melanoma via ZAP-70.",
      g,
    );
    expect(v.ok).toBe(false);
    expect(v.unsupportedSupportClaims.length).toBeGreaterThan(0);
  });

  it("rejects fabricated PMIDs not in retrieved evidence", () => {
    const g = graphContext("PD-1 and melanoma");
    const v = validateAnswerCitations("See PMID 99999999 for the mechanism.", g);
    expect(v.ok).toBe(false);
    expect(v.inventedRelIds.some((id) => /99999999/.test(id)) || !v.ok).toBe(true);
  });

  it("surfaces conflicting evidence without collapsing sides", () => {
    const rid = "REL-R011-drives_immune_exhaustion_in-D012";
    const conflict = detectConflictingEvidence(rid, [
      {
        evidence_id: "E-sup",
        relationship_id: rid,
        claim_support: "supports",
        curation: "approved",
        label: "sup",
        url: "",
        pmid: "11111111",
        reviewed_at: "2026-01-01T00:00:00.000Z",
      },
      {
        evidence_id: "E-con",
        relationship_id: rid,
        claim_support: "contradicts",
        curation: "unreviewed",
        label: "con",
        url: "",
        pmid: "22222222",
        reviewed_at: null,
      },
    ]);
    expect(conflict.conflicting).toBe(true);

    const g = graphContext("PD-1 and melanoma");
    const withConflict = {
      ...g,
      counterEvidence: [
        {
          evidence_id: "E-con",
          relationship_id: rid,
          claim_support: "contradicts",
          curation: "unreviewed" as const,
          label: "con",
          url: "",
          pmid: "22222222",
          reviewed_at: null,
        },
      ],
      reviewedCites: [
        {
          evidence_id: "E-sup",
          relationship_id: rid,
          claim_support: "supports",
          curation: "approved" as const,
          label: "sup",
          url: "",
          pmid: "11111111",
          reviewed_at: "2026-01-01T00:00:00.000Z",
          claim_text: "PD-1 signalling contributes to T-cell dysfunction in melanoma TME",
        },
      ],
      coverage: { ...g.coverage, reviewedEvidenceCount: 1 },
    };
    const collapsed = validateAnswerCitations(
      "All sources agree PD-1 definitively causes exhaustion; Gate C approved support via PMID 11111111.",
      withConflict,
    );
    expect(collapsed.ok).toBe(false);
    expect(collapsed.conflictCollapses.length).toBeGreaterThan(0);
  });

  it("fails when Gate C PMID cite window lacks overlapping source passage", () => {
    const g = graphContext("PD-1 and melanoma");
    const withCite = {
      ...g,
      coverage: { ...g.coverage, reviewedEvidenceCount: 1 },
      reviewedCites: [
        {
          evidence_id: "EV-PASS",
          relationship_id: "REL-I008-blocks-R011",
          claim_support: "supports",
          curation: "approved" as const,
          pmid: "25891173",
          doi: "10.1056/NEJMoa1503093",
          label: "PMID 25891173",
          url: "https://pubmed.ncbi.nlm.nih.gov/25891173/",
          reviewed_at: "2026-01-01T00:00:00.000Z",
          claim_text: "Pembrolizumab improved survival versus ipilimumab in advanced melanoma",
          notes: "Pembrolizumab improved survival versus ipilimumab in advanced melanoma",
        },
      ],
      links: g.links.map((l) =>
        l.relId === "REL-I008-blocks-R011"
          ? { ...l, reviewedPmids: ["25891173"], reviewedEvidenceCount: 1, hasClaimSupport: true }
          : l,
      ),
    };
    const mismatch = validateAnswerCitations(
      "Gate C approved support: PMID 25891173 proves entirely unrelated photosynthesis pathways in Arabidopsis.",
      withCite,
    );
    expect(mismatch.ok).toBe(false);
    expect(mismatch.passageMismatchPmids.length + mismatch.unaanchoredClaims.length).toBeGreaterThan(0);
  });

  it("ambiguous / unmatched entity resolution abstains without inventing concepts", () => {
    expect(classifyAskQuery("zzqxzyxq nonontology foobarium")).toBe("unsupported");
    const prep = prepareAsk("zzqxzyxq nonontology foobarium");
    expect(prep.callModel).toBe(false);
    expect(prep.grounding.trace.abstained).toBe(true);
    expect(graphContext("zzqxzyxq").coverage.matched).toBe(false);
  });

  it("unreviewed graph edges must not be labelled Gate C in answers", () => {
    const g = graphContext("Nivolumab blocks PD-1");
    // Graph may retrieve the edge; without reviewed cites, Gate C language fails.
    const v = validateAnswerCitations(
      "Gate C approved support confirms nivolumab blocks PD-1 in all settings.",
      g,
    );
    if (g.coverage.reviewedEvidenceCount === 0) {
      expect(v.ok).toBe(false);
      expect(v.unsupportedSupportClaims.length).toBeGreaterThan(0);
    }
  });

  it("clinical-personal requests abstain (no CDS)", () => {
    const prep = prepareAsk("What dose of pembrolizumab should I take for my melanoma?");
    expect(prep.callModel).toBe(false);
    expect(prep.grounding.queryClass).toBe("clinical_personal");
    expect(prep.grounding.trace.abstained).toBe(true);
  });
});
