/* Lightweight smoke runner when vitest hangs in this environment. */
import {
  ASK_DISABLED_MESSAGE,
  attachProvisionalLiterature,
  classifyAskQuery,
  prepareAsk,
  validateAnswerCitations,
  graphContext,
  isAskEmergencyDisabled,
  isPersonalClinical,
  rateLimited,
  SYSTEM,
  PROMPT_VERSION,
} from "../src/lib/askGrounding.ts";
import { KG, byId, edgeByRel, relId, shortestPath } from "../src/lib/immune/engine.ts";
import { graphReleaseSnapshot, GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "../src/lib/immune/graphRelease.ts";
import { EXEMPLAR_PATHWAYS, reportExemplar } from "../src/lib/immune/exemplarPathways.ts";
import { reasonMechanism } from "../src/lib/immune/mechanismReasoning.ts";
import { SCIENTIFIC_EVAL_SET } from "../src/test/eval/scientific-eval-set.ts";
import {
  MODEL_REGISTRY,
  adapterPromotionGate,
  dryRunAllStubs,
  implementedModels,
  invokeModelStub,
  isRunnable,
  plannedMolecularStubs,
  registryHonestySummary,
  requestShapePreview,
  validateModelRequest,
} from "../src/lib/ai/modelRegistry.ts";
import { createHypothesisDraft, hypothesisCompleteness } from "../src/lib/research/hypothesisDraft.ts";
import {
  addCandidateClaim,
  advanceStep,
  canAcceptForCuration,
  canVisitLitStep,
  createLiteratureProject,
  detectConflicts,
  exportCurationManifest,
  goToStep,
  handoffReadiness,
  mapClaim,
  normaliseOptionalId,
  reviewClaim,
  searchMetadataComplete,
  seedFromCoverageGap,
  setClaimSupport,
  validateMetadata,
} from "../src/lib/research/literatureWorkflow.ts";
import {
  addEvidenceNote,
  advanceWorkbench,
  buildWorkbenchExport,
  canVisitStep,
  createWorkbenchSession,
  exportWorkbench,
  importCurationManifest,
  importLiteratureCandidates,
  importLiteraturePayload,
  importMechanismResult,
  restoreWorkbenchFromExportJson,
  seedQuestionFromAsk,
  sessionCandidateFlags,
  setWorkbenchStep,
  workbenchProgress,
  WORKBENCH_SCHEMA_VERSION,
} from "../src/lib/research/workbench.ts";
import { phaseStatusSummary } from "../src/data/implementation-phases.ts";
import { EXT_PROVENANCE } from "../src/data/extensions.ts";
import { domainCoverageReport, knowledgeGapQueue } from "../src/lib/immune/domainCoverage.ts";

let failed = 0;
function check(name: string, cond: boolean, detail = "") {
  if (!cond) {
    failed++;
    console.error("FAIL", name, detail);
  } else {
    console.log("ok", name);
  }
}

check("rel ids", KG.relationships.every((r) => !!edgeByRel[relId(r)]));
const s = graphReleaseSnapshot();
check("core+draft nodes", s.coreNodes + s.draftNodes === s.runtimeNodes);
check("prompt", !!PROMPT_VERSION);
check("tnf class", classifyAskQuery("How does TNF drive rheumatoid arthritis?") === "graph_explanation");
check("clinical", isPersonalClinical("What dose of prednisone should I take?"));
check("omics prepare", prepareAsk("Run scRNA-seq on AnnData").callModel === false);
check("unsupported prepare", prepareAsk("zzqxzyxq nonontology foobarium").callModel === false);
const g = graphContext("How does TNF drive rheumatoid arthritis?");
check("matched", g.coverage.matched);
check("trace", g.trace.promptVersion === PROMPT_VERSION);
check("cite bad", validateAnswerCitations("PMID 99999999 [x](concept:FAKE99)", g).ok === false);
check("cite ok", validateAnswerCitations("[TNF](concept:M001) [e](edge:REL-M001-contributes_to-D001)", g).ok === true);
check("mech", !!reasonMechanism("C003", "I001", "D001", "inhibit")?.illustrative);
check("system", /Never invent citations/.test(SYSTEM));
check("registry empty", implementedModels().length === 0);
check("registry interfaces", MODEL_REGISTRY.every((m) => m.status !== "implemented"));
check("registry not runnable", MODEL_REGISTRY.every((m) => !isRunnable(m) && m.version === null));
check("registry categories", new Set(MODEL_REGISTRY.map((m) => m.category)).size === 5);
check("registry request shapes", MODEL_REGISTRY.every((m) => m.requestFields.length > 0 && !!requestShapePreview(m)));
{
  const stubs = dryRunAllStubs();
  check("registry stub refuse", stubs.length === MODEL_REGISTRY.length && stubs.every((r) => r.kind === "not_available"));
  check("registry no sci claims", stubs.every((r) => r.scientificClaimAllowed === false));
  check("registry unknown refuse", invokeModelStub("missing-adapter").kind === "not_available");
  check("registry honesty summary", registryHonestySummary().implemented === 0);
  const mol = plannedMolecularStubs();
  check("registry molecular stubs", mol.length >= 2 && mol.every((m) => m.status === "planned"));
  check(
    "registry shape ok",
    MODEL_REGISTRY.every((m) => validateModelRequest(m.id, m.exampleRequest).ok),
  );
  check(
    "registry shape bad",
    validateModelRequest("peptide-mhc", { family: "epitope" }).ok === false,
  );
  check("registry promote blocked", adapterPromotionGate("peptide-mhc").canPromote === false);
}
check("ext version", GRAPH_EXTENSIONS_VERSION === "draft-ext-4" && EXT_PROVENANCE.version === "draft-ext-4");
check("immuno B node", !!byId["EG01"]?.draft && !!byId["EG13"]?.draft && !!byId["EI01"]?.draft && !!byId["EP10"]?.draft && !!byId["EP15"]?.draft && !!byId["EG17"]?.draft);
{
  const cov = domainCoverageReport();
  check("domain coverage domains", cov.domains.length === 7 && cov.summary.lessonsPresent === 7);
  check("domain coverage no isolated", cov.summary.isolatedConcepts === 0 && cov.summary.thinDomains === 0);
  check("domain gap queue", knowledgeGapQueue(10).length > 0);
  check("B paths", !!shortestPath("EP15", "EP01", true) && !!shortestPath("EG17", "EG12", true));
}
check("no fake pmid", normaliseOptionalId("placeholder") === undefined);
{
  const gap = knowledgeGapQueue(1)[0]!;
  const seeded = seedFromCoverageGap(gap, GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION);
  check("lit gap seed", seeded.seededFromGapId === gap.id && seeded.status === "draft_scaffold");
  check("lit gap no pmid", !seeded.search.pmid && !seeded.search.doi);
  check("lit furthest gate", canVisitLitStep(seeded, "claim_approval").ok === false);
  check("lit visit unlocked", canVisitLitStep(seeded, seeded.step).ok === true);
  // Empty project cannot advance past source — goToStep must not free-jump.
  const blocked = createLiteratureProject(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION);
  check("lit blocked jump", goToStep(blocked, "claim_approval").step === "source_identification");
}
let lit = createLiteratureProject(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, {
  query: "HLA shared epitope RA",
  title: "Manual metadata entry",
});
check("lit search", searchMetadataComplete(lit.search).ok);
check("lit step source", lit.step === "source_identification");
check("lit furthest init", lit.furthestStep === "source_identification");
check("lit metadata local", validateMetadata(lit.search).ok);
lit = advanceStep(lit);
check("lit step metadata", lit.step === "metadata_validation");
lit = advanceStep(lit);
check("lit step claims", lit.step === "candidate_claims");
lit = addCandidateClaim(lit, { text: "Shared epitope associates with ACPA+ RA" });
check("lit accept gated", canAcceptForCuration(lit, lit.claims[0]!.claim_id).ok === false);
lit = mapClaim(lit, lit.claims[0]!.claim_id, ["EG01", "EG10"], ["REL-EG01-associates_with-EG10"]);
lit = setClaimSupport(lit, lit.claims[0]!.claim_id, "supports");
check("lit accept ok", canAcceptForCuration(lit, lit.claims[0]!.claim_id).ok === true);
lit = reviewClaim(lit, lit.claims[0]!.claim_id, "accepted_for_curation");
check("lit candidate", lit.claims[0]!.reviewStatus === "accepted_for_curation" && lit.status === "draft_scaffold");
const litManifest = exportCurationManifest(lit);
check("lit export unreviewed", litManifest.meta.curation === "unreviewed" && litManifest.evidence_records.length > 0);
check("lit export candidate", litManifest.evidence_records.every((g) => g.evidence.every((e) => e.status === "candidate")));
check("lit handoff ready", handoffReadiness(lit).ready === true && handoffReadiness(lit).exportable > 0);
{
  let cproj = createLiteratureProject(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, { query: "x", title: "y" });
  cproj = addCandidateClaim(cproj, { text: "bad map" });
  cproj = mapClaim(cproj, cproj.claims[0]!.claim_id, ["NOPE99"], ["REL-NOPE"]);
  check("lit flags unknown ids", detectConflicts(cproj).some((f) => f.code === "unknown_concept"));
}
let wb = createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION);
check("workbench gate jump", canVisitStep(wb, "experiment").ok === false && setWorkbenchStep(wb, "review").step === "question");
wb = { ...wb, question: { ...wb.question, text: "Does butyrate expand colonic Tregs?" } };
wb = seedQuestionFromAsk(wb);
check("workbench ask seed", wb.question.kind === "candidate" && wb.importLog.some((x) => x.startsWith("ask_seed:")));
wb = advanceWorkbench(wb);
wb = importLiteratureCandidates(wb, lit);
check("workbench lit import", wb.evidence.length >= 1 && wb.evidence.every((e) => e.kind === "candidate"));
wb = addEvidenceNote(wb, "Draft educational note", "no PMID invented");
wb = advanceWorkbench(wb);
{
  const mech = reasonMechanism("C003", "I001", "D001", "inhibit");
  check("workbench mech available", !!mech?.illustrative);
  if (mech) wb = importMechanismResult(wb, mech);
}
check("workbench mech import", wb.mechanism.kind === "candidate" && wb.mechanism.illustrative === true);
wb = { ...wb, mechanism: { ...wb.mechanism, paths: wb.mechanism.paths.length ? wb.mechanism.paths : ["EM02 → EM03 → C014"] } };
wb = advanceWorkbench(wb);
check("workbench hyp step", wb.step === "hypothesis");
wb = { ...wb, hypothesis: { ...wb.hypothesis, claim: "Candidate: butyrate expands colonic Tregs" } };
wb = advanceWorkbench(wb);
wb = { ...wb, experiment: { ...wb.experiment, question: "Compare Treg frequency", readouts: "Foxp3+ %" } };
wb = advanceWorkbench(wb);
check("workbench review step", wb.step === "review");
const wbFlags = sessionCandidateFlags(wb);
check("workbench candidates", wbFlags.allCandidates);
const wbExp = buildWorkbenchExport(wb);
check(
  "workbench export",
  wbExp.schemaVersion === WORKBENCH_SCHEMA_VERSION &&
    wbExp.kgWrite === false &&
    wbExp.experimentallySupported === false &&
    /candidate/.test(exportWorkbench(wb)) &&
    exportWorkbench(wb).includes(GRAPH_EXTENSIONS_VERSION),
);
{
  const fromManifest = importCurationManifest(createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION), litManifest);
  check("workbench manifest import", !fromManifest.error && fromManifest.imported > 0 && fromManifest.session.evidence.every((e) => e.kind === "candidate"));
  const payload = importLiteraturePayload(createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION), JSON.stringify(litManifest));
  check("workbench payload detect", payload.source === "manifest" && payload.imported > 0);
  const restored = restoreWorkbenchFromExportJson(exportWorkbench(wb));
  check("workbench restore", !!restored.session && restored.session.question.kind === "candidate" && buildWorkbenchExport(restored.session).kgWrite === false);
  check("workbench progress", workbenchProgress(wb).length === 6 && workbenchProgress(wb)[0]!.ready);
}
const phases = phaseStatusSummary();
check("phases partial", phases.B === "partial" && phases.C === "partial" && phases.D === "partial" && phases.E === "partial");
const h = createHypothesisDraft(
  {
    claim: "x",
    mechanism: "m",
    predictedObservation: "p",
    falsificationTest: "f",
    alternativePath: "a",
    supportingIds: ["M001"],
  },
  GRAPH_CORE_VERSION,
);
check("hyp complete", hypothesisCompleteness(h).ok);

for (const c of SCIENTIFIC_EVAL_SET) {
  try {
    if (c.kind === "unsupported") {
      check(c.id, !graphContext(c.question).coverage.matched && !prepareAsk(c.question).callModel);
    } else if (c.kind === "clinical-refusal") {
      check(c.id, isPersonalClinical(c.question) && classifyAskQuery(c.question) === "clinical_personal");
    } else if (c.kind === "omics-abstention") {
      check(c.id, classifyAskQuery(c.question) === c.expectClass && !prepareAsk(c.question).callModel);
    } else if (c.kind === "classification") {
      check(c.id, classifyAskQuery(c.question) === c.expectClass);
    } else if (c.kind === "path") {
      const gg = graphContext(c.question);
      const [a, b] = c.expectedPathEndpoints;
      check(
        c.id,
        gg.coverage.matched &&
          c.mustRetrieveNodeIds.every((id) => gg.nodeIds.includes(id)) &&
          !!shortestPath(a, b, false)?.length,
      );
    } else if (c.kind === "mechanism") {
      check(c.id, !!reasonMechanism(c.startId, c.perturbId, c.outcomeId, c.mode)?.illustrative);
    } else if (c.kind === "exemplar") {
      const p = EXEMPLAR_PATHWAYS.find((x) => x.id === c.pathwayId)!;
      check(c.id, reportExemplar(p).connected === c.expectConnected);
    } else if (c.kind === "citation-validation") {
      let g = graphContext(c.question);
      if (c.provisionalPmids?.length) {
        g = attachProvisionalLiterature(
          g,
          c.provisionalPmids.map((pmid) => ({
            pmid,
            doi: null,
            title: "Fixture",
            journal: "Fixture",
            year: "2020",
            source: "PubMed" as const,
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          })),
        );
      }
      check(c.id, validateAnswerCitations(c.answerText, g).ok === c.expectOk);
    } else if (c.kind === "provisional-labelling") {
      const cls = classifyAskQuery(c.question);
      check(c.id, cls === "source_lookup" || graphContext(c.question, cls).coverage.matched);
    } else if (c.kind === "multi-concept") {
      const gg = graphContext(c.question);
      check(
        c.id,
        gg.coverage.matched &&
          c.mustRetrieveNodeIds.every((id) => gg.nodeIds.includes(id)) &&
          (gg.links.length > 0 || gg.chains.length > 0),
      );
    }
  } catch (e) {
    failed++;
    console.error("FAIL", c.id, e);
  }
}

const now = 2_000_000;
for (let i = 0; i < 8; i++) rateLimited("smoke", 8, 60_000, now);
check("rate limit", rateLimited("smoke", 8, 60_000, now) === true);
check("ask disable off", isAskEmergencyDisabled({} as any) === false);
check("ask disable on", isAskEmergencyDisabled({ IMMUNE_ASK_DISABLED: "1" } as any) === true);
check("ask disable msg", ASK_DISABLED_MESSAGE.includes("temporarily disabled"));

console.log(failed === 0 ? `\nALL PASSED (${SCIENTIFIC_EVAL_SET.length} eval cases + unit checks)` : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
