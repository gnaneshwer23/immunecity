import { describe, expect, it } from "vitest";
import { byId, KG, shortestPath } from "@/lib/immune/engine";
import { GRAPH_EXTENSIONS_VERSION, graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { EXT_LESSONS, EXT_NODES, EXT_PROVENANCE, EXT_ROUTES } from "@/data/extensions";
import { IMPLEMENTATION_PHASES, phaseStatusSummary } from "@/data/implementation-phases";
import { domainCoverageReport, knowledgeGapQueue } from "@/lib/immune/domainCoverage";
import {
  MODEL_REGISTRY,
  adapterPromotionGate,
  dryRunAllStubs,
  getModel,
  implementedModels,
  invokeModelStub,
  isRunnable,
  plannedMolecularStubs,
  requestShapePreview,
  registryHonestySummary,
  validateModelRequest,
} from "@/lib/ai/modelRegistry";
import {
  addCandidateClaim,
  advanceStep,
  canAdvance as canAdvanceLit,
  createLiteratureProject,
  detectConflicts,
  exportCurationManifest,
  mapClaim,
  normaliseOptionalId,
  reviewClaim,
  runMetadataValidation,
  searchMetadataComplete,
  setClaimSupport,
  updateSearch,
  validateMetadata,
} from "@/lib/research/literatureWorkflow";
import { reasonMechanism } from "@/lib/immune/mechanismReasoning";
import {
  addEvidenceNote,
  advanceWorkbench,
  buildWorkbenchCurationHandoff,
  buildWorkbenchExport,
  canAdvance as canAdvanceWb,
  canVisitStep,
  createWorkbenchSession,
  experimentCompleteness,
  exportWorkbench,
  importCurationManifest,
  importLiteratureCandidates,
  importLiteraturePayload,
  importMechanismResult,
  restoreWorkbenchFromExportJson,
  retreatWorkbench,
  seedQuestionFromAsk,
  sessionCandidateFlags,
  setReviewDisposition,
  setWorkbenchStep,
  workbenchProgress,
  WORKBENCH_SCHEMA_VERSION,
} from "@/lib/research/workbench";

describe("Phase B knowledge extensions", () => {
  it("bumps extensions version and provenance", () => {
    expect(GRAPH_EXTENSIONS_VERSION).toBe("draft-ext-4");
    expect(EXT_PROVENANCE.version).toBe("draft-ext-4");
  });

  it("adds immunogenetics and thin-domain concepts as draft with stable IDs", () => {
    for (const id of [
      "EG01", "EG02", "EG03", "EG06", "EG07", "EG10", "EG11", "EG13", "EG14", "EG17",
      "EM07", "EM09", "EM11", "EV05", "EV07", "EV09", "EV10", "ET06", "ET07", "ET09",
      "EP10", "EP11", "EP13", "EP14", "EP15", "EI01", "EI03", "EI05",
    ]) {
      expect(byId[id], id).toBeTruthy();
      expect(byId[id]!.draft).toBe(true);
    }
    expect(EXT_LESSONS.some((l) => l.id === "immunogenetics" && l.draft)).toBe(true);
    expect(EXT_LESSONS.some((l) => l.id === "infection-autoimmunity" && l.draft)).toBe(true);
    expect(EXT_ROUTES.some((r) => r.title.includes("Shared epitope") && r.draft)).toBe(true);
    expect(EXT_ROUTES.some((r) => r.title.includes("EBV") && r.draft)).toBe(true);
    expect(EXT_ROUTES.some((r) => r.title.includes("IVIG") && r.draft)).toBe(true);
    expect(EXT_ROUTES.some((r) => r.title.includes("HLA screen") && r.draft)).toBe(true);
  });

  it("keeps all extension nodes draft in the runtime graph", () => {
    const extIds = new Set(EXT_NODES.map((n) => n.id));
    const drafts = KG.nodes.filter((n) => extIds.has(n.id));
    expect(drafts.length).toBe(EXT_NODES.length);
    expect(drafts.every((n) => n.draft)).toBe(true);
    const snap = graphReleaseSnapshot();
    expect(snap.extensionsVersion).toBe("draft-ext-4");
    expect(snap.coreNodes + snap.draftNodes).toBe(snap.runtimeNodes);
  });

  it("connects shared-epitope and EBV–mimicry paths illustratively", () => {
    expect(shortestPath("EG02", "D001", true)?.length).toBeGreaterThan(0);
    expect(shortestPath("X006", "D002", true)?.length).toBeGreaterThan(0);
    expect(shortestPath("EP15", "EP01", true)?.length).toBeGreaterThan(0);
    expect(shortestPath("EG17", "EG12", true)?.length).toBeGreaterThan(0);
  });

  it("reports domain coverage and a gap queue without inventing approvals", () => {
    const report = domainCoverageReport();
    expect(report.extensionsVersion).toBe("draft-ext-4");
    expect(report.domains.length).toBe(7);
    expect(report.summary.lessonsPresent).toBe(7);
    expect(report.summary.isolatedConcepts).toBe(0);
    expect(report.summary.thinDomains).toBe(0);
    expect(report.summary.draftNodesInDomains).toBeGreaterThanOrEqual(EXT_NODES.length);
    const immuno = report.domains.find((d) => d.domain.id === "immunogenetics");
    expect(immuno?.lessonPresent).toBe(true);
    expect(immuno?.routeCount).toBeGreaterThan(0);
    expect(immuno?.teachingCoveragePct).toBeGreaterThan(80);
    const queue = knowledgeGapQueue(20);
    expect(queue.every((g) => g.conceptIds.length > 0 || (g.relIds?.length ?? 0) > 0)).toBe(true);
    expect(queue.every((g) => !/pmid\s*\d{6,}/i.test(g.detail))).toBe(true);
    expect(queue.some((g) => g.kind === "draft_link_uncited" || g.kind === "untaught_concept")).toBe(true);
  });
});

describe("Phase C literature workflow", () => {
  it("rejects placeholder identifiers and requires real metadata", () => {
    expect(normaliseOptionalId("fake")).toBeUndefined();
    expect(normaliseOptionalId("12345678")).toBe("12345678");
    const p = createLiteratureProject("0.3", "draft-ext-4", { query: "TNF RA" });
    expect(searchMetadataComplete(p.search).ok).toBe(false);
  });

  it("validates metadata locally without inventing PMIDs", () => {
    let p = createLiteratureProject("0.3", "draft-ext-4", {
      query: "HLA-B27 AS",
      title: "User-supplied title only",
      pmid: "not-a-pmid",
    });
    p = runMetadataValidation(p);
    expect(p.search.pmid).toBe("not-a-pmid");
    expect(validateMetadata(p.search).ok).toBe(false);
    expect(p.search.metadataCheck).toBe("format_issue");
    p = updateSearch(p, { pmid: undefined });
    const v = validateMetadata(p.search);
    expect(v.ok).toBe(true);
    expect(p.search.pmid).toBeUndefined();
  });

  it("moves source → metadata → claim → map → conflicts → approval without inventing PMIDs", () => {
    let p = createLiteratureProject("0.3", "draft-ext-4", {
      query: "HLA-B27 AS",
      title: "User-supplied title only",
    });
    expect(p.search.pmid).toBeUndefined();
    expect(p.step).toBe("source_identification");
    expect(searchMetadataComplete(p.search).ok).toBe(true);
    p = advanceStep(p);
    expect(p.step).toBe("metadata_validation");
    p = advanceStep(p);
    expect(p.step).toBe("candidate_claims");
    p = addCandidateClaim(p, { text: "HLA-B27 associates with axial SpA", excerpt: "" });
    expect(canAdvanceLit(p).ok).toBe(true);
    p = advanceStep(p);
    expect(p.step).toBe("map_concepts");
    p = mapClaim(p, p.claims[0]!.claim_id, ["EG01", "EG10"], ["REL-EG01-associates_with-EG10"]);
    expect(p.claims[0]!.mappedConceptIds).toEqual(["EG01", "EG10"]);
    p = setClaimSupport(p, p.claims[0]!.claim_id, "supports");
    p = advanceStep(p);
    expect(p.step).toBe("conflict_flags");
    p = advanceStep(p);
    expect(p.step).toBe("claim_approval");
    p = reviewClaim(p, p.claims[0]!.claim_id, "accepted_for_curation", "Queue for human curator");
    expect(p.claims[0]!.reviewStatus).toBe("accepted_for_curation");
    expect(p.status).toBe("draft_scaffold");
    const manifest = exportCurationManifest(p);
    expect(manifest.meta.curation).toBe("unreviewed");
    expect(manifest.evidence_records.length).toBeGreaterThan(0);
    expect(manifest.evidence_records[0]!.evidence[0]!.status).toBe("candidate");
    expect(manifest.evidence_records[0]!.evidence[0]!.relationship_id).toBe("REL-EG01-associates_with-EG10");
  });

  it("flags unknown relationship IDs and intra-project support disagreements", () => {
    let p = createLiteratureProject("0.3", "draft-ext-4", {
      query: "conflict test",
      title: "Conflict fixture",
    });
    p = addCandidateClaim(p, { text: "Supports edge" });
    p = addCandidateClaim(p, { text: "Contradicts edge" });
    p = mapClaim(p, p.claims[0]!.claim_id, ["EG01"], ["REL-EG01-associates_with-EG10"]);
    p = mapClaim(p, p.claims[1]!.claim_id, ["EG01"], ["REL-FAKE-not-real"]);
    p = setClaimSupport(p, p.claims[0]!.claim_id, "supports");
    p = setClaimSupport(p, p.claims[1]!.claim_id, "contradicts");
    const flags = detectConflicts(p);
    expect(flags.some((f) => f.code === "unknown_relationship")).toBe(true);
    p = mapClaim(p, p.claims[1]!.claim_id, ["EG01"], ["REL-EG01-associates_with-EG10"]);
    p = setClaimSupport(p, p.claims[1]!.claim_id, "contradicts");
    const again = detectConflicts(p);
    expect(again.some((f) => f.code === "intra_project_disagreement")).toBe(true);
  });
});

describe("Phase D model registry honesty", () => {
  it("exposes interface-only adapters and zero implemented models", () => {
    expect(MODEL_REGISTRY.length).toBeGreaterThanOrEqual(5);
    expect(implementedModels()).toEqual([]);
    expect(MODEL_REGISTRY.every((m) => m.status === "interface-only" || m.status === "planned")).toBe(true);
    expect(MODEL_REGISTRY.every((m) => m.limitations.some((l) => /not implemented/i.test(l)))).toBe(true);
    expect(MODEL_REGISTRY.every((m) => m.version === null && !isRunnable(m))).toBe(true);
    const cats = new Set(MODEL_REGISTRY.map((m) => m.category));
    expect(cats).toEqual(new Set(["omics", "structure", "epitope", "genomics", "agent"]));
  });

  it("documents typed request/output contracts and request-shape previews", () => {
    for (const m of MODEL_REGISTRY) {
      expect(m.requestFields.length).toBeGreaterThan(0);
      expect(m.outputFields.length).toBeGreaterThan(0);
      expect(m.exampleRequest.family).toBe(m.category);
      const preview = requestShapePreview(m);
      expect(preview).toMatch(/"family"/);
      expect(JSON.parse(preview).family).toBe(m.category);
    }
    expect(getModel("peptide-mhc")?.category).toBe("epitope");
    expect(registryHonestySummary().implemented).toBe(0);
  });

  it("validates request shapes and blocks promotion without a real adapter", () => {
    for (const m of MODEL_REGISTRY) {
      expect(validateModelRequest(m.id, m.exampleRequest).ok).toBe(true);
    }
    expect(validateModelRequest("peptide-mhc", { family: "epitope" }).ok).toBe(false);
    expect(adapterPromotionGate("tcr-pmhc-dock").canPromote).toBe(false);
    expect(plannedMolecularStubs().length).toBeGreaterThanOrEqual(2);
    expect(plannedMolecularStubs().every((m) => m.status === "planned")).toBe(true);
  });

  it("stub invoke refuses every adapter and never allows scientific claims", () => {
    const all = dryRunAllStubs();
    expect(all.length).toBe(MODEL_REGISTRY.length);
    expect(all.every((r) => r.ok === false && r.kind === "not_available")).toBe(true);
    expect(all.every((r) => r.scientificClaimAllowed === false)).toBe(true);
    const unknown = invokeModelStub("no-such-model");
    expect(unknown.kind).toBe("not_available");
    expect(unknown.scientificClaimAllowed).toBe(false);
    // Ensure stub does not smuggle prediction-like payloads
    for (const r of all) {
      expect(Object.keys(r).sort()).toEqual([
        "kind",
        "modelId",
        "ok",
        "reason",
        "scientificClaimAllowed",
        "status",
      ]);
      expect(r).not.toHaveProperty("bindingRanks");
      expect(r).not.toHaveProperty("cellTypeScores");
    }
  });
});

describe("Phase E workbench", () => {
  it("gates steps, tracks furthest, and blocks forward jumps", () => {
    let s = createWorkbenchSession("0.3", "draft-ext-4");
    expect(canAdvanceWb(s).ok).toBe(false);
    expect(canVisitStep(s, "hypothesis").ok).toBe(false);
    expect(setWorkbenchStep(s, "experiment").step).toBe("question");
    s = { ...s, question: { ...s.question, text: "Does NOD2 impair ileal sensing in Crohn?" } };
    s = advanceWorkbench(s);
    expect(s.step).toBe("evidence");
    expect(s.furthestStep).toBe("evidence");
    s = addEvidenceNote(s, "Association replicated in GWAS catalogues", "user-verified source label");
    s = advanceWorkbench(s);
    expect(s.step).toBe("mechanism");
    s = {
      ...s,
      mechanism: { ...s.mechanism, paths: ["EG07 → D004"] },
    };
    s = advanceWorkbench(s);
    expect(s.step).toBe("hypothesis");
    expect(s.hypothesis.mechanism).toContain("EG07");
    s = retreatWorkbench(s);
    expect(s.step).toBe("mechanism");
    expect(canVisitStep(s, "hypothesis").ok).toBe(true);
    s = setWorkbenchStep(s, "hypothesis");
    s = { ...s, hypothesis: { ...s.hypothesis, claim: "NOD2 risk alleles impair muramyl-dipeptide sensing" } };
    s = advanceWorkbench(s);
    expect(s.step).toBe("experiment");
    s = {
      ...s,
      experiment: {
        ...s.experiment,
        question: "Compare MDP responses in NOD2 variant vs WT myeloid cells",
        readouts: "TNF, IL-1β, viability",
      },
    };
    expect(experimentCompleteness(s.experiment).ok).toBe(false);
    s = advanceWorkbench(s);
    expect(s.step).toBe("review");
    expect(s.furthestStep).toBe("review");
  });

  it("keeps candidate flags and versioned export without KG promotion", () => {
    let s = createWorkbenchSession("0.3", "draft-ext-4");
    s = { ...s, question: { ...s.question, text: "Butyrate and Treg?" } };
    s = advanceWorkbench(s);
    s = addEvidenceNote(s, "Educational note only", "user-verified label");
    s = advanceWorkbench(s);
    s = { ...s, mechanism: { ...s.mechanism, gaps: ["No path recorded yet"] } };
    s = advanceWorkbench(s);
    s = { ...s, hypothesis: { ...s.hypothesis, claim: "Candidate claim" } };
    s = advanceWorkbench(s);
    s = {
      ...s,
      experiment: { ...s.experiment, question: "q", readouts: "r" },
    };
    s = advanceWorkbench(s);
    s = setReviewDisposition(s, "approved_for_export_only", "Export OK — not curated");
    const flags = sessionCandidateFlags(s);
    expect(flags.allCandidates).toBe(true);
    expect(s.hypothesis.status).toBe("candidate");
    expect(s.experiment.status).toBe("draft_proposal");
    expect(s.experiment.kind).toBe("candidate");
    const exp = buildWorkbenchExport(s);
    expect(exp.schemaVersion).toBe(WORKBENCH_SCHEMA_VERSION);
    expect(exp.kgWrite).toBe(false);
    expect(exp.experimentallySupported).toBe(false);
    expect(exp.curation).toBe("unreviewed");
    const json = exportWorkbench(s);
    expect(json).toMatch(/candidate/);
    expect(json).toMatch(/draft-ext-4/);
    expect(json).toMatch(/wb-1/);
    expect(json).not.toMatch(/experimentally_supported/);

    // Human-gated curation queue stub — never silent KG write-back
    s = addEvidenceNote(s, "Mapped candidate note", "user label", ["EM02", "REL-EM02-promotes-EM03"]);
    const handoff = buildWorkbenchCurationHandoff(s);
    expect(handoff.kind).toBe("workbench_curation_queue_handoff");
    expect(handoff.wired).toBe(false);
    expect(handoff.kgWrite).toBe(false);
    expect(handoff.autoPromote).toBe(false);
    expect(handoff.openRoute).toBe("/curation");
    expect(handoff.candidateManifest?.meta.curation).toBe("unreviewed");
    expect(handoff.candidateManifest?.evidence_records.length).toBeGreaterThan(0);
  });

  it("imports lit claims and mechanism summaries as candidates", () => {
    let s = createWorkbenchSession("0.3", "draft-ext-4");
    s = { ...s, question: { ...s.question, text: "Shared epitope and RA" } };
    s = seedQuestionFromAsk(s);
    expect(s.question.kind).toBe("candidate");
    expect(s.importLog.some((x) => x.startsWith("ask_seed:"))).toBe(true);

    let lit = createLiteratureProject("0.3", "draft-ext-4", { query: "shared epitope", title: "User title" });
    lit = addCandidateClaim(lit, { text: "Shared epitope associates with ACPA+ RA" });
    lit = mapClaim(lit, lit.claims[0]!.claim_id, ["EG01", "EG10"], ["REL-EG01-associates_with-EG10"]);
    s = importLiteratureCandidates(s, lit);
    expect(s.evidence.length).toBe(1);
    expect(s.evidence[0]!.kind).toBe("candidate");
    expect(s.evidence[0]!.sourceClaimId).toBe(lit.claims[0]!.claim_id);

    const mech = reasonMechanism("C003", "I001", "D001", "inhibit");
    expect(mech).toBeTruthy();
    s = importMechanismResult(s, mech!);
    expect(s.mechanism.kind).toBe("candidate");
    expect(s.mechanism.illustrative).toBe(true);
    expect(s.mechanism.paths.length + s.mechanism.gaps.length).toBeGreaterThan(0);
    expect(sessionCandidateFlags(s).allCandidates).toBe(true);
  });

  it("imports curation manifests, restores exports, and reports progress without KG promotion", () => {
    let lit = createLiteratureProject("0.3", "draft-ext-4", { query: "NOD2", title: "User title" });
    lit = addCandidateClaim(lit, { text: "NOD2 variants associate with Crohn disease" });
    lit = mapClaim(lit, lit.claims[0]!.claim_id, ["EG07", "D004"], []);
    lit = setClaimSupport(lit, lit.claims[0]!.claim_id, "supports");
    lit = reviewClaim(lit, lit.claims[0]!.claim_id, "accepted_for_curation");
    const manifest = exportCurationManifest(lit);
    expect(manifest.meta.curation).toBe("unreviewed");

    let s = createWorkbenchSession("0.3", "draft-ext-4");
    s = { ...s, question: { ...s.question, text: "NOD2 and Crohn?" } };
    const fromManifest = importCurationManifest(s, manifest);
    expect(fromManifest.error).toBeUndefined();
    expect(fromManifest.imported).toBeGreaterThan(0);
    s = fromManifest.session;
    expect(s.evidence.every((e) => e.kind === "candidate")).toBe(true);

    const payload = importLiteraturePayload(createWorkbenchSession("0.3", "draft-ext-4"), JSON.stringify(manifest));
    expect(payload.source).toBe("manifest");
    expect(payload.imported).toBeGreaterThan(0);

    s = setReviewDisposition(s, "approved_for_export_only", "export only");
    const exported = exportWorkbench(s);
    const restored = restoreWorkbenchFromExportJson(exported);
    expect(restored.error).toBeUndefined();
    expect(restored.session?.question.kind).toBe("candidate");
    expect(restored.session?.experiment.status).toBe("draft_proposal");
    expect(buildWorkbenchExport(restored.session!).kgWrite).toBe(false);

    const progress = workbenchProgress(restored.session!);
    expect(progress).toHaveLength(6);
    expect(progress[0]!.ready).toBe(true);
    expect(progress.some((p) => p.step === "evidence" && p.ready)).toBe(true);
  });
});

describe("implementation phase registry", () => {
  it("marks B–E as partial, never invents done without notes", () => {
    const summary = phaseStatusSummary();
    expect(summary.B).toBe("partial");
    expect(summary.C).toBe("partial");
    expect(summary.D).toBe("partial");
    expect(summary.E).toBe("partial");
    expect(IMPLEMENTATION_PHASES.every((p) => p.acceptance.length > 0 && p.goals.length > 0)).toBe(true);
  });
});
