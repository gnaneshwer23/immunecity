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
import { KG, edgeByRel, relId, shortestPath } from "../src/lib/immune/engine.ts";
import { graphReleaseSnapshot, GRAPH_CORE_VERSION } from "../src/lib/immune/graphRelease.ts";
import { EXEMPLAR_PATHWAYS, reportExemplar } from "../src/lib/immune/exemplarPathways.ts";
import { reasonMechanism } from "../src/lib/immune/mechanismReasoning.ts";
import { SCIENTIFIC_EVAL_SET } from "../src/test/eval/scientific-eval-set.ts";
import { implementedModels } from "../src/lib/ai/modelRegistry.ts";
import { createHypothesisDraft, hypothesisCompleteness } from "../src/lib/research/hypothesisDraft.ts";

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
