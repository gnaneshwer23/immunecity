import { describe, expect, it } from "vitest";
import { shortestPath } from "@/lib/immune/engine";
import { reasonMechanism } from "@/lib/immune/mechanismReasoning";
import {
  attachProvisionalLiterature,
  classifyAskQuery,
  graphContext,
  isPersonalClinical,
  prepareAsk,
  provisionalLitLabel,
  shouldFetchProvisionalLit,
  validateAnswerCitations,
  SYSTEM,
} from "@/lib/askGrounding";
import { SCIENTIFIC_EVAL_SET } from "@/test/eval/scientific-eval-set";
import { MODEL_REGISTRY, dryRunAllStubs, implementedModels } from "@/lib/ai/modelRegistry";
import { EXEMPLAR_PATHWAYS, reportExemplar } from "@/lib/immune/exemplarPathways";
import { createHypothesisDraft, hypothesisCompleteness } from "@/lib/research/hypothesisDraft";
import { GRAPH_CORE_VERSION } from "@/lib/immune/graphRelease";

describe("mechanism reasoning", () => {
  it("returns illustrative start→perturb→outcome with assumptions", () => {
    const r = reasonMechanism("C003", "I001", "D001", "inhibit");
    expect(r).toBeTruthy();
    expect(r!.illustrative).toBe(true);
    expect(r!.assumptions.length).toBeGreaterThan(0);
    expect(r!.pathToOutcome?.length ?? 0).toBeGreaterThan(0);
  });

  it("records a gap when outcome is unreachable by propagation", () => {
    const r = reasonMechanism("EM01", "I001", "TR001", "inhibit");
    expect(r).toBeTruthy();
    expect(Array.isArray(r!.gaps)).toBe(true);
  });
});

describe("scientific evaluation set", () => {
  for (const c of SCIENTIFIC_EVAL_SET) {
    it(`case ${c.id}`, () => {
      if (c.kind === "unsupported") {
        const g = graphContext(c.question);
        expect(g.coverage.matched).toBe(false);
        expect(g.text).toMatch(/NO_MATCH/);
        expect(prepareAsk(c.question).callModel).toBe(false);
      } else if (c.kind === "clinical-refusal") {
        expect(isPersonalClinical(c.question)).toBe(true);
        expect(classifyAskQuery(c.question)).toBe("clinical_personal");
        expect(prepareAsk(c.question).callModel).toBe(false);
      } else if (c.kind === "omics-abstention") {
        expect(classifyAskQuery(c.question)).toBe(c.expectClass);
        expect(prepareAsk(c.question).callModel).toBe(false);
      } else if (c.kind === "classification") {
        expect(classifyAskQuery(c.question)).toBe(c.expectClass);
      } else if (c.kind === "path") {
        const g = graphContext(c.question);
        expect(g.coverage.matched).toBe(true);
        for (const id of c.mustRetrieveNodeIds) expect(g.nodeIds).toContain(id);
        const [a, b] = c.expectedPathEndpoints;
        expect(shortestPath(a, b, false)?.length).toBeGreaterThan(0);
        expect(SYSTEM).toMatch(/Never invent citations/);
        if (c.expectedClass) expect(classifyAskQuery(c.question)).toBe(c.expectedClass);
      } else if (c.kind === "mechanism") {
        const r = reasonMechanism(c.startId, c.perturbId, c.outcomeId, c.mode);
        expect(r).toBeTruthy();
        expect(r!.illustrative).toBe(true);
      } else if (c.kind === "exemplar") {
        const p = EXEMPLAR_PATHWAYS.find((x) => x.id === c.pathwayId);
        expect(p).toBeTruthy();
        const report = reportExemplar(p!);
        expect(report.connected).toBe(c.expectConnected);
      } else if (c.kind === "citation-validation") {
        let g = graphContext(c.question);
        if (c.provisionalPmids?.length) {
          g = attachProvisionalLiterature(
            g,
            c.provisionalPmids.map((pmid) => ({
              pmid,
              doi: null,
              title: "Fixture provisional title",
              journal: "Fixture",
              year: "2020",
              source: "PubMed" as const,
              url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            })),
          );
        }
        const v = validateAnswerCitations(c.answerText, g);
        expect(v.ok).toBe(c.expectOk);
      } else if (c.kind === "provisional-labelling") {
        const cls = classifyAskQuery(c.question);
        const g = graphContext(c.question, cls);
        expect(shouldFetchProvisionalLit(g, cls) || cls === "source_lookup").toBe(true);
        expect(provisionalLitLabel()).toMatch(/[Uu]nreviewed/);
        expect(SYSTEM).toMatch(/PROVISIONAL_LITERATURE/);
        expect(SYSTEM).toMatch(/not fully evidence-grounded/);
      } else if (c.kind === "multi-concept") {
        const g = graphContext(c.question);
        expect(g.coverage.matched).toBe(true);
        for (const id of c.mustRetrieveNodeIds) expect(g.nodeIds).toContain(id);
        expect(g.links.length > 0 || g.chains.length > 0).toBe(true);
        expect(g.coverage.reviewedEvidenceCount).toBeDefined();
        expect(g.coverage.provisionalLiteratureCount).toBe(0);
      }
    });
  }
});

describe("Ask Immune provisional literature helpers", () => {
  it("attaches provisional lines without upgrading reviewed counts", () => {
    const g = graphContext("How does TNF drive rheumatoid arthritis?");
    const next = attachProvisionalLiterature(g, [
      {
        pmid: "12345678",
        doi: null,
        title: "Example TNF review",
        journal: "J Immunol",
        year: "2019",
        source: "PubMed",
        url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      },
    ]);
    expect(next.coverage.provisionalLiteratureCount).toBe(1);
    expect(next.coverage.reviewedEvidenceCount).toBe(g.coverage.reviewedEvidenceCount);
    expect(next.text).toMatch(/PROVISIONAL_LITERATURE/);
    expect(next.text).toMatch(/NOT Gate C approved/);
    expect(shouldFetchProvisionalLit(g, "source_lookup")).toBe(true);
    expect(shouldFetchProvisionalLit(g, "graph_explanation")).toBe(g.coverage.reviewedEvidenceCount === 0);
  });
});

describe("hypothesis draft template", () => {
  it("stays candidate and reports incompleteness", () => {
    const h = createHypothesisDraft({ claim: "IFN drives BAFF in SLE" }, GRAPH_CORE_VERSION);
    expect(h.status).toBe("candidate");
    expect(hypothesisCompleteness(h).ok).toBe(false);
    const full = createHypothesisDraft({
      claim: "IFN drives BAFF in SLE",
      mechanism: "pDC IFN → BAFF → autoreactive B cells",
      predictedObservation: "BAFF falls after IFNAR blockade",
      falsificationTest: "BAFF unchanged after anifrolumab",
      alternativePath: "TLR7-driven B-cell intrinsic pathway",
      supportingIds: ["M018", "D007"],
    }, GRAPH_CORE_VERSION);
    expect(hypothesisCompleteness(full).ok).toBe(true);
  });
});

describe("advanced AI registry honesty", () => {
  it("exposes only planned interfaces — none implemented yet", () => {
    expect(MODEL_REGISTRY.length).toBeGreaterThan(0);
    expect(implementedModels()).toEqual([]);
    MODEL_REGISTRY.forEach((m) => {
      expect(m.status).not.toBe("implemented");
      expect(m.limitations.some((l) => /not implemented/i.test(l))).toBe(true);
    });
    expect(dryRunAllStubs().every((r) => r.kind === "not_available" && !r.scientificClaimAllowed)).toBe(true);
  });
});
