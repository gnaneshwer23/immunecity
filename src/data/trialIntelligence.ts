/**
 * Melanoma pilot Trial Intelligence (Master PRD P0-F03 / ISI-007 / ISI-008).
 * Browser-safe typed records linked to graph trial nodes TR003 and TR020.
 *
 * Rules: every numeric endpoint cites a primary publication PMID/DOI checked via
 * PubMed/ClinicalTrials.gov. Unverified numbers stay null — never invented.
 * NCT02263508 is MASTERKEY-265 (not KEYNOTE-006); KEYNOTE-006 is NCT01866319.
 */

export type VerificationState = "verified" | "partial" | "unverified";
export type ComparatorRole = "experimental" | "active_comparator" | "placebo" | "control" | "other";
export type EndpointType =
  | "orr"
  | "pfs"
  | "os"
  | "pfs_rate"
  | "os_rate"
  | "cr"
  | "dor"
  | "safety_grade_3_4"
  | "safety_grade_3_5"
  | "other";

export interface TrialSource {
  pmid: string;
  doi: string;
  citation: string;
  verifiedOn: string;
}

export interface EndpointResultRecord {
  resultId: string;
  endpointType: EndpointType;
  label: string;
  /** Numeric value when source-verified; otherwise null. */
  valueNum: number | null;
  valueText: string | null;
  unit: string | null;
  ciLower: number | null;
  ciUpper: number | null;
  pValue: string | null;
  timepoint: string | null;
  analysisSet: string;
  followUp: string | null;
  populationNote: string | null;
  verificationState: VerificationState;
  sourcePmid: string | null;
  sourceDoi: string | null;
  sourceLocator: string | null;
  notes: string | null;
}

export interface TrialArmRecord {
  armId: string;
  label: string;
  regimen: string;
  doseSchedule: string | null;
  comparatorRole: ComparatorRole;
  enrolledN: number | null;
  treatedN: number | null;
  sortOrder: number;
  endpoints: EndpointResultRecord[];
}

export interface ClinicalTrialRecord {
  trialId: string;
  graphNodeId: string;
  nctId: string;
  acronym: string;
  title: string;
  phase: string;
  design: string;
  sponsor: string | null;
  status: string;
  conditionLabel: string;
  populationSummary: string;
  analysisSetNote: string;
  verificationState: VerificationState;
  primaryPmid: string;
  primaryDoi: string;
  notes: string | null;
  sources: TrialSource[];
  arms: TrialArmRecord[];
}

/** Cross-trial comparison is contextual — never causal comparative efficacy (audit T03). */
export const NON_CAUSAL_TRIAL_WARNING =
  "Association is not causation. Arm-level results are reported within each randomised trial only. Do not treat side-by-side figures as head-to-head comparative efficacy — populations, dosing, follow-up, and concurrent care differ across trials. This view is educational and is not clinical decision support.";

export const TRIAL_INTELLIGENCE_PROVENANCE = {
  verifiedOn: "2026-10-30",
  method:
    "ClinicalTrials.gov API v2 identity check + PubMed efetch abstracts for primary publications. Numerics taken only from abstract-stated results; omitted when absent.",
  nctNote:
    "KEYNOTE-006 registry ID is NCT01866319. NCT02263508 is MASTERKEY-265 (T-VEC ± pembrolizumab), not KEYNOTE-006.",
  /**
   * Independent spot-check (audit A02, 2026-10-30) against PubMed abstracts:
   * KEYNOTE-006 PMID 25891173 — ORR 33.7/32.9/11.9%; 6-mo PFS 47.3/46.4/26.5%; grade 3–5 TRAE 13.3/10.1/19.9%; NCT01866319.
   * KEYNOTE-006 PMID 28822576 — 24-mo OS 55/55/43%; n randomised 279/277/278.
   * CheckMate 067 PMID 26027431 — median PFS 11.5 (8.9–16.7) / 6.9 (4.3–9.5) / 2.9 (2.8–3.4) mo; grade 3–4 TRAE 55.0/16.3/27.3%; ORR absent → left null.
   * CheckMate 067 PMID 31562797 — 5-yr OS 52/44/26%. PMID 28889792 grade 3–4 rates differ (59/21/28%); primary abstract values retained.
   */
  spotCheckNote:
    "Spot-checked 2026-10-30 via PubMed efetch; unverified ORR on CheckMate 067 left null. See docs/ISI_AUDIT_BASELINE_2026-10-30.md.",
} as const;

const KEYNOTE_SOURCES: TrialSource[] = [
  {
    pmid: "25891173",
    doi: "10.1056/NEJMoa1503093",
    citation: "Robert C et al. N Engl J Med. 2015;372:2521-2532.",
    verifiedOn: "2026-10-30",
  },
  {
    pmid: "28822576",
    doi: "10.1016/S0140-6736(17)31601-X",
    citation: "Robert C et al. Lancet. 2017;390:1853-1862.",
    verifiedOn: "2026-10-30",
  },
  {
    pmid: "31345627",
    doi: "10.1016/S1470-2045(19)30388-2",
    citation: "Robert C et al. Lancet Oncol. 2019;20:1239-1251.",
    verifiedOn: "2026-10-30",
  },
];

const CHECKMATE_SOURCES: TrialSource[] = [
  {
    pmid: "26027431",
    doi: "10.1056/NEJMoa1504030",
    citation: "Larkin J et al. N Engl J Med. 2015;373:23-34.",
    verifiedOn: "2026-10-30",
  },
  {
    pmid: "28889792",
    doi: "10.1056/NEJMoa1709684",
    citation: "Wolchok JD et al. N Engl J Med. 2017;377:1345-1356.",
    verifiedOn: "2026-10-30",
  },
  {
    pmid: "31562797",
    doi: "10.1056/NEJMoa1910836",
    citation: "Larkin J et al. N Engl J Med. 2019;381:1535-1546.",
    verifiedOn: "2026-10-30",
  },
];

function ep(
  partial: Omit<EndpointResultRecord, "ciLower" | "ciUpper" | "pValue" | "populationNote" | "notes" | "valueText"> &
    Partial<Pick<EndpointResultRecord, "ciLower" | "ciUpper" | "pValue" | "populationNote" | "notes" | "valueText">>,
): EndpointResultRecord {
  return {
    ciLower: null,
    ciUpper: null,
    pValue: null,
    populationNote: null,
    notes: null,
    valueText: null,
    ...partial,
  };
}

/** Pilot trials only — KEYNOTE-006 (TR003) and CheckMate 067 (TR020). */
export const MELANOMA_PILOT_TRIALS: ClinicalTrialRecord[] = [
  {
    trialId: "CT-KEYNOTE-006",
    graphNodeId: "TR003",
    nctId: "NCT01866319",
    acronym: "KEYNOTE-006",
    title:
      "Pembrolizumab versus ipilimumab in participants with advanced melanoma (KEYNOTE-006 / MK-3475-006)",
    phase: "Phase 3",
    design: "Multicentre randomised open-label three-arm controlled trial (1:1:1)",
    sponsor: "Merck Sharp & Dohme",
    status: "Completed (follow-up publications ongoing historically)",
    conditionLabel: "Unresectable stage III or IV melanoma",
    populationSummary:
      "834 adults randomised; ECOG 0–1; up to one prior systemic therapy; ipilimumab-naive; ocular melanoma excluded (per primary reports).",
    analysisSetNote:
      "Efficacy: all randomly assigned (ITT). Safety: patients who received ≥1 dose. Combined pembrolizumab arms are exploratory in the 5-year report.",
    verificationState: "verified",
    primaryPmid: "25891173",
    primaryDoi: "10.1056/NEJMoa1503093",
    notes:
      "5-year overall-survival percentage rates are not restated from secondary digests; median OS/PFS from the 5-year abstract are stored instead.",
    sources: KEYNOTE_SOURCES,
    arms: [
      {
        armId: "CT-KEYNOTE-006-ARM-P2W",
        label: "Pembrolizumab q2w",
        regimen: "Pembrolizumab",
        doseSchedule: "10 mg/kg intravenously every 2 weeks",
        comparatorRole: "experimental",
        enrolledN: 279,
        treatedN: null,
        sortOrder: 1,
        endpoints: [
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P2W-ORR",
            endpointType: "orr",
            label: "Objective response rate",
            valueNum: 33.7,
            unit: "%",
            timepoint: "Primary report (median follow-up 7.9 months for response durability context)",
            analysisSet: "ITT (all randomised)",
            followUp: "Median 7.9 months (response durability note in primary abstract)",
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — response rate",
            pValue: "P<0.001 vs ipilimumab",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P2W-PFS6",
            endpointType: "pfs_rate",
            label: "6-month progression-free survival rate",
            valueNum: 47.3,
            unit: "%",
            timepoint: "6 months",
            analysisSet: "ITT (all randomised)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — estimated 6-month PFS",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P2W-OS24",
            endpointType: "os_rate",
            label: "24-month overall survival rate",
            valueNum: 55,
            unit: "%",
            timepoint: "24 months",
            analysisSet: "ITT (all randomised)",
            followUp: "Median follow-up 22.9 months (final protocol-specified OS analysis)",
            verificationState: "verified",
            sourcePmid: "28822576",
            sourceDoi: "10.1016/S0140-6736(17)31601-X",
            sourceLocator: "Findings — 24-month OS rate",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P2W-AE",
            endpointType: "safety_grade_3_5",
            label: "Treatment-related adverse events grade 3–5",
            valueNum: 13.3,
            unit: "%",
            timepoint: "Primary safety report",
            analysisSet: "Treated patients (primary safety population)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — grade 3 to 5 treatment-related AEs",
          }),
        ],
      },
      {
        armId: "CT-KEYNOTE-006-ARM-P3W",
        label: "Pembrolizumab q3w",
        regimen: "Pembrolizumab",
        doseSchedule: "10 mg/kg intravenously every 3 weeks",
        comparatorRole: "experimental",
        enrolledN: 277,
        treatedN: null,
        sortOrder: 2,
        endpoints: [
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P3W-ORR",
            endpointType: "orr",
            label: "Objective response rate",
            valueNum: 32.9,
            unit: "%",
            timepoint: "Primary report",
            analysisSet: "ITT (all randomised)",
            followUp: "Median 7.9 months (response durability note in primary abstract)",
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — response rate",
            pValue: "P<0.001 vs ipilimumab",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P3W-PFS6",
            endpointType: "pfs_rate",
            label: "6-month progression-free survival rate",
            valueNum: 46.4,
            unit: "%",
            timepoint: "6 months",
            analysisSet: "ITT (all randomised)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — estimated 6-month PFS",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P3W-OS24",
            endpointType: "os_rate",
            label: "24-month overall survival rate",
            valueNum: 55,
            unit: "%",
            timepoint: "24 months",
            analysisSet: "ITT (all randomised)",
            followUp: "Median follow-up 22.9 months",
            verificationState: "verified",
            sourcePmid: "28822576",
            sourceDoi: "10.1016/S0140-6736(17)31601-X",
            sourceLocator: "Findings — 24-month OS rate",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-P3W-AE",
            endpointType: "safety_grade_3_5",
            label: "Treatment-related adverse events grade 3–5",
            valueNum: 10.1,
            unit: "%",
            timepoint: "Primary safety report",
            analysisSet: "Treated patients (primary safety population)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — grade 3 to 5 treatment-related AEs",
          }),
        ],
      },
      {
        armId: "CT-KEYNOTE-006-ARM-IPI",
        label: "Ipilimumab",
        regimen: "Ipilimumab",
        doseSchedule: "3 mg/kg intravenously every 3 weeks for four doses",
        comparatorRole: "active_comparator",
        enrolledN: 278,
        treatedN: null,
        sortOrder: 3,
        endpoints: [
          ep({
            resultId: "CT-KEYNOTE-006-ARM-IPI-ORR",
            endpointType: "orr",
            label: "Objective response rate",
            valueNum: 11.9,
            unit: "%",
            timepoint: "Primary report",
            analysisSet: "ITT (all randomised)",
            followUp: "Median 7.9 months (response durability note in primary abstract)",
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — response rate",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-IPI-PFS6",
            endpointType: "pfs_rate",
            label: "6-month progression-free survival rate",
            valueNum: 26.5,
            unit: "%",
            timepoint: "6 months",
            analysisSet: "ITT (all randomised)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — estimated 6-month PFS",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-IPI-OS24",
            endpointType: "os_rate",
            label: "24-month overall survival rate",
            valueNum: 43,
            unit: "%",
            timepoint: "24 months",
            analysisSet: "ITT (all randomised)",
            followUp: "Median follow-up 22.9 months; median OS 16.0 months",
            verificationState: "verified",
            sourcePmid: "28822576",
            sourceDoi: "10.1016/S0140-6736(17)31601-X",
            sourceLocator: "Findings — 24-month OS rate / median OS",
          }),
          ep({
            resultId: "CT-KEYNOTE-006-ARM-IPI-AE",
            endpointType: "safety_grade_3_5",
            label: "Treatment-related adverse events grade 3–5",
            valueNum: 19.9,
            unit: "%",
            timepoint: "Primary safety report",
            analysisSet: "Treated patients (primary safety population)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "25891173",
            sourceDoi: "10.1056/NEJMoa1503093",
            sourceLocator: "Results — grade 3 to 5 treatment-related AEs",
          }),
        ],
      },
    ],
  },
  {
    trialId: "CT-CHECKMATE-067",
    graphNodeId: "TR020",
    nctId: "NCT01844505",
    acronym: "CheckMate 067",
    title:
      "Nivolumab alone or nivolumab plus ipilimumab versus ipilimumab alone in previously untreated advanced melanoma (CheckMate 067)",
    phase: "Phase 3",
    design: "Multicentre randomised double-blind three-arm controlled trial (1:1:1)",
    sponsor: "Bristol-Myers Squibb",
    status: "Completed (long-term follow-up publications)",
    conditionLabel: "Previously untreated unresectable stage III or IV melanoma",
    populationSummary:
      "945 previously untreated patients with unresectable stage III or IV melanoma randomised 1:1:1 across three arms.",
    analysisSetNote:
      "Coprimary endpoints PFS and OS for nivolumab±ipilimumab versus ipilimumab. Safety among treated patients as reported in each publication.",
    verificationState: "verified",
    primaryPmid: "26027431",
    primaryDoi: "10.1056/NEJMoa1504030",
    notes:
      "Objective response rates are not stated in the primary PubMed abstract used for verification; ORR fields remain null/unverified rather than copied from secondary digests.",
    sources: CHECKMATE_SOURCES,
    arms: [
      {
        armId: "CT-CHECKMATE-067-ARM-COMBO",
        label: "Nivolumab + ipilimumab",
        regimen: "Nivolumab plus ipilimumab, then nivolumab",
        doseSchedule:
          "Nivolumab 1 mg/kg + ipilimumab 3 mg/kg every 3 weeks ×4, then nivolumab 3 mg/kg every 2 weeks",
        comparatorRole: "experimental",
        enrolledN: null,
        treatedN: null,
        sortOrder: 1,
        endpoints: [
          ep({
            resultId: "CT-CHECKMATE-067-ARM-COMBO-ORR",
            endpointType: "orr",
            label: "Objective response rate",
            valueNum: null,
            unit: "%",
            timepoint: null,
            analysisSet: "Not restated from abstract-verified sources in this release",
            followUp: null,
            verificationState: "unverified",
            sourcePmid: null,
            sourceDoi: null,
            sourceLocator: null,
            notes: "Left null — ORR not present in the PubMed abstracts used for verification.",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-COMBO-PFS",
            endpointType: "pfs",
            label: "Median progression-free survival",
            valueNum: 11.5,
            unit: "months",
            ciLower: 8.9,
            ciUpper: 16.7,
            timepoint: "Primary PFS report",
            analysisSet: "All randomised (as reported)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "26027431",
            sourceDoi: "10.1056/NEJMoa1504030",
            sourceLocator: "Results — median PFS",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-COMBO-OS5",
            endpointType: "os_rate",
            label: "5-year overall survival rate",
            valueNum: 52,
            unit: "%",
            timepoint: "5 years (minimum follow-up 60 months)",
            analysisSet: "All randomised (as reported)",
            followUp: "Minimum follow-up 60 months; median OS not reached (>60.0 months)",
            verificationState: "verified",
            sourcePmid: "31562797",
            sourceDoi: "10.1056/NEJMoa1910836",
            sourceLocator: "Results — overall survival at 5 years",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-COMBO-AE",
            endpointType: "safety_grade_3_4",
            label: "Treatment-related adverse events grade 3 or 4",
            valueNum: 55.0,
            unit: "%",
            timepoint: "Primary safety report",
            analysisSet: "Treated patients (primary report)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "26027431",
            sourceDoi: "10.1056/NEJMoa1504030",
            sourceLocator: "Results — grade 3 or 4 treatment-related AEs",
            notes: "Later follow-up abstracts report slightly different grade 3–4 rates; primary abstract value retained.",
          }),
        ],
      },
      {
        armId: "CT-CHECKMATE-067-ARM-NIVO",
        label: "Nivolumab",
        regimen: "Nivolumab",
        doseSchedule: "Nivolumab 3 mg/kg every 2 weeks (+ ipilimumab-matched placebo in blinded design)",
        comparatorRole: "experimental",
        enrolledN: null,
        treatedN: null,
        sortOrder: 2,
        endpoints: [
          ep({
            resultId: "CT-CHECKMATE-067-ARM-NIVO-ORR",
            endpointType: "orr",
            label: "Objective response rate",
            valueNum: null,
            unit: "%",
            timepoint: null,
            analysisSet: "Not restated from abstract-verified sources in this release",
            followUp: null,
            verificationState: "unverified",
            sourcePmid: null,
            sourceDoi: null,
            sourceLocator: null,
            notes: "Left null — ORR not present in the PubMed abstracts used for verification.",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-NIVO-PFS",
            endpointType: "pfs",
            label: "Median progression-free survival",
            valueNum: 6.9,
            unit: "months",
            ciLower: 4.3,
            ciUpper: 9.5,
            timepoint: "Primary PFS report",
            analysisSet: "All randomised (as reported)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "26027431",
            sourceDoi: "10.1056/NEJMoa1504030",
            sourceLocator: "Results — median PFS",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-NIVO-OS5",
            endpointType: "os_rate",
            label: "5-year overall survival rate",
            valueNum: 44,
            unit: "%",
            timepoint: "5 years (minimum follow-up 60 months)",
            analysisSet: "All randomised (as reported)",
            followUp: "Minimum follow-up 60 months; median OS 36.9 months",
            verificationState: "verified",
            sourcePmid: "31562797",
            sourceDoi: "10.1056/NEJMoa1910836",
            sourceLocator: "Results — overall survival at 5 years",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-NIVO-AE",
            endpointType: "safety_grade_3_4",
            label: "Treatment-related adverse events grade 3 or 4",
            valueNum: 16.3,
            unit: "%",
            timepoint: "Primary safety report",
            analysisSet: "Treated patients (primary report)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "26027431",
            sourceDoi: "10.1056/NEJMoa1504030",
            sourceLocator: "Results — grade 3 or 4 treatment-related AEs",
          }),
        ],
      },
      {
        armId: "CT-CHECKMATE-067-ARM-IPI",
        label: "Ipilimumab",
        regimen: "Ipilimumab",
        doseSchedule: "Ipilimumab 3 mg/kg every 3 weeks for four doses (+ nivolumab-matched placebo)",
        comparatorRole: "active_comparator",
        enrolledN: null,
        treatedN: null,
        sortOrder: 3,
        endpoints: [
          ep({
            resultId: "CT-CHECKMATE-067-ARM-IPI-ORR",
            endpointType: "orr",
            label: "Objective response rate",
            valueNum: null,
            unit: "%",
            timepoint: null,
            analysisSet: "Not restated from abstract-verified sources in this release",
            followUp: null,
            verificationState: "unverified",
            sourcePmid: null,
            sourceDoi: null,
            sourceLocator: null,
            notes: "Left null — ORR not present in the PubMed abstracts used for verification.",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-IPI-PFS",
            endpointType: "pfs",
            label: "Median progression-free survival",
            valueNum: 2.9,
            unit: "months",
            ciLower: 2.8,
            ciUpper: 3.4,
            timepoint: "Primary PFS report",
            analysisSet: "All randomised (as reported)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "26027431",
            sourceDoi: "10.1056/NEJMoa1504030",
            sourceLocator: "Results — median PFS",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-IPI-OS5",
            endpointType: "os_rate",
            label: "5-year overall survival rate",
            valueNum: 26,
            unit: "%",
            timepoint: "5 years (minimum follow-up 60 months)",
            analysisSet: "All randomised (as reported)",
            followUp: "Minimum follow-up 60 months; median OS 19.9 months",
            verificationState: "verified",
            sourcePmid: "31562797",
            sourceDoi: "10.1056/NEJMoa1910836",
            sourceLocator: "Results — overall survival at 5 years",
          }),
          ep({
            resultId: "CT-CHECKMATE-067-ARM-IPI-AE",
            endpointType: "safety_grade_3_4",
            label: "Treatment-related adverse events grade 3 or 4",
            valueNum: 27.3,
            unit: "%",
            timepoint: "Primary safety report",
            analysisSet: "Treated patients (primary report)",
            followUp: null,
            verificationState: "verified",
            sourcePmid: "26027431",
            sourceDoi: "10.1056/NEJMoa1504030",
            sourceLocator: "Results — grade 3 or 4 treatment-related AEs",
          }),
        ],
      },
    ],
  },
];

const byGraphNode = new Map(MELANOMA_PILOT_TRIALS.map((t) => [t.graphNodeId, t]));
const byTrialId = new Map(MELANOMA_PILOT_TRIALS.map((t) => [t.trialId, t]));
const byNct = new Map(MELANOMA_PILOT_TRIALS.map((t) => [t.nctId, t]));

export function trialIntelligenceByGraphNode(graphNodeId: string): ClinicalTrialRecord | undefined {
  return byGraphNode.get(graphNodeId);
}

export function trialIntelligenceByTrialId(trialId: string): ClinicalTrialRecord | undefined {
  return byTrialId.get(trialId);
}

export function trialIntelligenceByNct(nctId: string): ClinicalTrialRecord | undefined {
  return byNct.get(nctId);
}

export function listMelanomaPilotTrials(): ClinicalTrialRecord[] {
  return MELANOMA_PILOT_TRIALS;
}

export function formatEndpointValue(ep: EndpointResultRecord): string {
  if (ep.verificationState === "unverified" && ep.valueNum == null && !ep.valueText) {
    return "Not verified in curated sources";
  }
  if (ep.valueText) return ep.valueText;
  if (ep.valueNum == null) return "—";
  const unit = ep.unit ? ` ${ep.unit}` : "";
  let s = `${ep.valueNum}${unit}`;
  if (ep.ciLower != null && ep.ciUpper != null) {
    s += ` (95% CI ${ep.ciLower}–${ep.ciUpper})`;
  }
  return s;
}

export function pubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

export function doiUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}
