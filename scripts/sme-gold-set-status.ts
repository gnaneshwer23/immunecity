#!/usr/bin/env bun
/** Print SME gold-set inventory + explicit awaiting-SME status (never auto-signs). */
import { SCIENTIFIC_EVAL_SET } from "../src/test/eval/scientific-eval-set.ts";

const byKind = new Map<string, number>();
for (const c of SCIENTIFIC_EVAL_SET) {
  byKind.set(c.kind, (byKind.get(c.kind) || 0) + 1);
}

const status = {
  document: "docs/SME_GOLD_SET_SIGNOFF.md",
  signOffStatus: "awaiting_sme",
  automatedCaseCount: SCIENTIFIC_EVAL_SET.length,
  byKind: Object.fromEntries([...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  prdTarget: 100,
  gapToPrd: Math.max(0, 100 - SCIENTIFIC_EVAL_SET.length),
  humanOnly: [
    "SME review of path expectations",
    "SME acceptance of refusal/abstention wording",
    "Named sign-off in docs/SME_GOLD_SET_SIGNOFF.md",
  ],
  note: "This script never marks SME sign-off complete. Fill the checklist in docs/SME_GOLD_SET_SIGNOFF.md.",
};

console.log(JSON.stringify(status, null, 2));
if (status.signOffStatus !== "awaiting_sme") {
  console.error("Unexpected: harness must remain awaiting_sme until a human edits the doc.");
  process.exit(1);
}
