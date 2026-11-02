/**
 * M1 Biomedical Discovery Brief (Workflow B) — Scientific Intelligence MVP.
 * Run: bun test src/test/m1-investigation-brief.test.ts
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prepareAsk } from "@/lib/askGrounding";
import {
  buildInvestigationBrief,
  CLAIM_TYPE_LABEL,
  exportInvestigationBriefJson,
  exportInvestigationBriefMarkdown,
  INVESTIGATION_BRIEF_KIND,
  INVESTIGATION_BRIEF_SCHEMA_VERSION,
  INVESTIGATION_BRIEF_WORKFLOW,
  mapTierToClaimType,
  RESEARCH_CLAIM_TYPES,
  validateInvestigationCitations,
} from "@/lib/research/investigationBrief";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const source = (rel: string) => readFileSync(root(rel), "utf8");

describe("M1 Biomedical Discovery Brief (Workflow B)", () => {
  it("maps evidence tiers to HSI claim categories without Observed on research path", () => {
    expect(mapTierToClaimType("established")).toBe("established_evidence");
    expect(mapTierToClaimType("evidence-supported")).toBe("statistical_association");
    expect(mapTierToClaimType("emerging")).toBe("computational_inference");
    expect(mapTierToClaimType("hypothesis")).toBe("unvalidated_hypothesis");
    expect(CLAIM_TYPE_LABEL.observed_patient_fact).toMatch(/N\/A/i);
    expect(RESEARCH_CLAIM_TYPES).toHaveLength(5);
  });

  it("builds structured brief sections from Ask grounding", () => {
    const q = "How does PD-1 blockade relate to melanoma?";
    const prepared = prepareAsk(q);
    expect(prepared.grounding.coverage.matched).toBe(true);

    const result = buildInvestigationBrief({
      question: q,
      grounding: prepared.grounding,
      now: new Date("2026-11-02T10:00:00.000Z"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { brief } = result;
    expect(brief.kind).toBe(INVESTIGATION_BRIEF_KIND);
    expect(brief.schemaVersion).toBe(INVESTIGATION_BRIEF_SCHEMA_VERSION);
    expect(brief.schemaVersion).toBe("m1-2");
    expect(brief.humanEvidence.kind).toBe("cap6_human_evidence_prioritisation");
    expect(brief.contradictions.kind).toBe("cap10_scientific_contradictions");
    expect(brief.researchGaps.kind).toBe("cap11_underexplored_mechanisms");
    expect(brief.researchGaps.scopeHonestyNote.length).toBeGreaterThan(20);
    expect(brief.workflow).toBe(INVESTIGATION_BRIEF_WORKFLOW);
    expect(brief.product).toBe("M1 Biomedical Discovery Brief");
    expect(brief.capabilityLabel).toBe("Available research capability");
    expect(brief.label).toBe("AI/draft");
    expect(brief.reviewStatus).toBe("unreviewed");
    expect(brief.kgWrite).toBe(false);
    expect(brief.canApproveIntoKg).toBe(false);
    expect(brief.clinicalAdvice).toBe(false);
    expect(brief.clinicalProduct).toBe(false);
    expect(brief.trialsProduct).toBe(false);
    expect(brief.exportedAt).toBe("2026-11-02T10:00:00.000Z");
    expect(brief.nodeIds.length).toBeGreaterThan(0);

    expect(brief.sections.map((s) => s.id)).toEqual([
      "question",
      "entities",
      "mechanisms",
      "supporting_evidence",
      "contradictions_gaps",
      "limitations",
      "claim_categories",
    ]);

    const observed = brief.claimStatements.find((c) => c.claimType === "observed_patient_fact");
    expect(observed?.applicable).toBe(false);

    const hyp = brief.claimStatements.filter((c) => c.claimType === "unvalidated_hypothesis" && c.applicable);
    for (const h of hyp) {
      expect(h.unvalidated).toBe(true);
    }

    expect(brief.sourceLinks.some((s) => s.kind === "concept" && s.href?.startsWith("/atlas/"))).toBe(true);

    const gaps = brief.sections.find((s) => s.id === "contradictions_gaps")!;
    expect(gaps.body.toLowerCase()).toMatch(/contradiction|gap|honest empty|counterevidence|insufficient|awaiting/i);

    const md = exportInvestigationBriefMarkdown(brief);
    expect(md).toContain("## Question");
    expect(md).toContain("## Claim categories");
    expect(md).toContain("## Source inspection");
    expect(md).toContain("unvalidated");

    const json = exportInvestigationBriefJson(brief);
    expect(json).toContain('"kgWrite": false');
    expect(json).toContain('"clinicalProduct": false');
  });

  it("fail-closes clinical questions, empty match, and invented PMIDs", () => {
    expect(buildInvestigationBrief({ question: "" }).ok).toBe(false);

    const clinical = buildInvestigationBrief({
      question: "What dose of pembrolizumab should I take for my melanoma?",
    });
    expect(clinical.ok).toBe(false);
    if (!clinical.ok) expect(clinical.reason).toMatch(/clinical|abstain|Fail closed/i);

    const nonsense = buildInvestigationBrief({ question: "zzqxzyxq nonontology foobarium" });
    expect(nonsense.ok).toBe(false);

    const q = "How does TNF relate to rheumatoid arthritis?";
    const prepared = prepareAsk(q);
    expect(prepared.grounding.coverage.matched).toBe(true);
    const invented = validateInvestigationCitations(
      "Supported by PMID 99999999 which was never retrieved.",
      prepared.grounding,
    );
    expect(invented.ok).toBe(false);

    const advice = validateInvestigationCitations(
      "The patient should start treatment with drug X",
      prepared.grounding,
    );
    expect(advice.ok).toBe(false);

    // Auto path without pre-built grounding still works for matched science Q.
    const auto = buildInvestigationBrief({ question: q });
    expect(auto.ok).toBe(true);
  });

  it("wires AskAtlas action without a second chatbot host", () => {
    const ask = source("src/components/immune/AskAtlas.tsx");
    expect(ask).toContain("Generate investigation brief");
    expect(ask).toContain("buildInvestigationBrief");
    expect(ask).toContain("InvestigationBriefView");
    expect(ask).toMatch(/Available research capability/);

    expect(source("src/components/immune/InvestigationBriefView.tsx")).toContain("Biomedical discovery brief");
    expect(source("src/lib/research/investigationBrief.ts")).toContain("m1-2");

    const capability = source("src/data/capabilityStatus.ts");
    expect(capability).toContain("m1-investigation-brief");
    expect(capability).toMatch(/Available research capability/);

    // Still only AskAtlas on /ask + corner FAB — no new chatbot route.
    expect(source("src/routes/ask.tsx")).toContain("AskAtlas");
    expect(source("src/routes/research.tsx")).toContain("/ask");
    expect(source("src/routes/research.tsx")).toMatch(/Generate investigation brief|investigation brief/i);
  });
});
