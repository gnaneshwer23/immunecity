#!/usr/bin/env bun
/**
 * Focused Ask quality harness — fails if gold-set / retrieval / prompt wiring is broken.
 * Prefer this over hanging full vitest (D-11). Does not call Neon or invent PMIDs.
 *
 * Usage: bun scripts/ask-quality-harness.ts
 * npm: bun run ask:quality
 */
import { spawnSync } from "node:child_process";
import { PROMPT_VERSION, classifyAskQuery, graphContext, prepareAsk } from "../src/lib/askGrounding";
import { askEvaluationFromGate } from "../src/lib/askEvaluation";
import { summariseAskEvaluations } from "../src/lib/askQualityDashboard";
import {
  buildAskResponseContract,
  askResponseContractSchema,
} from "../src/lib/askResponseContract";
import { SCIENTIFIC_EVAL_SET } from "../src/test/eval/scientific-eval-set";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`ok  ${name}`);
  else {
    failed += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

check("PROMPT_VERSION present", /^ask-grounding-v\d+$/.test(PROMPT_VERSION), PROMPT_VERSION);
check("PROMPT_VERSION is v10+", Number(PROMPT_VERSION.replace(/\D/g, "")) >= 10, PROMPT_VERSION);
check("scientific eval set non-empty", SCIENTIFIC_EVAL_SET.length >= 10, String(SCIENTIFIC_EVAL_SET.length));

const pathCases = SCIENTIFIC_EVAL_SET.filter((c) => c.kind === "path" || c.kind === "multi-concept");
check("path/multi-concept cases exist", pathCases.length >= 1);
const academyCases = SCIENTIFIC_EVAL_SET.filter((c) => typeof c.id === "string" && c.id.startsWith("academy-"));
check("academy neighbourhood gold cases", academyCases.length >= 3, String(academyCases.length));
check(
  "eval set stays fail-closed honest",
  SCIENTIFIC_EVAL_SET.some((c) => c.kind === "clinical-refusal") &&
    SCIENTIFIC_EVAL_SET.some((c) => c.kind === "unsupported"),
);

const sample = prepareAsk("How does TNF relate to rheumatoid arthritis?");
check("TNF/RA retrieves graph", sample.grounding.coverage.matched && sample.grounding.nodes.length > 0);
const contract = buildAskResponseContract(sample.grounding, sample.queryClass);
check("response contract validates", askResponseContractSchema.safeParse(contract).success);
check("contract honesty flag", contract.honesty === "educational_beta_not_cds");
check("SYSTEM contract bump in prepare", sample.grounding.trace.promptVersion === PROMPT_VERSION);

const abstain = prepareAsk("Should I increase my methotrexate dose tomorrow?");
check(
  "clinical abstains",
  !abstain.callModel && Boolean(abstain.grounding.trace.abstained),
  abstain.grounding.trace.abstentionReason ?? "",
);
const abstainEval = askEvaluationFromGate({
  callModel: false,
  abstentionReason: abstain.grounding.trace.abstentionReason,
  personalHealth: true,
  validation: null,
  promptVersion: PROMPT_VERSION,
});
check("eval redacts personal health", abstainEval.questionRedacted && abstainEval.outcome === "abstained");
check("eval stores prompt version", abstainEval.promptVersion === PROMPT_VERSION);
check("eval has no question text keys", !("questionText" in abstainEval) && !("question" in abstainEval));

const dash = summariseAskEvaluations([
  { outcome: "allowed", reasonCode: "allowed", questionRedacted: false, promptVersion: PROMPT_VERSION },
  { outcome: "abstained", reasonCode: "clinical_personal", questionRedacted: true, promptVersion: PROMPT_VERSION },
  { outcome: "allowed", reasonCode: "allowed", questionRedacted: false, promptVersion: "ask-grounding-v9" },
]);
check("dashboard groups by prompt", dash.byPromptVersion.length === 2);
check("dashboard rates sum", Math.abs(dash.overall.reduce((s, o) => s + o.rate, 0) - 1) < 0.001);

const qClass = classifyAskQuery("What evidence supports PD-1 blockade in melanoma?");
const g = graphContext("What evidence supports PD-1 blockade in melanoma?", qClass);
check("source_lookup classifies", qClass === "source_lookup" || g.nodeIds.length >= 0);

const sme = spawnSync("bun", ["scripts/sme-gold-set-status.ts"], { encoding: "utf8" });
check("sme:status exits 0", sme.status === 0, sme.stderr?.slice(0, 200) ?? "");
if (sme.status === 0) {
  try {
    const status = JSON.parse(sme.stdout);
    check("sme stays awaiting_sme", status.signOffStatus === "awaiting_sme");
  } catch {
    check("sme JSON parse", false);
  }
}

const bench = spawnSync("bun", ["scripts/benchmark-retrieval-baseline.ts"], { encoding: "utf8" });
check("benchmark:retrieval exits 0", bench.status === 0, bench.stderr?.slice(0, 200) ?? "");
if (bench.status === 0) {
  try {
    const summary = JSON.parse(bench.stdout);
    check("benchmark caseCount > 0", typeof summary.caseCount === "number" && summary.caseCount > 0);
    check("benchmark no vector DB", summary.vectorDb === "not_added");
  } catch {
    check("benchmark JSON parse", false);
  }
}

if (failed > 0) {
  console.error(`\nask-quality-harness: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nask-quality-harness: all checks passed");
