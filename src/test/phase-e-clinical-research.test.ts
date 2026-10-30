/**
 * Phase E — Clinical / research workflows (melanoma path, treatment_line, brief handoff).
 * Run: bun test src/test/phase-e-clinical-research.test.ts --timeout 30000
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";
import {
  buildMelanomaInvestigationPath,
  melanomaInvestigationConceptIds,
  MELANOMA_INVESTIGATION_SEEDS,
  summariseMelanomaPathHop,
} from "@/lib/immune/melanomaInvestigationPath";
import {
  TRIAL_DB_PERSISTED_FIELDS,
  TRIAL_FIXTURE_ONLY_FIELDS,
  TRIAL_READ_MODEL_FIELDS,
  applyFixtureOverlays,
} from "@/lib/immune/trialReadModelContract";
import { graphBiomarkersForTrial } from "@/lib/immune/trialGraphNav";
import { isTrialIntelligenceEnabled } from "@/lib/trialIntelligenceFlag";
import { planMelanomaInvestigationCollection } from "@/lib/research/collections";
import {
  melanomaInvestigationResearchPath,
  MELANOMA_INVESTIGATION_PATH_SEEDS,
  sanitizePathConceptIds,
} from "@/lib/research/savedPaths";
import {
  buildScientificBriefPackage,
  exportScientificBriefPackageJson,
  exportScientificBriefPackageMarkdown,
} from "@/lib/research/scientificBrief";
import { buildExportProvenanceTrail } from "@/lib/research/exportProvenance";
import { assertNoSilentApproval } from "@/lib/immune/claimRecords";

function source(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Phase E1 — treatment_line migration + read contract", () => {
  it("positive: 0018 adds treatment_line; schema + DB persisted fields include it", () => {
    const mig = source("drizzle/migrations/0018_trial_treatment_line.sql");
    expect(mig).toMatch(/clinical_trials/);
    expect(mig).toMatch(/trial_arms/);
    expect(mig).toMatch(/ADD COLUMN IF NOT EXISTS treatment_line/);
    expect(mig).not.toMatch(/ALTER TABLE\s+public\.evidence_records/i);
    expect(mig).not.toMatch(/UPDATE\s+public\.evidence_records/i);
    expect([...TRIAL_DB_PERSISTED_FIELDS]).toContain("treatmentLine");
    expect([...TRIAL_FIXTURE_ONLY_FIELDS]).toEqual(["sources", "biomarkerContext"]);
    expect(TRIAL_READ_MODEL_FIELDS.find((f) => f.path === "treatmentLine")?.source).toBe("postgres");
  });

  it("negative: biomarkerContext stays empty stub — no invented assays", () => {
    for (const t of MELANOMA_PILOT_TRIALS) {
      expect(t.biomarkerContext ?? []).toEqual([]);
    }
    const stubs = graphBiomarkersForTrial("TR003");
    for (const s of stubs) {
      expect(s.assayLabel).toBeNull();
    }
    expect(TRIAL_READ_MODEL_FIELDS.find((f) => f.path === "biomarkerContext")?.source).toBe("empty_stub");
  });

  it("boundary: DB treatmentLine wins over fixture; null falls back", () => {
    const kn = MELANOMA_PILOT_TRIALS[0]!;
    expect(applyFixtureOverlays({ ...kn, treatmentLine: "From Postgres" }).treatmentLine).toBe("From Postgres");
    expect(applyFixtureOverlays({ ...kn, treatmentLine: null }).treatmentLine).toBe(kn.treatmentLine);
  });
});

describe("Phase E2 — melanoma investigation path (typed relations)", () => {
  it("positive: builds source-traceable path with trials + endpoints, no clinical conclusion", () => {
    const path = buildMelanomaInvestigationPath();
    expect("ok" in path && path.ok === false).toBe(false);
    if ("ok" in path) return;
    expect(path.kind).toBe("melanoma_immunotherapy_investigation_path");
    expect(path.clinicalConclusion).toBe(false);
    expect(path.kgWrite).toBe(false);
    expect(path.educationalOnly).toBe(true);
    expect(path.seeds).toEqual([...MELANOMA_INVESTIGATION_SEEDS]);
    expect(path.trials.map((t) => t.graphNodeId).sort()).toEqual(["TR003", "TR020"]);
    expect(path.trials.every((t) => t.treatmentLine && t.endpointCount > 0)).toBe(true);
    expect(path.hops.some((h) => h.kind === "disease")).toBe(true);
    expect(path.hops.some((h) => h.kind === "mechanism")).toBe(true);
    expect(path.hops.some((h) => h.kind === "trial")).toBe(true);
    expect(path.hops.some((h) => h.kind === "endpoint")).toBe(true);
    expect(path.typedRelations.length).toBeGreaterThan(0);
    expect(path.biomarkerAssayStance).toBe("empty_stub_no_invented_cutoffs");
    expect(path.unknowns.length).toBeGreaterThan(0);
    expect(summariseMelanomaPathHop(path.hops[0]!)).toContain("D012");
  });

  it("negative: concept id helper only returns existing graph ids", () => {
    const ids = melanomaInvestigationConceptIds();
    expect(ids.length).toBe(MELANOMA_INVESTIGATION_SEEDS.length);
    expect(ids.every((id) => MELANOMA_INVESTIGATION_SEEDS.includes(id as (typeof MELANOMA_INVESTIGATION_SEEDS)[number]))).toBe(
      true,
    );
  });
});

describe("Phase E3 — collections / paths sync (no KG write)", () => {
  it("positive: plan melanoma collection for signed-in member", () => {
    const plan = planMelanomaInvestigationCollection({ userId: "user-1" });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.conceptIds).toContain("D012");
    expect(plan.conceptIds).toContain("TR003");
    expect(plan.evidenceRefs).toEqual([]);
  });

  it("negative: unauth cannot plan collection; path seeds sanitize", () => {
    expect(planMelanomaInvestigationCollection({ userId: null }).ok).toBe(false);
    const path = melanomaInvestigationResearchPath();
    expect(path).not.toBeNull();
    expect(path!.conceptIds.length).toBeGreaterThanOrEqual(2);
    expect(path!.conceptIds.length).toBeLessThanOrEqual(MELANOMA_INVESTIGATION_PATH_SEEDS.length);
    expect(sanitizePathConceptIds(["D012", "FAKE", "TR003"])).toEqual(["D012", "TR003"]);
  });
});

describe("Phase E4 — scientific brief + review handoff + provenance", () => {
  it("positive: package is AI/draft, unreviewed, with provenance trail", () => {
    const result = buildScientificBriefPackage({
      now: new Date("2026-10-30T15:00:00.000Z"),
      sources: {
        conceptIds: ["D012", "R011", "I008", "B011", "TR003", "TR020"],
        trialIds: ["TR003", "TR020"],
        evidenceIds: ["EV-brief-1"],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pkg = result.package;
    expect(pkg.kgWrite).toBe(false);
    expect(pkg.canApproveIntoKg).toBe(false);
    expect(pkg.clinicalConclusion).toBe(false);
    expect(pkg.reviewStatus).toBe("unreviewed");
    expect(pkg.handoff.autoPromote).toBe(false);
    expect(pkg.handoff.openRoute).toBe("/curation");
    expect(pkg.handoff.requiresHumanReview).toBe(true);
    expect(pkg.provenance.kgWrite).toBe(false);
    expect(pkg.provenance.trials.map((t) => t.graphNodeId).sort()).toEqual(["TR003", "TR020"]);
    expect(pkg.claimCandidates.every((c) => c.curation === "unreviewed")).toBe(true);
    const json = exportScientificBriefPackageJson(pkg);
    expect(json).toContain('"kgWrite": false');
    expect(exportScientificBriefPackageMarkdown(pkg)).toContain("Human review handoff");
  });

  it("negative: silent approval of unassessed claim is blocked; prod trial flag off", () => {
    const blocked = assertNoSilentApproval({
      evidence_id: "EV-x",
      relationship_id: "REL-x",
      claim_support: "unassessed",
      curation: "approved",
      label: "x",
      url: "",
      reviewed_at: null,
    });
    expect(blocked.ok).toBe(false);
    expect(isTrialIntelligenceEnabled()).toBe(false);

    const trail = buildExportProvenanceTrail({
      conceptIds: ["D012", "TR003"],
      trialIds: ["TR003"],
      evidenceIds: [],
      now: new Date("2026-10-30T15:00:00.000Z"),
    });
    expect(trail.clinicalConclusion).toBe(false);
    expect(trail.concepts.some((c) => c.isiId === "D012")).toBe(true);
  });
});
