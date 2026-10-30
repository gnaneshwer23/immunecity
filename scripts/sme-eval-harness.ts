#!/usr/bin/env bun
/** Print SME workspace eval report with honest denominators (never invents scores). */
import { assertSmeEvalHonesty, runSmeEvalHarness } from "../src/lib/sme/evalRunner.ts";

const report = runSmeEvalHarness();
const honesty = assertSmeEvalHonesty(report);
console.log(
  JSON.stringify(
    {
      ...report,
      honesty,
      document: "docs/ISI_SME_WORKSPACE.md",
      surface: "/sme",
    },
    null,
    2,
  ),
);
if (!honesty.ok) {
  console.error(honesty.reason);
  process.exit(1);
}
