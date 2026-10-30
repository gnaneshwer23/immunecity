/**
 * Engineering export of docs/ISI_MELANOMA_PILOT_VALIDATION_MATRIX.md
 * for curator checklist UI. Still unreviewed — no Gate C approvals invented.
 * Do NOT treat rows as approved science. SME decisions remain blocking.
 */
export type MelanomaMatrixVerdict =
  | "DEFECT"
  | "Unverified risk"
  | "Incomplete"
  | "Partial";

export type MelanomaMatrixFlag =
  | "TO_BE_CURATED"
  | "S_P_O_MISMATCH"
  | "REJECTED_PMID"
  | "DRAFT_ESTABLISHED"
  | "GATE_C_PROXY"
  | "NO_LOCATOR";

export interface MelanomaPilotMatrixRow {
  n: number;
  relId: string;
  subjectId: string;
  predicate: string;
  objectId: string;
  spoLabel: string;
  polarityContext: string;
  graphStatus: string;
  locatorsNote: string;
  neonNote: string;
  causalLegitimate: string;
  verdict: MelanomaMatrixVerdict;
  flags: MelanomaMatrixFlag[];
  /** Curator checklist prompt — educational, not an approval. */
  curatorAction: string;
  /** Always false in this export — matrix is unreviewed engineering aid. */
  reviewed: false;
}

/**
 * Pilot relationship matrix. Source of truth remains the markdown audit doc;
 * this TS mirror powers reviewer tooling without inventing approvals.
 */
export const ISI_MELANOMA_PILOT_VALIDATION_MATRIX: readonly MelanomaPilotMatrixRow[] = [
  {
    n: 1,
    relId: "REL-R011-drives_immune_exhaustion_in-D012",
    subjectId: "R011",
    predicate: "drives_immune_exhaustion_in",
    objectId: "D012",
    spoLabel: "R011 PD-1 → drives_immune_exhaustion_in → D012 Melanoma",
    polarityContext: "+ / TME",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "Dong 2002 Nat Med; no PMID on edge",
    neonNote: "PMID 12091876 unreviewed partial — S-P-O mismatch vs Dong 2002",
    causalLegitimate: "No — subject/predicate mismatch; drives overclaims",
    verdict: "DEFECT",
    flags: ["S_P_O_MISMATCH", "NO_LOCATOR"],
    curatorAction: "SME rewrite S-P-O or demote claim_support — do not bulk-approve",
    reviewed: false,
  },
  {
    n: 2,
    relId: "REL-I008-treats-D012",
    subjectId: "I008",
    predicate: "treats",
    objectId: "D012",
    spoLabel: "I008 Pembrolizumab → treats → D012",
    polarityContext: "− / clinical",
    graphStatus: "ESTABLISHED / draft",
    locatorsNote: "no PMID",
    neonNote: "0 rows",
    causalLegitimate: "Clinical association external; graph lacks Gate C",
    verdict: "Unverified risk",
    flags: ["DRAFT_ESTABLISHED", "NO_LOCATOR"],
    curatorAction: "Keep unapproved until Gate C locator + claim assessment",
    reviewed: false,
  },
  {
    n: 3,
    relId: "REL-I009-treats-D012",
    subjectId: "I009",
    predicate: "treats",
    objectId: "D012",
    spoLabel: "I009 Nivolumab → treats → D012",
    polarityContext: "− / clinical",
    graphStatus: "ESTABLISHED / draft",
    locatorsNote: "no PMID",
    neonNote: "0 rows",
    causalLegitimate: "Same as #2",
    verdict: "Unverified risk",
    flags: ["DRAFT_ESTABLISHED", "NO_LOCATOR"],
    curatorAction: "Keep unapproved until Gate C locator + claim assessment",
    reviewed: false,
  },
  {
    n: 4,
    relId: "REL-I025-treats-D012",
    subjectId: "I025",
    predicate: "treats",
    objectId: "D012",
    spoLabel: "I025 Ipilimumab → treats → D012",
    polarityContext: "− / clinical",
    graphStatus: "ESTABLISHED / draft",
    locatorsNote: "no PMID",
    neonNote: "0 rows",
    causalLegitimate: "Same as #2",
    verdict: "Unverified risk",
    flags: ["DRAFT_ESTABLISHED", "NO_LOCATOR"],
    curatorAction: "Keep unapproved until Gate C locator + claim assessment",
    reviewed: false,
  },
  {
    n: 5,
    relId: "REL-TR003-has_clinical_context-D012",
    subjectId: "TR003",
    predicate: "has_clinical_context",
    objectId: "D012",
    spoLabel: "TR003 KEYNOTE-006 → has_clinical_context → D012",
    polarityContext: "0 / trial",
    graphStatus: "ESTABLISHED / draft",
    locatorsNote: "fixture PMID 25891173 not on edge",
    neonNote: "0 rows",
    causalLegitimate: "Associative OK if framed as trial context",
    verdict: "Incomplete",
    flags: ["DRAFT_ESTABLISHED"],
    curatorAction: "Human may map KEYNOTE-006 primary PMID — no auto rematch",
    reviewed: false,
  },
  {
    n: 6,
    relId: "REL-TR020-has_clinical_context-D012",
    subjectId: "TR020",
    predicate: "has_clinical_context",
    objectId: "D012",
    spoLabel: "TR020 CheckMate 067 → has_clinical_context → D012",
    polarityContext: "0 / trial",
    graphStatus: "ESTABLISHED / draft",
    locatorsNote: "fixture PMID 26027431 not on edge",
    neonNote: "0 rows",
    causalLegitimate: "Associative OK",
    verdict: "Incomplete",
    flags: ["DRAFT_ESTABLISHED"],
    curatorAction: "Human may map CheckMate primary PMID — no auto rematch",
    reviewed: false,
  },
  {
    n: 7,
    relId: "REL-I008-blocks-R011",
    subjectId: "I008",
    predicate: "blocks",
    objectId: "R011",
    spoLabel: "I008 → blocks → R011 PD-1",
    polarityContext: "− / TME",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "Ribas 2016; KEYnote-006 NEJM 2019 (year wrong for primary)",
    neonNote: "Gate C PMID 25891173 clinical proxy — not molecular proof",
    causalLegitimate: "Mechanism prose stronger than locator",
    verdict: "Partial",
    flags: ["GATE_C_PROXY"],
    curatorAction: "Qualify clinical-proxy vs molecular claim in notes; fix year typo if editing refs",
    reviewed: false,
  },
  {
    n: 8,
    relId: "REL-I009-blocks-R011",
    subjectId: "I009",
    predicate: "blocks",
    objectId: "R011",
    spoLabel: "I009 → blocks → R011",
    polarityContext: "− / none",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "TO_BE_CURATED",
    neonNote: "0 rows",
    causalLegitimate: "Plausible class effect; no durable id",
    verdict: "DEFECT",
    flags: ["TO_BE_CURATED"],
    curatorAction: "Supply durable locator before any approval",
    reviewed: false,
  },
  {
    n: 9,
    relId: "REL-B011-measures-R012",
    subjectId: "B011",
    predicate: "measures",
    objectId: "R012",
    spoLabel: "B011 PD-L1 expression → measures → R012 PD-L1",
    polarityContext: "0",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "TO_BE_CURATED",
    neonNote: "0 rows",
    causalLegitimate: "Definitional; assay cut-offs stubbed",
    verdict: "DEFECT",
    flags: ["TO_BE_CURATED", "NO_LOCATOR"],
    curatorAction: "Do not invent TPS/CPS cut-offs; locator before ESTABLISHED trust",
    reviewed: false,
  },
  {
    n: 10,
    relId: "REL-I008-demonstrates_in-TR003",
    subjectId: "I008",
    predicate: "demonstrates_in",
    objectId: "TR003",
    spoLabel: "I008 → demonstrates_in → TR003",
    polarityContext: "0 / trial",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "Robert 2019 NEJM (follow-up era; primary is 2015)",
    neonNote: "rejected PMID 31166680 (wrong paper — dabrafenib+trametinib)",
    causalLegitimate: "Trial membership non-causal",
    verdict: "DEFECT",
    flags: ["REJECTED_PMID"],
    curatorAction: "Human rematch KEYNOTE-006 primary only — never invent Gate C from fixture",
    reviewed: false,
  },
  {
    n: 11,
    relId: "REL-TR003-evaluates-I008",
    subjectId: "TR003",
    predicate: "evaluates",
    objectId: "I008",
    spoLabel: "TR003 → evaluates → I008",
    polarityContext: "0 / TME",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "TO_BE_CURATED",
    neonNote: "0 rows",
    causalLegitimate: "Inverse of #10; redundant",
    verdict: "DEFECT",
    flags: ["TO_BE_CURATED"],
    curatorAction: "Curate or demote; no auto-approve",
    reviewed: false,
  },
  {
    n: 12,
    relId: "REL-B011-predicts_response_to-I008",
    subjectId: "B011",
    predicate: "predicts_response_to",
    objectId: "I008",
    spoLabel: "B011 → predicts_response_to → I008",
    polarityContext: "0",
    graphStatus: "ESTABLISHED / medium conf",
    locatorsNote: "TO_BE_CURATED",
    neonNote: "0 rows",
    causalLegitimate: "Predictive ≠ causal; enrichment ≠ decision rule",
    verdict: "DEFECT",
    flags: ["TO_BE_CURATED"],
    curatorAction: "Qualifier required; refuse invented assay cut-offs",
    reviewed: false,
  },
  {
    n: 13,
    relId: "REL-I009-evaluates_in-TR020",
    subjectId: "I009",
    predicate: "evaluates_in",
    objectId: "TR020",
    spoLabel: "I009 → evaluates_in → TR020",
    polarityContext: "0",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "TO_BE_CURATED",
    neonNote: "0 rows",
    causalLegitimate: "Non-causal trial link",
    verdict: "DEFECT",
    flags: ["TO_BE_CURATED"],
    curatorAction: "Locator before trust; stay unreviewed",
    reviewed: false,
  },
  {
    n: 14,
    relId: "REL-TR020-evaluates-I009",
    subjectId: "TR020",
    predicate: "evaluates",
    objectId: "I009",
    spoLabel: "TR020 → evaluates → I009",
    polarityContext: "0",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "TO_BE_CURATED",
    neonNote: "0 rows",
    causalLegitimate: "Non-causal",
    verdict: "DEFECT",
    flags: ["TO_BE_CURATED"],
    curatorAction: "Locator before trust; stay unreviewed",
    reviewed: false,
  },
  {
    n: 15,
    relId: "REL-TR020-evaluates-I025",
    subjectId: "TR020",
    predicate: "evaluates",
    objectId: "I025",
    spoLabel: "TR020 → evaluates → I025",
    polarityContext: "0",
    graphStatus: "ESTABLISHED / core",
    locatorsNote: "TO_BE_CURATED",
    neonNote: "0 rows",
    causalLegitimate: "Non-causal (combo arm)",
    verdict: "DEFECT",
    flags: ["TO_BE_CURATED"],
    curatorAction: "Locator before trust; stay unreviewed",
    reviewed: false,
  },
] as const;

export function melanomaMatrixByFlag(flag: MelanomaMatrixFlag): MelanomaPilotMatrixRow[] {
  return ISI_MELANOMA_PILOT_VALIDATION_MATRIX.filter((r) => r.flags.includes(flag));
}

export function melanomaMatrixPd1TrialFlagged(): MelanomaPilotMatrixRow[] {
  return ISI_MELANOMA_PILOT_VALIDATION_MATRIX.filter(
    (r) =>
      r.flags.includes("TO_BE_CURATED") ||
      r.flags.includes("REJECTED_PMID") ||
      r.flags.includes("S_P_O_MISMATCH") ||
      r.flags.includes("GATE_C_PROXY") ||
      r.subjectId.startsWith("I00") ||
      r.objectId.startsWith("TR") ||
      r.subjectId.startsWith("TR"),
  );
}

/** Honest counts for checklist chrome — all rows remain reviewed:false. */
export function melanomaMatrixSummary() {
  const byVerdict: Record<string, number> = {};
  const byFlag: Record<string, number> = {};
  for (const r of ISI_MELANOMA_PILOT_VALIDATION_MATRIX) {
    byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
    for (const f of r.flags) byFlag[f] = (byFlag[f] ?? 0) + 1;
  }
  return {
    total: ISI_MELANOMA_PILOT_VALIDATION_MATRIX.length,
    reviewedCount: 0,
    unreviewed: true as const,
    byVerdict,
    byFlag,
    note: "Engineering checklist only — no Gate C approvals; KEYNOTE rematch is SME-blocked.",
  };
}
