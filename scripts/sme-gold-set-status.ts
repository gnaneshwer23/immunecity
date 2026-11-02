#!/usr/bin/env bun
/** Print SME gold-set inventory + explicit awaiting-SME status (never auto-signs). */
import { SCIENTIFIC_EVAL_SET } from "../src/test/eval/scientific-eval-set.ts";
import {
  ASK_EDU_GOLD_CASES,
  ASK_EDU_GOLD_SET_ID,
  ASK_EDU_SME_SIGNOFF,
  runAskEducationalGoldEval,
} from "../src/lib/askEducationalGoldSet.ts";

const byKind = new Map<string, number>();
for (const c of SCIENTIFIC_EVAL_SET) {
  byKind.set(c.kind, (byKind.get(c.kind) || 0) + 1);
}

const eduByKind = new Map<string, number>();
for (const c of ASK_EDU_GOLD_CASES) {
  eduByKind.set(c.kind, (eduByKind.get(c.kind) || 0) + 1);
}

const eduBundle = runAskEducationalGoldEval();

const status = {
  document: "docs/SME_GOLD_SET_SIGNOFF.md",
  signOffGuide: "docs/ASK_EDUCATIONAL_GOLD_SET.md",
  signOffStatus: "awaiting_sme",
  askEducationalGold: {
    goldenSetId: ASK_EDU_GOLD_SET_ID,
    expertReviewStatus: ASK_EDU_SME_SIGNOFF.expertReviewStatus,
    targetsConfirmedBy: ASK_EDU_SME_SIGNOFF.targetsConfirmedBy,
    caseCount: ASK_EDU_GOLD_CASES.length,
    byKind: Object.fromEntries([...eduByKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    baselinesOnly: true as const,
    separateFromM1: true as const,
    automatedPassed: eduBundle.summary.passed,
    automatedFailed: eduBundle.summary.failed,
  },
  automatedCaseCount: SCIENTIFIC_EVAL_SET.length,
  byKind: Object.fromEntries([...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  prdTarget: 100,
  gapToPrd: Math.max(0, 100 - SCIENTIFIC_EVAL_SET.length),
  humanOnly: [
    "SME review of path expectations",
    "SME acceptance of refusal/abstention wording",
    "Named sign-off in docs/SME_GOLD_SET_SIGNOFF.md",
    "Ask-edu-gold-v0 founder_sme_interim recorded 2026-11-02 — named external SME still open for signed_off",
  ],
  note: "This script never marks named SME sign-off complete. Ask-edu-gold-v0 is founder_sme_interim (protocol only); fill docs/SME_GOLD_SET_SIGNOFF.md for signed_off. Separate from M1 G-Ask/G-Mech.",
};

console.log(JSON.stringify(status, null, 2));

if (status.signOffStatus !== "awaiting_sme") {
  console.error("Unexpected: harness must remain awaiting_sme until a human edits the doc.");
  process.exit(1);
}

if (ASK_EDU_SME_SIGNOFF.expertReviewStatus === "signed_off" && !ASK_EDU_SME_SIGNOFF.targetsConfirmedBy) {
  console.error("Unexpected: signed_off without targetsConfirmedBy — refuse forged sign-off.");
  process.exit(1);
}

if (eduBundle.summary.failed > 0) {
  console.error(
    `Ask-edu-gold-v0 automated baselines failed: ${eduBundle.summary.failed}/${eduBundle.summary.caseCount}`,
  );
  process.exit(1);
}
