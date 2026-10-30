import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { askEvaluationFromGate, ASK_EVALUATION_OUTCOMES } from "@/lib/askEvaluation";
import { summariseAskEvaluations, emptyAskQualitySummary } from "@/lib/askQualityDashboard";
import {
  askResponseContractSchema,
  buildAskResponseContract,
  evidenceLabelFromGrounding,
} from "@/lib/askResponseContract";
import {
  PROMPT_VERSION,
  SYSTEM,
  counterEvidenceBucketLabel,
  prepareAsk,
} from "@/lib/askGrounding";

const root = resolve(import.meta.dirname, "../..");

describe("Ask quality loop v1", () => {
  it("bumps prompt version and documents Gate C vs provisional contract in SYSTEM", () => {
    expect(PROMPT_VERSION).toBe("ask-grounding-v11");
    expect(SYSTEM).toMatch(/RESPONSE_CONTRACT/);
    expect(SYSTEM).toMatch(/Gate C reviewed support/);
    expect(SYSTEM).toMatch(/provisional unreviewed literature/);
    expect(SYSTEM).toMatch(/honest empty set/);
    expect(SYSTEM).toMatch(/Not fully evidence-grounded AI/);
    expect(SYSTEM).not.toMatch(/clinical decision support ready/i);
  });

  it("builds a structured response contract without inventing cites", () => {
    const prepared = prepareAsk("How does TNF relate to rheumatoid arthritis?");
    const contract = buildAskResponseContract(prepared.grounding, prepared.queryClass);
    expect(askResponseContractSchema.safeParse(contract).success).toBe(true);
    expect(contract.promptVersion).toBe(PROMPT_VERSION);
    expect(contract.honesty).toBe("educational_beta_not_cds");
    expect(contract.retrievedConcepts.every((c) => c.id && c.name)).toBe(true);
    expect(["gate_c", "provisional", "none", "abstained"]).toContain(contract.evidenceLabel);
    expect(evidenceLabelFromGrounding(prepared.grounding)).toBe(contract.evidenceLabel);
  });

  it("marks clinical questions abstained with redacted eval + prompt version", () => {
    const prepared = prepareAsk("Is my lupus flaring and should I change steroids?");
    expect(prepared.callModel).toBe(false);
    expect(prepared.grounding.trace.abstained).toBe(true);
    const record = askEvaluationFromGate({
      callModel: false,
      abstentionReason: prepared.grounding.trace.abstentionReason,
      personalHealth: true,
      validation: null,
      promptVersion: PROMPT_VERSION,
    });
    expect(record.outcome).toBe("abstained");
    expect(record.questionRedacted).toBe(true);
    expect(record.promptVersion).toBe(PROMPT_VERSION);
    expect(Object.keys(record).sort()).toEqual(
      ["outcome", "promptVersion", "questionRedacted", "reasonCode"].sort(),
    );
  });

  it("aggregates outcome rates by prompt version without question text", () => {
    const summary = summariseAskEvaluations([
      { outcome: "allowed", reasonCode: "allowed", questionRedacted: false, promptVersion: "ask-grounding-v10" },
      { outcome: "abstained", reasonCode: "clinical_personal", questionRedacted: true, promptVersion: "ask-grounding-v10" },
      { outcome: "citation_rejected", reasonCode: "citation_rejected", questionRedacted: false, promptVersion: "ask-grounding-v9" },
    ]);
    expect(summary.total).toBe(3);
    expect(summary.redactedCount).toBe(1);
    expect(summary.byPromptVersion).toHaveLength(2);
    const v10 = summary.byPromptVersion.find((p) => p.promptVersion === "ask-grounding-v10");
    expect(v10?.outcomes.find((o) => o.outcome === "allowed")?.count).toBe(1);
    expect(v10?.outcomes.find((o) => o.outcome === "abstained")?.count).toBe(1);
    expect(summary.note).toMatch(/never as full question text/i);
    expect(emptyAskQualitySummary().total).toBe(0);
    expect(ASK_EVALUATION_OUTCOMES).toContain("conflict");
  });

  it("keeps empty counterevidence labelled as empty set", () => {
    expect(counterEvidenceBucketLabel(0)).toMatch(/honest empty/i);
    expect(counterEvidenceBucketLabel(2)).toBe("2 contradicts/partial");
  });

  it("ships additive prompt_version migration and admin dashboard wiring", () => {
    const sql = readFileSync(resolve(root, "drizzle/migrations/0014_ai_evaluation_prompt_version.sql"), "utf8");
    expect(sql).toContain("prompt_version");
    expect(sql).not.toMatch(/question_text|confidence/);
    const dash = readFileSync(resolve(root, "src/lib/askQualityDashboard.ts"), "utf8");
    expect(dash).not.toMatch(/\bquestionText\b|\.question\b/);
    expect(dash).toMatch(/never as full question text/i);
    const ui = readFileSync(resolve(root, "src/components/immune/AskQualityDashboard.tsx"), "utf8");
    expect(ui).toContain("getAskQualityDashboard");
    expect(ui).toMatch(/never shows question text|never logged here/i);
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["ask:quality"]).toContain("ask-quality-harness");
    expect(pkg.scripts["sme:status"]).toContain("sme-gold-set-status");
    expect(pkg.scripts["benchmark:retrieval"]).toContain("benchmark-retrieval-baseline");
  });
});
