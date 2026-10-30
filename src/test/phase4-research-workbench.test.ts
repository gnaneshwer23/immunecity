/**
 * Phase 4 — Research Workbench MVP (ISI audit v1.0).
 * Run: bun test src/test/phase4-research-workbench.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { byId } from "@/lib/immune/engine";
import {
  planEvidenceCollection,
  sanitizeCollectionConceptIds,
  sanitizeEvidenceRefs,
} from "@/lib/research/collections";
import {
  classifyEvidenceGap,
  EVIDENCE_GAP_LABELS,
  evidenceGapLabelText,
} from "@/lib/research/evidenceGap";
import {
  draftResearchBrief,
  exportResearchBriefJson,
  exportResearchBriefMarkdown,
  RESEARCH_BRIEF_KIND,
  validateBriefCitations,
} from "@/lib/research/researchBrief";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

describe("Phase 4 exit gate — reproducible, reviewable, source-traceable", () => {
  it("plans evidence collections from existing concept ids only (no KG write)", () => {
    const plan = planEvidenceCollection({
      userId: "11111111-1111-4111-8111-111111111111",
      name: "PD-1 melanoma",
      conceptIds: ["D012", "invented-node", "I001", "D012"],
      evidenceRefs: ["EV-demo-1", "PMID 12345678", "12345678"],
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.conceptIds).toEqual(["D012", "I001"]);
    expect(plan.evidenceRefs).toEqual(["EV-demo-1"]);
    expect(sanitizeCollectionConceptIds(["nope"])).toEqual([]);
    expect(sanitizeEvidenceRefs(["PMID-999"])).toEqual([]);
    expect(planEvidenceCollection({ userId: null, name: "x", conceptIds: ["D012"] }).ok).toBe(false);

    const schema = source("src/lib/db/schema.server.ts");
    expect(schema).toContain("evidenceCollections");
    expect(schema).toMatch(/Never a KG write/i);
    const sql = source("drizzle/migrations/0016_evidence_collections.sql");
    expect(sql).toContain("evidence_collections");
    expect(sql).toMatch(/Does not alter curated citation rows/);
    expect(sql).not.toMatch(/ALTER TABLE\s+.*evidence_records/i);
    expect(sql).not.toMatch(/INSERT INTO\s+.*evidence_records/i);
    const fns = source("src/lib/research/collections.functions.ts");
    expect(fns).toMatch(/kgWrite:\s*false/);
    expect(fns).not.toMatch(/insert\(evidenceRecords/);
  });

  it("classifies evidence gaps with UI labels without inventing Gate C density", () => {
    expect(EVIDENCE_GAP_LABELS).toEqual([
      "insufficient_coverage",
      "no_mapped_evidence",
      "awaiting_curation",
      "no_direct_evidence_after_search",
      "conflicting",
      "emerging",
    ]);
    expect(evidenceGapLabelText("conflicting")).toMatch(/Conflicting/i);
    expect(evidenceGapLabelText("no_mapped_evidence")).toMatch(/ISI/i);
    expect(evidenceGapLabelText("insufficient_coverage")).toMatch(/unknown/i);

    expect(classifyEvidenceGap("M017")).toBe("emerging");
    expect(classifyEvidenceGap("D012", { approvedSupportsCount: 2 })).toBeNull();
    expect(classifyEvidenceGap("D012", { conflictingCount: 1 })).toBe("conflicting");
    expect(classifyEvidenceGap("D012", { unreviewedMappedCount: 3, approvedSupportsCount: 0 })).toBe(
      "awaiting_curation",
    );
    expect(
      classifyEvidenceGap("D012", {
        searchAttempted: true,
        searchHitCount: 0,
        approvedSupportsCount: 0,
        unreviewedMappedCount: 0,
      }),
    ).toBe("no_direct_evidence_after_search");
    // Missing hit count after searchAttempted must not coerce to zero / worldwide-absence claim.
    expect(
      classifyEvidenceGap("D012", {
        searchAttempted: true,
        approvedSupportsCount: 0,
        unreviewedMappedCount: 0,
      }),
    ).not.toBe("no_direct_evidence_after_search");
    // Without Neon signals: draft/bib → awaiting; clean concept → insufficient_coverage (not verified absence).
    const gap = classifyEvidenceGap("R001");
    expect(
      gap === "awaiting_curation" ||
        gap === "insufficient_coverage" ||
        gap === "emerging" ||
        gap === "no_mapped_evidence",
    ).toBe(true);
    expect(classifyEvidenceGap("D012")).toBe("awaiting_curation");
    expect(classifyEvidenceGap("C002")).toBe("insufficient_coverage");
    expect(classifyEvidenceGap("not-a-node")).toBeNull();
  });

  it("drafts a research brief that fails closed on unsupported ids and clinical advice", () => {
    const ok = draftResearchBrief({
      question: "How does PD-1 relate to melanoma?",
      sources: { conceptIds: ["D012", "I001", "TR003", "B011"], evidenceIds: ["EV-demo-1"], trialIds: ["TR003"] },
      now: new Date("2026-10-30T12:00:00.000Z"),
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.brief.kind).toBe(RESEARCH_BRIEF_KIND);
    expect(ok.brief.label).toBe("AI/draft");
    expect(ok.brief.reviewStatus).toBe("unreviewed");
    expect(ok.brief.kgWrite).toBe(false);
    expect(ok.brief.canApproveIntoKg).toBe(false);
    expect(ok.brief.clinicalAdvice).toBe(false);
    expect(ok.brief.sections.map((s) => s.id)).toEqual([
      "rationale",
      "evidence",
      "hypotheses",
      "biomarkers",
      "trials",
      "limitations",
    ]);
    expect(ok.brief.sourceList.some((s) => s.id === "D012")).toBe(true);
    const md = exportResearchBriefMarkdown(ok.brief);
    expect(md).toContain("AI/draft");
    expect(md).toContain("2026-10-30T12:00:00.000Z");
    expect(md).toContain("## Source list");
    const json = exportResearchBriefJson(ok.brief);
    expect(json).toContain('"kgWrite": false');

    const knownOther = Object.keys(byId).find((id) => id !== "D012" && id !== "I001")!;
    const unsupported = draftResearchBrief({
      question: "Unsupported cite?",
      sources: { conceptIds: ["D012"] },
      rationale: `Related to ${knownOther} outside retrieval.`,
    });
    expect(unsupported.ok).toBe(false);

    expect(
      validateBriefCitations("The patient should start treatment with drug X", {
        conceptIds: ["D012"],
      }).ok,
    ).toBe(false);

    expect(draftResearchBrief({ question: "Empty", sources: { conceptIds: [] } }).ok).toBe(false);
  });

  it("wires collections and brief UI on /research without a second backend or KG approve path", () => {
    // Source-contract reads can be slow under parallel KG loads.
    const route = source("src/routes/research.tsx");
    expect(route).toContain('id="collections"');
    expect(route).toContain("EvidenceCollectionsPanel");
    expect(route).toContain('id="brief"');
    expect(route).toContain("ResearchBriefPanel");
    expect(route).toMatch(/cannot approve into the KG/i);
    expect(route).toMatch(/never a knowledge-graph write/i);

    const briefUi = source("src/components/immune/ResearchBriefPanel.tsx");
    expect(briefUi).toContain("Export JSON");
    expect(briefUi).toContain("Export Markdown");
    expect(briefUi).toContain("canApproveIntoKg");

    const agents = source("src/lib/research/AGENTS.md");
    expect(agents).toMatch(/evidence collections/i);
    expect(agents).toMatch(/kgWrite/i);

    const baseline = source("docs/ISI_AUDIT_BASELINE_2026-10-30.md");
    expect(baseline).toMatch(/Phase 4 — Research Workbench MVP/);
    expect(baseline).toMatch(/P4-1/);
  });
});
