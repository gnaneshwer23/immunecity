/**
 * Ask educational gold-set v0 — automated baselines + founder_sme_interim protocol.
 * Separate from M1 G-Ask/G-Mech. Run: bun test src/test/ask-educational-gold-set.test.ts
 */
import { describe, expect, it } from "bun:test";
import {
  ASK_EDU_GOLD_CASES,
  ASK_EDU_GOLD_SCHEMA,
  ASK_EDU_GOLD_SET_ID,
  ASK_EDU_SME_SIGNOFF,
  runAskEducationalGoldEval,
} from "@/lib/askEducationalGoldSet";
import { M1_GOLDEN_SET_ID } from "@/lib/research/m1GoldenEval";

describe("Ask educational gold-set v0", () => {
  it("freezes required case kinds without inventing accuracy %", () => {
    expect(ASK_EDU_GOLD_CASES.length).toBeGreaterThanOrEqual(7);
    expect(ASK_EDU_GOLD_CASES.some((c) => c.kind === "concept_lookup")).toBe(true);
    expect(ASK_EDU_GOLD_CASES.some((c) => c.kind === "mechanism_q")).toBe(true);
    expect(ASK_EDU_GOLD_CASES.some((c) => c.kind === "clinical_person_refuse")).toBe(true);
    expect(ASK_EDU_GOLD_CASES.some((c) => c.kind === "empty_match")).toBe(true);
    expect(ASK_EDU_GOLD_CASES.filter((c) => c.kind === "concept_lookup").length).toBeGreaterThanOrEqual(
      2,
    );
    expect(ASK_EDU_GOLD_CASES.filter((c) => c.kind === "mechanism_q").length).toBeGreaterThanOrEqual(2);
    expect(
      ASK_EDU_GOLD_CASES.filter((c) => c.kind === "clinical_person_refuse").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("records founder-authorized interim SME protocol acceptance with honest provenance", () => {
    expect(ASK_EDU_SME_SIGNOFF.expertReviewStatus).toBe("founder_sme_interim");
    expect(ASK_EDU_SME_SIGNOFF.targetsConfirmedBy).toBe("founder-authorized 2026-11-02");
    expect(ASK_EDU_SME_SIGNOFF.signedOffAt).toBe("2026-11-02T00:00:00.000Z");
    expect(ASK_EDU_SME_SIGNOFF.comment).toMatch(/interim founder SME/i);
    expect(ASK_EDU_SME_SIGNOFF.comment).toMatch(/external SME still recommended/i);
    expect(ASK_EDU_SME_SIGNOFF.comment).toMatch(/separate from M1/i);
    expect(ASK_EDU_GOLD_SET_ID).toBe("Ask-edu-gold-v0");
    expect(ASK_EDU_GOLD_SET_ID).not.toBe(M1_GOLDEN_SET_ID);
  });

  it("passes automated prepareAsk baselines under founder_sme_interim (not clinical validation)", () => {
    const bundle = runAskEducationalGoldEval(new Date("2026-11-02T12:00:00.000Z"));
    expect(bundle.schemaVersion).toBe(ASK_EDU_GOLD_SCHEMA);
    expect(bundle.goldenSetId).toBe(ASK_EDU_GOLD_SET_ID);
    expect(bundle.separateFromM1).toBe(true);
    expect(bundle.m1GoldenSetId).toBe(M1_GOLDEN_SET_ID);
    expect(bundle.notCds).toBe(true);
    expect(bundle.clinicalAdvice).toBe(false);
    expect(bundle.kgWrite).toBe(false);
    expect(bundle.baselinesOnly).toBe(true);
    expect(bundle.expertReviewStatus).toBe("founder_sme_interim");
    expect(bundle.targetsConfirmedBy).toBe("founder-authorized 2026-11-02");
    expect(bundle.signedOffAt).toBe("2026-11-02T00:00:00.000Z");
    expect(bundle.signOffComment).toMatch(/interim founder SME/i);
    expect(bundle.summary.caseCount).toBe(ASK_EDU_GOLD_CASES.length);
    expect(bundle.summary.failed).toBe(0);
    expect(bundle.summary.passed).toBe(bundle.summary.caseCount);
    expect(bundle.summary.byKind.concept_lookup.passed).toBe(
      bundle.summary.byKind.concept_lookup.total,
    );
    expect(bundle.summary.byKind.mechanism_q.passed).toBe(bundle.summary.byKind.mechanism_q.total);
    expect(bundle.summary.byKind.clinical_person_refuse.passed).toBe(
      bundle.summary.byKind.clinical_person_refuse.total,
    );
    expect(bundle.summary.byKind.empty_match.passed).toBe(bundle.summary.byKind.empty_match.total);

    expect(bundle.honesty.some((h) => /founder_sme_interim/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /not clinical validation/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /external SME still recommended/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /baselinesOnly=true/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /Separate from M1/i.test(h))).toBe(true);
    expect(bundle.honesty.some((h) => /do not invent accuracy/i.test(h))).toBe(true);
    // Forbid fabricated partner/MoU claims; allow honest "no agreement invented" denials
    expect(bundle.honesty.some((h) => /No partner agreement invented/i.test(h))).toBe(true);
    expect(JSON.stringify(bundle)).not.toMatch(
      /\b(signed|executed|filed)\s+(MoU|memorandum of understanding)\b/i,
    );
    // No invented named external immunologist in provenance
    expect(bundle.targetsConfirmedBy).not.toMatch(/Dr\.|PhD|MD,/i);
    expect(JSON.stringify(bundle)).not.toMatch(/"expertReviewStatus":"awaiting_sme"/);

    for (const c of bundle.cases) {
      expect(c.passed).toBe(true);
      if (c.kind === "clinical_person_refuse" || c.kind === "empty_match") {
        expect(c.callModel).toBe(false);
        expect(c.abstained).toBe(true);
        expect(c.matched).toBe(false);
      } else {
        expect(c.callModel).toBe(true);
        expect(c.matched).toBe(true);
        expect(c.abstained).toBe(false);
      }
    }
  });
});
