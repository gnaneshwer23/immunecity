/**
 * SME workspace — structure, honesty, rematch validation.
 * Run: bun test src/test/sme-workspace.test.ts
 *   or: bun run sme:eval
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JOURNEY_NAV } from "@/data/marketingNav";
import { assertSmeEvalHonesty, runSmeEvalHarness } from "@/lib/sme/evalRunner";
import {
  SME_GOLD_SET_POLICY,
  SME_GOLD_SET_SCAFFOLD,
  applySmeGoldLabel,
  summariseSmeGoldSet,
} from "@/lib/sme/goldSet";
import { validateSmeCitationRematch } from "@/lib/sme/rematch";
import {
  SME_PRIORITY_QUEUE_IDS,
  buildSmeMelanomaWorkQueue,
  buildSmePriorityQueues,
  buildSmeUnifiedWorkQueue,
  discoveryGapSmePriority,
  discoveryGapsToSmeWorkItems,
  summariseSmeWorkQueue,
} from "@/lib/sme/workQueue";
import type { ResearchGapCandidate } from "@/lib/discovery/types";

function source(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("SME work queue", () => {
  it("prioritizes research_opportunity and scientific_evidence_gap in Discovery queue", () => {
    expect(discoveryGapSmePriority("research_opportunity")).toBeLessThan(
      discoveryGapSmePriority("scientific_evidence_gap"),
    );
    expect(discoveryGapSmePriority("scientific_evidence_gap")).toBeLessThan(
      discoveryGapSmePriority("isi_curation_gap"),
    );
    const gaps: ResearchGapCandidate[] = [
      {
        gapKey: "GAP-CURATION",
        title: "Curation",
        summary: "x",
        status: "candidate",
        gapClass: "isi_curation_gap",
        opportunityStatus: "none",
        pilot: "melanoma_a",
        subjectId: "R011",
        objectId: "D012",
        relationshipId: null,
        diseaseId: "D012",
        whyItMatters: "x",
        searchScope: {
          corpus: "t",
          method: "t",
          dateScope: "t",
          note: "not worldwide absence",
        },
        detectionSource: "melanoma_matrix",
        detectionDetail: {},
        coverageLabel: null,
        autoReviewed: false,
      },
      {
        gapKey: "GAP-OPP-TEST",
        title: "Opportunity",
        summary: "x",
        status: "candidate",
        gapClass: "research_opportunity",
        opportunityStatus: "assessed",
        pilot: "melanoma_a",
        subjectId: "R011",
        objectId: "D012",
        relationshipId: null,
        diseaseId: "D012",
        whyItMatters: "x",
        searchScope: {
          corpus: "t",
          method: "t",
          dateScope: "t",
          note: "documented search",
        },
        detectionSource: "evidence_gap",
        detectionDetail: {},
        coverageLabel: "emerging",
        autoReviewed: false,
      },
    ];
    const items = discoveryGapsToSmeWorkItems(gaps);
    expect(items[0]?.gapKey).toBe("GAP-OPP-TEST");
    expect(items.every((i) => i.status === "pending_sme")).toBe(true);
    expect(items.every((i) => i.autoApprove === false)).toBe(true);
    const unified = buildSmeUnifiedWorkQueue({ discoveryGaps: gaps, includeMatrix: false });
    expect(unified[0]?.gapKey).toBe("GAP-OPP-TEST");
  });

  it("lists melanoma matrix items as pending_sme without auto-approve", () => {
    const items = buildSmeMelanomaWorkQueue();
    expect(items.length).toBe(15);
    expect(items.every((i) => i.status === "pending_sme")).toBe(true);
    expect(items.every((i) => i.autoApprove === false && i.autoRematch === false)).toBe(true);
    expect(items.every((i) => i.claimType === "literature_candidate")).toBe(true);
    const summary = summariseSmeWorkQueue(items);
    expect(summary.pendingSme).toBe(15);
    expect(summary.resolvedBySme).toBe(0);
  });

  it("exposes KEYNOTE and R011 as explicit priority pending_sme queues", () => {
    const priority = buildSmePriorityQueues();
    expect(priority.map((p) => p.id).sort()).toEqual([...SME_PRIORITY_QUEUE_IDS].sort());
    expect(priority.every((p) => p.status === "pending_sme")).toBe(true);
    const keynote = priority.find((p) => p.kind === "keynote_rematch");
    expect(keynote?.suggestedPmid).toBe("25891173");
    expect(keynote?.autoRematch).toBe(false);
    const r011 = priority.find((p) => p.kind === "r011_spo_rewrite");
    expect(r011?.relId).toContain("drives_immune_exhaustion");
  });
});

describe("SME gold-set + eval harness", () => {
  it("keeps labels and scores null until SME fills", () => {
    expect(SME_GOLD_SET_POLICY.inventsSmeScores).toBe(false);
    expect(SME_GOLD_SET_POLICY.silentKeynoteRematch).toBe(false);
    const summary = summariseSmeGoldSet();
    expect(summary.withLabel).toBe(0);
    expect(summary.withSmeScore).toBe(0);
    expect(summary.labelledRate).toBe(`0/${SME_GOLD_SET_SCAFFOLD.length}`);
    for (const c of SME_GOLD_SET_SCAFFOLD) {
      expect(c.label).toBeNull();
      expect(c.smeScore).toBeNull();
    }
  });

  it("reports honest denominators and refuses bulk Gate C / TI", () => {
    const report = runSmeEvalHarness({ now: new Date("2026-10-30T12:00:00Z") });
    const honesty = assertSmeEvalHonesty(report);
    expect(honesty).toEqual({ ok: true });
    expect(report.gateCBulkApproved).toBe(false);
    expect(report.keynoteAutoRematched).toBe(false);
    expect(report.trialIntelligenceEnabled).toBe(false);
    expect(report.denominators.every((d) => d.display === `${d.numerator}/${d.denominator}`)).toBe(true);
    expect(report.denominators.find((d) => d.name === "gold_labelled")?.display).toMatch(/^0\//);
  });

  it("applySmeGoldLabel records human label without inventing a score", () => {
    const next = applySmeGoldLabel(SME_GOLD_SET_SCAFFOLD, "SGOLD-KEYNOTE-01", {
      label: "wrong_citation",
      notes: "SME: wrong paper previously mapped",
    });
    const labelled = next.find((c) => c.id === "SGOLD-KEYNOTE-01")!;
    expect(labelled.status).toBe("labelled_by_sme");
    expect(labelled.label).toBe("wrong_citation");
    expect(labelled.smeScore).toBeNull();
  });
});

describe("SME rematch validation", () => {
  it("requires PMID + DOI + passage locator", () => {
    expect(validateSmeCitationRematch({}).ok).toBe(false);
    expect(
      validateSmeCitationRematch({
        evidenceUuid: "00000000-0000-4000-8000-000000000001",
        relationshipId: "REL-I008-demonstrates_in-TR003",
        pmid: "25891173",
        doi: "10.1056/NEJMoa1503093",
        passageLocator: "short",
      }).ok,
    ).toBe(false);
    const ok = validateSmeCitationRematch({
      evidenceUuid: "00000000-0000-4000-8000-000000000001",
      relationshipId: "REL-I008-demonstrates_in-TR003",
      pmid: "25891173",
      doi: "10.1056/NEJMoa1503093",
      passageLocator: "Results — pembrolizumab prolonged PFS vs ipilimumab (page 5).",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.normalised.notes).toContain("[passage_locator]");
      expect(ok.normalised.notes).toMatch(/does not approve Gate C/i);
    }
  });
});

describe("SME workspace wiring", () => {
  it("registers Investigate I8 / Trust T5 and route module", () => {
    const investigate = JOURNEY_NAV.find((g) => g.label === "Investigate")!;
    expect(investigate.items.some((i) => i.path === "/sme" && i.n === "I8")).toBe(true);
    const trust = JOURNEY_NAV.find((g) => g.label === "Trust")!;
    expect(trust.items.some((i) => i.path === "/sme" && i.n === "T5")).toBe(true);
    expect(source("src/routes/_authenticated/sme.tsx")).toContain("SmeReviewWorkspace");
    expect(source("src/lib/sme/sme.functions.ts")).toContain("recordSmeCitationRematch");
    expect(source("src/lib/sme/sme.functions.ts")).toContain("assertCanReview");
    expect(source("drizzle/migrations/0023_sme_workspace.sql")).toContain("sme_gold_labels");
    expect(source("docs/ISI_SME_WORKSPACE.md")).toMatch(/not CDS/i);
  });

  it("keeps SME workspace testids and ISI layout tokens", () => {
    const ui = source("src/components/immune/SmeReviewWorkspace.tsx");
    expect(ui).toContain('data-testid="sme-review-workspace"');
    expect(ui).toContain('data-testid="sme-priority-queues"');
    expect(ui).toContain('data-testid="sme-flagged-list"');
    expect(ui).toContain('data-testid="sme-gapkey-deeplink"');
    expect(ui).toContain('data-testid="sme-actions"');
    expect(ui).toContain('data-testid="sme-gold-set"');
    expect(ui).toContain('testId="sme-expert-panel"');
    expect(ui).toContain("isi-workspace");
    expect(ui).toContain("DetailPanel");
    expect(source("src/components/immune/MelanomaPilotChecklist.tsx")).toContain(
      'data-testid="melanoma-pilot-checklist"',
    );
    expect(source("src/isi.css")).toContain(".isi-sme");
    expect(source("src/isi.css")).toContain(".isi-expert-details");
  });

  it("refuses silent KEYNOTE rematch and bulk approve in source policy", () => {
    const agents = source("src/lib/sme/AGENTS.md");
    expect(agents).toMatch(/never bulk-approve/i);
    expect(agents).toMatch(/PMID \+ DOI \+ passage/i);
    const rematch = source("src/lib/sme/sme.functions.ts");
    expect(rematch).toContain('curation: "unreviewed"');
    expect(rematch).toContain("autoApprove: false");
  });
});
