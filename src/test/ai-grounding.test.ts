import { describe, expect, it } from "vitest";
import {
  classifyAskQuery,
  graphContext,
  isPersonalClinical,
  prepareAsk,
  rateLimited,
  relevantNodes,
  validateAnswerCitations,
  SYSTEM,
  PROMPT_VERSION,
} from "@/lib/askGrounding";
import { KG, edgeByRel, relId } from "@/lib/immune/engine";
import { relationshipStatus } from "@/lib/immune/evidenceStatus";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";

describe("relationship IDs", () => {
  it("are unique-addressable and round-trip", () => {
    KG.relationships.forEach((r) => expect(edgeByRel[relId(r)]).toBeTruthy());
  });
});

describe("evidence status", () => {
  const e = KG.relationships.find((r) => !r.reference && !r.draft && !(r.source_refs || []).length) ?? KG.relationships[0]!;
  const c = (claim_support: string, rid = relId(e)) => ({ relationship_id: rid, claim_support, label: "x", url: "x", evidence_id: "E1", reviewed_at: null });
  it("concept-level citations never support a link", () => {
    expect(relationshipStatus(e, [c("supports", "")].map((x) => ({ ...x, relationship_id: null })))).not.toBe("approved");
  });
  it("claim-checked support approves; contradiction conflicts", () => {
    expect(relationshipStatus(e, [c("supports")])).toBe("approved");
    expect(relationshipStatus(e, [c("supports"), { ...c("contradicts"), evidence_id: "E2" }])).toBe("conflicting");
  });
});

describe("graph release", () => {
  it("separates core and draft counts", () => {
    const s = graphReleaseSnapshot();
    expect(s.coreVersion).toBeTruthy();
    expect(s.coreNodes + s.draftNodes).toBe(s.runtimeNodes);
    expect(s.coreRelationships + s.draftRelationships).toBe(s.runtimeRelationships);
    expect(s.runtimeNodes).toBe(KG.nodes.length);
  });
});

describe("AI grounding", () => {
  it("retrieves the named concept", () => {
    const tnf = KG.nodes.find((n) => /^TNF/i.test(n.name))!;
    expect(relevantNodes("How does TNF cause inflammation?").map((n) => n.id)).toContain(tnf.id);
  });
  it("cites only real relationship IDs", () => {
    const ctx = graphContext("macrophage cytokines");
    expect(ctx.relIds.length).toBeGreaterThan(0);
    ctx.relIds.forEach((id) => expect(edgeByRel[id]).toBeTruthy());
    expect(ctx.text).toContain("LINK REL-");
    expect(ctx.links.every((l) => edgeByRel[l.relId])).toBe(true);
    expect(ctx.trace.promptVersion).toBe(PROMPT_VERSION);
  });
  it("exposes evidence tiers and optional causal chains", () => {
    const ctx = graphContext("How does TNF drive rheumatoid arthritis?");
    expect(ctx.coverage.matched).toBe(true);
    expect(ctx.links.some((l) => l.tier)).toBe(true);
    expect(ctx.text).toMatch(/COVERAGE_SUMMARY|CAUSAL_CHAINS|LINK REL-/);
    expect(ctx.queryClass).toBe("graph_explanation");
  });
  it("flags an empty extract for unsupported questions", () => {
    expect(graphContext("zzqx").text).toMatch(/NO_MATCH/);
    expect(graphContext("zzqx").coverage.matched).toBe(false);
    expect(SYSTEM).toMatch(/does not cover/);
  });
  it("classifies and abstains without calling the model when unsupported", () => {
    const p = prepareAsk("zzqxzyxq nonontology foobarium");
    expect(p.callModel).toBe(false);
    expect(p.queryClass).toBe("unsupported");
    expect(p.grounding.trace.abstained).toBe(true);
  });
  it("classifies clinical and omics requests", () => {
    expect(classifyAskQuery("What dose of prednisone should I take?")).toBe("clinical_personal");
    expect(classifyAskQuery("Run scRNA-seq on this AnnData file")).toBe("omics_request");
    expect(prepareAsk("Run scRNA-seq on this AnnData file").callModel).toBe(false);
  });
  it("validates answer citations against retrieved IDs", () => {
    const g = graphContext("How does TNF drive rheumatoid arthritis?");
    const ok = validateAnswerCitations(
      "TNF [TNF](concept:M001) to [RA](concept:D001) via [link](edge:REL-M001-contributes_to-D001).",
      g,
    );
    expect(ok.ok).toBe(true);
    const bad = validateAnswerCitations("See PMID 99999999 and [x](concept:FAKE99).", g);
    expect(bad.ok).toBe(false);
    expect(bad.inventedConceptIds).toContain("FAKE99");
  });
  it("refuses personal clinical questions", () => {
    expect(isPersonalClinical("What dose of prednisone should I take?")).toBe(true);
    expect(isPersonalClinical("How do steroids suppress T cells?")).toBe(false);
  });
  it("rate limits bursts", () => {
    const now = 1_000_000;
    for (let i = 0; i < 8; i++) expect(rateLimited("t2", 8, 60_000, now)).toBe(false);
    expect(rateLimited("t2", 8, 60_000, now)).toBe(true);
  });
});
