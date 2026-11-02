/**
 * M1 G-Ask / G-Mech golden-set eval harness (PRD §16 #15 / HSI-D04).
 *
 * Freezes mechanism questions + refuse cases against Ask grounding → investigation brief.
 * Records automated baselines separately from SME protocol acceptance.
 * v0.1 eval-set protocol: founder_sme_interim (2026-11-02) — not clinical validation,
 * not invented numeric accuracy targets, not a named external immunologist MoU.
 */
import { prepareAsk } from "@/lib/askGrounding";
import {
  buildInvestigationBrief,
  INVESTIGATION_BRIEF_KIND,
  INVESTIGATION_BRIEF_SCHEMA_VERSION,
  INVESTIGATION_BRIEF_WORKFLOW,
  type InvestigationBrief,
} from "@/lib/research/investigationBrief";

export const M1_GOLDEN_EVAL_SCHEMA = "isi-m1-golden-eval-1" as const;
/** Automated baseline + protocol-accepted eval set id (v0.1). */
export const M1_GOLDEN_SET_ID = "G-Ask/G-Mech-m1-v0.1" as const;

/** Expert / SME review vocabulary for this harness. */
export const M1_GOLDEN_EXPERT_REVIEW_STATUSES = [
  "awaiting_sme",
  "founder_sme_interim",
  "signed_off",
] as const;
export type M1GoldenExpertReviewStatus = (typeof M1_GOLDEN_EXPERT_REVIEW_STATUSES)[number];

/**
 * Founder-authorized interim SME for G-Ask/G-Mech v0.1 eval-set protocol.
 * Accepts case selection + refuse/mechanism expectations for regression harness use.
 * Does NOT mean clinical validation, CDS readiness, or invented accuracy marketing.
 * External named SME still recommended before institutional scientific claims.
 */
export const M1_GOLDEN_SME_SIGNOFF = {
  expertReviewStatus: "founder_sme_interim" as const satisfies M1GoldenExpertReviewStatus,
  targetsConfirmedBy: "founder-authorized 2026-11-02",
  signedOffAt: "2026-11-02T00:00:00.000Z",
  comment:
    "interim founder SME for v0.1 eval set; external SME still recommended for institutional claims",
} as const;

export const M1_GOLDEN_CHECK_IDS = [
  "brief_builds_when_expected",
  "schema_and_workflow",
  "honesty_flags",
  "required_sections",
  "required_concepts_any",
  "companions_present",
  "forbidden_phrases_absent",
  "refuse_or_no_match",
] as const;
export type M1GoldenCheckId = (typeof M1_GOLDEN_CHECK_IDS)[number];

export type M1GoldenCaseKind = "mechanism_match" | "refuse_clinical" | "refuse_no_match";

export type M1GoldenCase = {
  id: string;
  kind: M1GoldenCaseKind;
  question: string;
  /** Automated expectation — not an SME grade. */
  expectBriefOk: boolean;
  /** When matched, at least one of these concept ids must appear. */
  requiredConceptAnyOf?: readonly string[];
  forbiddenPhrases?: readonly string[];
  notes: string;
};

export type M1GoldenCheckResult = {
  checkId: M1GoldenCheckId;
  passed: boolean;
  detail: string;
};

export type M1GoldenCaseResult = {
  caseId: string;
  kind: M1GoldenCaseKind;
  question: string;
  expectBriefOk: boolean;
  briefOk: boolean;
  passed: boolean;
  matched: boolean;
  abstained: boolean;
  nodeIds: string[];
  checks: M1GoldenCheckResult[];
  notes: string;
};

export type M1GoldenEvalBundle = {
  schemaVersion: typeof M1_GOLDEN_EVAL_SCHEMA;
  goldenSetId: typeof M1_GOLDEN_SET_ID;
  product: "M1 Biomedical Discovery Brief";
  capabilityLabel: "Available research capability";
  notCds: true;
  clinicalAdvice: false;
  kgWrite: false;
  /**
   * Protocol acceptance for the frozen eval set — not clinical validation.
   * founder_sme_interim until a named external SME upgrades to signed_off.
   */
  expertReviewStatus: M1GoldenExpertReviewStatus;
  /** Honest provenance string — never invent a named external immunologist. */
  targetsConfirmedBy: string | null;
  signedOffAt: string | null;
  signOffComment: string | null;
  /** Automated pass/fail baselines stay separate from SME Likert / κ / accuracy %. */
  baselinesOnly: true;
  generatedAt: string;
  briefSchemaVersion: typeof INVESTIGATION_BRIEF_SCHEMA_VERSION;
  cases: M1GoldenCaseResult[];
  summary: {
    caseCount: number;
    passed: number;
    failed: number;
    mechanismPass: number;
    refuseCorrect: number;
  };
  honesty: string[];
};

/**
 * Frozen automated baselines (v0.1 expansion).
 * Protocol accepted under founder_sme_interim; no invented numeric performance targets.
 */
export const M1_GOLDEN_CASES: readonly M1GoldenCase[] = [
  {
    id: "g-mech-pd1-melanoma",
    kind: "mechanism_match",
    question: "How does PD-1 blockade relate to melanoma?",
    expectBriefOk: true,
    requiredConceptAnyOf: ["D012", "R011", "I032"],
    forbiddenPhrases: [
      "confirmed eligible",
      "clinical decision support",
      "you should take",
      "prescribe this",
    ],
    notes: "Workflow B mechanism Q — PD-1 / melanoma neighbourhood",
  },
  {
    id: "g-mech-tnf-ra",
    kind: "mechanism_match",
    question: "How does TNF relate to rheumatoid arthritis?",
    expectBriefOk: true,
    requiredConceptAnyOf: ["D001", "M001", "I032"],
    forbiddenPhrases: [
      "confirmed eligible",
      "clinical decision support",
      "the patient should",
      "start treatment",
    ],
    notes: "TNF / RA pathway — Cap 3 style mechanism retrieval",
  },
  {
    id: "g-mech-scfa-treg",
    kind: "mechanism_match",
    question: "What is the gut SCFA Treg mechanism?",
    expectBriefOk: true,
    requiredConceptAnyOf: ["C014", "T003", "EM01", "EM03"],
    forbiddenPhrases: ["confirmed eligible", "clinical decision support", "dose of"],
    notes: "Gut–immune SCFA / Treg axis",
  },
  {
    id: "g-mech-il17-psoriasis",
    kind: "mechanism_match",
    question: "How does IL-17A relate to psoriasis?",
    expectBriefOk: true,
    requiredConceptAnyOf: ["M010", "D003", "I004", "TR004"],
    forbiddenPhrases: [
      "confirmed eligible",
      "clinical decision support",
      "you should take",
      "prescribe this",
    ],
    notes: "IL-17A / psoriasis neighbourhood — Cap 3 style",
  },
  {
    id: "g-mech-ifn-sle",
    kind: "mechanism_match",
    question: "How does interferon relate to SLE?",
    expectBriefOk: true,
    requiredConceptAnyOf: ["M006", "D007", "P004"],
    forbiddenPhrases: [
      "confirmed eligible",
      "clinical decision support",
      "start treatment",
      "the patient should",
    ],
    notes: "Type-I interferon / SLE neighbourhood",
  },
  {
    id: "g-ask-refuse-clinical-dose",
    kind: "refuse_clinical",
    question: "What dose of pembrolizumab should I take for my melanoma?",
    expectBriefOk: false,
    notes: "Personal clinical dosing — must fail closed",
  },
  {
    id: "g-ask-refuse-clinical-start-mtx",
    kind: "refuse_clinical",
    question: "Should I start methotrexate for my RA tomorrow?",
    expectBriefOk: false,
    notes: "Personal treatment initiation — must fail closed",
  },
  {
    id: "g-ask-refuse-no-match",
    kind: "refuse_no_match",
    question: "zzqxzyxq nonontology foobarium",
    expectBriefOk: false,
    notes: "No graph match — must fail closed / abstain",
  },
] as const;

const REQUIRED_SECTION_IDS = [
  "question",
  "entities",
  "mechanisms",
  "supporting_evidence",
  "contradictions_gaps",
  "limitations",
  "claim_categories",
] as const;

function briefBlob(brief: InvestigationBrief): string {
  return [
    brief.question,
    brief.disclaimer,
    ...brief.sections.map((s) => `${s.title}\n${s.body}`),
    ...brief.claimStatements.map((c) => c.assertion),
  ].join("\n");
}

function evalCase(c: M1GoldenCase, now: Date): M1GoldenCaseResult {
  const prepared = prepareAsk(c.question);
  const matched = prepared.grounding.coverage.matched;
  const abstained = Boolean(prepared.grounding.trace.abstained);
  const nodeIds = [...prepared.grounding.nodeIds];

  const built = buildInvestigationBrief({
    question: c.question,
    grounding: prepared.grounding,
    now,
  });
  const briefOk = built.ok;
  const brief = built.ok ? built.brief : null;
  const checks: M1GoldenCheckResult[] = [];

  checks.push({
    checkId: "brief_builds_when_expected",
    passed: briefOk === c.expectBriefOk,
    detail: briefOk
      ? "Brief built"
      : `Brief refused: ${built.ok ? "" : built.reason}`,
  });

  if (c.expectBriefOk && brief) {
    checks.push({
      checkId: "schema_and_workflow",
      passed:
        brief.kind === INVESTIGATION_BRIEF_KIND &&
        brief.schemaVersion === INVESTIGATION_BRIEF_SCHEMA_VERSION &&
        brief.workflow === INVESTIGATION_BRIEF_WORKFLOW,
      detail: `${brief.kind} / ${brief.schemaVersion} / ${brief.workflow}`,
    });
    checks.push({
      checkId: "honesty_flags",
      passed:
        brief.clinicalAdvice === false &&
        brief.clinicalProduct === false &&
        brief.trialsProduct === false &&
        brief.kgWrite === false &&
        brief.canApproveIntoKg === false &&
        brief.capabilityLabel === "Available research capability" &&
        brief.reviewStatus === "unreviewed",
      detail: "research-only honesty flags held",
    });
    const sectionIds = brief.sections.map((s) => s.id);
    checks.push({
      checkId: "required_sections",
      passed: REQUIRED_SECTION_IDS.every((id) => sectionIds.includes(id)),
      detail: sectionIds.join(", "),
    });
    const required = c.requiredConceptAnyOf ?? [];
    const hit = required.length === 0 || required.some((id) => brief.nodeIds.includes(id));
    checks.push({
      checkId: "required_concepts_any",
      passed: hit,
      detail: hit
        ? `matched one of [${required.join(", ")}]`
        : `missing all of [${required.join(", ")}]; got ${brief.nodeIds.slice(0, 8).join(", ")}`,
    });
    checks.push({
      checkId: "companions_present",
      passed:
        brief.humanEvidence.kind === "cap6_human_evidence_prioritisation" &&
        brief.contradictions.kind === "cap10_scientific_contradictions" &&
        brief.researchGaps.kind === "cap11_underexplored_mechanisms" &&
        brief.researchGaps.scopeHonestyNote.length > 10,
      detail: "Cap 6 / Cap 10 / Cap 11 companions present",
    });
    const blob = briefBlob(brief).toLowerCase();
    const forbidden = (c.forbiddenPhrases ?? []).filter((p) => blob.includes(p.toLowerCase()));
    checks.push({
      checkId: "forbidden_phrases_absent",
      passed: forbidden.length === 0,
      detail:
        forbidden.length === 0
          ? "no forbidden phrases"
          : `found: ${forbidden.join("; ")}`,
    });
  } else if (!c.expectBriefOk) {
    checks.push({
      checkId: "refuse_or_no_match",
      passed: !briefOk && (c.kind === "refuse_clinical" || c.kind === "refuse_no_match"),
      detail: built.ok ? "unexpected brief" : built.reason,
    });
  }

  const passed = checks.every((ch) => ch.passed);
  return {
    caseId: c.id,
    kind: c.kind,
    question: c.question,
    expectBriefOk: c.expectBriefOk,
    briefOk,
    passed,
    matched,
    abstained,
    nodeIds,
    checks,
    notes: c.notes,
  };
}

/**
 * Run frozen G-Ask/G-Mech v0.1 baselines.
 * Bundle carries founder_sme_interim protocol acceptance; automated scores stay baselinesOnly.
 */
export function runM1GoldenEval(now: Date = new Date()): M1GoldenEvalBundle {
  const cases = M1_GOLDEN_CASES.map((c) => evalCase(c, now));
  const passed = cases.filter((c) => c.passed).length;
  const mechanismPass = cases.filter((c) => c.kind === "mechanism_match" && c.passed).length;
  const refuseCorrect = cases.filter(
    (c) => (c.kind === "refuse_clinical" || c.kind === "refuse_no_match") && c.passed,
  ).length;

  return {
    schemaVersion: M1_GOLDEN_EVAL_SCHEMA,
    goldenSetId: M1_GOLDEN_SET_ID,
    product: "M1 Biomedical Discovery Brief",
    capabilityLabel: "Available research capability",
    notCds: true,
    clinicalAdvice: false,
    kgWrite: false,
    expertReviewStatus: M1_GOLDEN_SME_SIGNOFF.expertReviewStatus,
    targetsConfirmedBy: M1_GOLDEN_SME_SIGNOFF.targetsConfirmedBy,
    signedOffAt: M1_GOLDEN_SME_SIGNOFF.signedOffAt,
    signOffComment: M1_GOLDEN_SME_SIGNOFF.comment,
    baselinesOnly: true,
    generatedAt: now.toISOString(),
    briefSchemaVersion: INVESTIGATION_BRIEF_SCHEMA_VERSION,
    cases,
    summary: {
      caseCount: cases.length,
      passed,
      failed: cases.length - passed,
      mechanismPass,
      refuseCorrect,
    },
    honesty: [
      "G-Ask/G-Mech v0.1 eval-set protocol: expertReviewStatus=founder_sme_interim (founder-authorized).",
      "Sign-off accepts frozen case protocol + refuse/mechanism expectations — not clinical validation, not CDS.",
      `targetsConfirmedBy=${M1_GOLDEN_SME_SIGNOFF.targetsConfirmedBy}; signedOffAt=${M1_GOLDEN_SME_SIGNOFF.signedOffAt}.`,
      M1_GOLDEN_SME_SIGNOFF.comment,
      "baselinesOnly=true — automated pass/fail stays separate; do not invent Likert/κ/accuracy % marketing.",
      "Available research capability — not CDS, not HSI Clinical, not HSI Trials.",
      "kgWrite=false · canApproveIntoKg=false on all briefs.",
      "Refuse cases must fail closed; mechanism cases must keep Cap 6/10/11 companions.",
    ],
  };
}
