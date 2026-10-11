import { describe, expect, it } from "vitest";
import { graphContext, isPersonalClinical, rateLimited, relevantNodes, SYSTEM } from "@/lib/askGrounding";
import { KG, edgeByRel, relId } from "@/lib/immune/engine";
import { relationshipStatus } from "@/lib/immune/evidenceStatus";

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
  });
  it("flags an empty extract for unsupported questions", () => {
    expect(graphContext("zzqx").text).toMatch(/NO_MATCH/);
    expect(SYSTEM).toMatch(/does not cover/);
  });
  it("refuses personal clinical questions", () => {
    expect(isPersonalClinical("What dose of prednisone should I take?")).toBe(true);
    expect(isPersonalClinical("How do steroids suppress T cells?")).toBe(false);
  });
  it("rate limits bursts", () => {
    const now = 1_000_000;
    for (let i = 0; i < 8; i++) expect(rateLimited("t", 8, 60_000, now)).toBe(false);
    expect(rateLimited("t", 8, 60_000, now)).toBe(true);
  });
});
