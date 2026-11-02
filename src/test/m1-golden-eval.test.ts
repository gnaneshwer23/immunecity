/**
 * M1 G-Ask / G-Mech golden-set eval — automated baselines + founder_sme_interim protocol.
 * Run: bun test src/test/m1-golden-eval.test.ts
 */
import { describe, expect, it } from "bun:test";
import {
  M1_GOLDEN_CASES,
  M1_GOLDEN_EVAL_SCHEMA,
  M1_GOLDEN_SET_ID,
  M1_GOLDEN_SME_SIGNOFF,
  runM1GoldenEval,
} from "@/lib/research/m1GoldenEval";

describe("M1 G-Ask/G-Mech golden eval", () => {
  it("freezes expanded automated cases without inventing numeric SME scores", () => {
    expect(M1_GOLDEN_CASES.length).toBeGreaterThanOrEqual(8);
    expect(M1_GOLDEN_CASES.filter((c) => c.kind === "mechanism_match").length).toBeGreaterThanOrEqual(
      5,
    );
    expect(M1_GOLDEN_CASES.filter((c) => c.kind === "refuse_clinical").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(M1_GOLDEN_CASES.some((c) => c.kind === "refuse_no_match")).toBe(true);
  });

  it("records founder-authorized interim SME protocol acceptance with honest provenance", () => {
    expect(M1_GOLDEN_SME_SIGNOFF.expertReviewStatus).toBe("founder_sme_interim");
    expect(M1_GOLDEN_SME_SIGNOFF.targetsConfirmedBy).toBe("founder-authorized 2026-11-02");
    expect(M1_GOLDEN_SME_SIGNOFF.signedOffAt).toBe("2026-11-02T00:00:00.000Z");
    expect(M1_GOLDEN_SME_SIGNOFF.comment).toMatch(/interim founder SME/i);
    expect(M1_GOLDEN_SME_SIGNOFF.comment).toMatch(/external SME still recommended/i);
  });

  it("passes automated baselines under founder_sme_interim (not clinical validation)", () => {
    const bundle = runM1GoldenEval(new Date("2026-11-02T12:00:00.000Z"));
    expect(bundle.schemaVersion).toBe(M1_GOLDEN_EVAL_SCHEMA);
    expect(bundle.goldenSetId).toBe(M1_GOLDEN_SET_ID);
    expect(bundle.notCds).toBe(true);
    expect(bundle.clinicalAdvice).toBe(false);
    expect(bundle.kgWrite).toBe(false);
    expect(bundle.expertReviewStatus).toBe("founder_sme_interim");
    expect(bundle.targetsConfirmedBy).toBe("founder-authorized 2026-11-02");
    expect(bundle.signedOffAt).toBe("2026-11-02T00:00:00.000Z");
    expect(bundle.signOffComment).toMatch(/interim founder SME/i);
    expect(bundle.baselinesOnly).toBe(true);
    expect(bundle.summary.caseCount).toBe(M1_GOLDEN_CASES.length);
    expect(bundle.summary.failed).toBe(0);
    expect(bundle.summary.passed).toBe(bundle.summary.caseCount);
    expect(bundle.summary.mechanismPass).toBeGreaterThanOrEqual(5);
    expect(bundle.summary.refuseCorrect).toBeGreaterThanOrEqual(3);
    expect(bundle.honesty.some((h) => /founder_sme_interim/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /not clinical validation/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /external SME still recommended/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /baselinesOnly=true/i.test(h))).toBe(true);
    // No invented named external immunologist in provenance
    expect(bundle.targetsConfirmedBy).not.toMatch(/Dr\.|PhD|MD,/i);
    expect(JSON.stringify(bundle)).not.toMatch(/awaiting_sme/);

    for (const c of bundle.cases) {
      expect(c.passed).toBe(true);
      if (c.expectBriefOk) {
        expect(c.briefOk).toBe(true);
        expect(c.matched).toBe(true);
        expect(c.checks.some((ch) => ch.checkId === "companions_present" && ch.passed)).toBe(
          true,
        );
      } else {
        expect(c.briefOk).toBe(false);
      }
    }
  });
});
