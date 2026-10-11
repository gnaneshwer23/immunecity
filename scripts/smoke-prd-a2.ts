/* Lightweight smoke runner when vitest hangs in this environment. */
import {
  classifyAskQuery,
  prepareAsk,
  validateAnswerCitations,
  graphContext,
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
import { MODEL_REGISTRY, implementedModels } from "../src/lib/ai/modelRegistry.ts";
import { createHypothesisDraft, hypothesisCompleteness } from "../src/lib/research/hypothesisDraft.ts";
import {
  addCandidateClaim,
  createLiteratureProject,
  normaliseOptionalId,
  reviewClaim,
  searchMetadataComplete,
} from "../src/lib/research/literatureWorkflow.ts";
import {
  addEvidenceNote,
  advanceWorkbench,
  createWorkbenchSession,
  exportWorkbench,
} from "../src/lib/research/workbench.ts";
import { phaseStatusSummary } from "../src/data/implementation-phases.ts";
import { EXT_PROVENANCE } from "../src/data/extensions.ts";

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
check("ext version", GRAPH_EXTENSIONS_VERSION === "draft-ext-3" && EXT_PROVENANCE.version === "draft-ext-3");
check("immuno B node", !!byId["EG01"]?.draft && !!byId["EG13"]?.draft && !!byId["EI01"]?.draft && !!byId["EP10"]?.draft);
check("no fake pmid", normaliseOptionalId("placeholder") === undefined);
let lit = createLiteratureProject(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, {
  query: "HLA shared epitope RA",
  title: "Manual metadata entry",
});
check("lit search", searchMetadataComplete(lit.search).ok);
lit = addCandidateClaim(lit, { text: "Shared epitope associates with ACPA+ RA" });
lit = reviewClaim(lit, lit.claims[0]!.claim_id, "accepted_for_curation");
check("lit candidate", lit.claims[0]!.reviewStatus === "accepted_for_curation" && lit.status === "draft_scaffold");
let wb = createWorkbenchSession(GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION);
wb = { ...wb, question: { ...wb.question, text: "Does butyrate expand colonic Tregs?" } };
wb = advanceWorkbench(wb);
wb = addEvidenceNote(wb, "Draft educational note", "no PMID invented");
wb = advanceWorkbench(wb);
wb = { ...wb, mechanism: { ...wb.mechanism, paths: ["EM02 → EM03 → C014"] } };
wb = advanceWorkbench(wb);
check("workbench hyp step", wb.step === "hypothesis");
check("workbench export", /candidate/.test(exportWorkbench(wb)) && exportWorkbench(wb).includes(GRAPH_EXTENSIONS_VERSION));
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
      check(c.id, validateAnswerCitations(c.answerText, graphContext(c.question)).ok === c.expectOk);
    }
  } catch (e) {
    failed++;
    console.error("FAIL", c.id, e);
  }
}

const now = 2_000_000;
for (let i = 0; i < 8; i++) rateLimited("smoke", 8, 60_000, now);
check("rate limit", rateLimited("smoke", 8, 60_000, now) === true);

console.log(failed === 0 ? `\nALL PASSED (${SCIENTIFIC_EVAL_SET.length} eval cases + unit checks)` : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
