/**
 * HSI CDS / PHI boundary — governance stubs lifted from Aksh Health.
 *
 * Source product: gnaneshwer23/aksh-health-redesign (legacy remote: 0ne-Health).
 * HSI never runs live CDS engines, never stores PHI, never writes back to EHR.
 * This module encodes reject / sandbox / honesty asserts only.
 *
 * See docs/CDS_PHI_BOUNDARY.md
 */

export const CDS_PHI_BOUNDARY_SCHEMA = "hsi-cds-phi-boundary-1" as const;

/** Provenance tip used when this boundary was lifted into hsi-core. */
export const CDS_PHI_BOUNDARY_PROVENANCE = {
  repo: "https://github.com/gnaneshwer23/aksh-health-redesign",
  legacyRepo: "https://github.com/gnaneshwer23/0ne-Health",
  commit: "e552f7c1a155ac2196ad8acbd8f6ea2d5afbe76d",
  defaultBranch: "main",
  /** Ops probe var name in Aksh evidence-pack scripts — not a separate GitHub product. */
  healthLiveNote:
    "healthLive in packages/platform-uk/scripts/generate-evidence-pack.mjs is a live /api/health probe for pack generation — not an HSI PHI/CDS surface.",
  liftedPaths: [
    "packages/platform-uk/docs/RESEARCH_EVALUATION_BOUNDARY.md",
    "packages/platform-uk/lib/research-evaluation-plan.ts",
    "packages/platform-uk/lib/system-contracts.ts",
    "packages/platform-uk/lib/precision-health/whole-loop.ts",
    "packages/platform-uk/lib/permission-matrix.ts",
    "packages/platform-uk/.env.example (EMIS / liveEmis gates)",
    "packages/akeno/.env.example (PHI residency comment — product only)",
  ],
} as const;

/** Hard invariants for every HSI artifact that touches clinic adjacency. */
export type HsiCdsPhiInvariants = {
  notCds: true;
  autoSurfaceCds: false;
  autoApproveIntoKg: false;
  containsPhi: false;
  mayUseLivePhi: false;
  clinicalActive: false;
  liveEmis: false;
  ehrWriteBack: false;
  mhraApprovedCds: false;
  phiToLlm: false;
};

export const HSI_CDS_PHI_INVARIANTS: HsiCdsPhiInvariants = {
  notCds: true,
  autoSurfaceCds: false,
  autoApproveIntoKg: false,
  containsPhi: false,
  mayUseLivePhi: false,
  clinicalActive: false,
  liveEmis: false,
  ehrWriteBack: false,
  mhraApprovedCds: false,
  phiToLlm: false,
};

/** Explicit out-of-scope product surfaces (stay in Aksh / Akeno — never wire into HSI). */
export const CDS_PHI_OUT_OF_SCOPE_FOR_HSI = [
  "Live CDS engines / MHRA-cleared clinical decision support",
  "Real patient PHI stores, MRN/NHS-number planes, identifiable sequences",
  "PHI → LLM prompts in production",
  "EMIS / EHR live write-back (liveEmis)",
  "Aksh synthetic clinic review cases as HSI evidence grades",
  "Akeno multi-AMC PHI vault / federated PHI training",
  "India ABHA / HIP-HIU / CDSCO Class B product claims",
  "Autonomous dosing, diagnosis, or chart auto-apply",
] as const;

/** Patterns lifted as reject rules for HSI ingest / consume honesty. */
export type CdsPhiRejectReason =
  | "containsPhi_true"
  | "mayUseLivePhi_true"
  | "notCds_false"
  | "autoSurfaceCds_true"
  | "clinicalActive_true"
  | "liveEmis_true"
  | "ehrWriteBack_true"
  | "mhraApprovedCds_true"
  | "phiToLlm_true"
  | "phi_marker_text"
  | "live_cds_claim_text";

export type CdsPhiRejectResult =
  | { ok: true }
  | { ok: false; reasons: CdsPhiRejectReason[]; detail: string };

/** Lightweight PHI / live-CDS text markers (heuristic — not a de-id engine). */
const PHI_TEXT_MARKERS: { id: Extract<CdsPhiRejectReason, "phi_marker_text">; re: RegExp }[] =
  [
    { id: "phi_marker_text", re: /\bprotected health information\b/i },
    { id: "phi_marker_text", re: /\bMRN\b|\bmedical record number\b/i },
    { id: "phi_marker_text", re: /\bNHS\s*number\b/i },
    { id: "phi_marker_text", re: /\bSSN\b|\bsocial security\b/i },
    {
      id: "phi_marker_text",
      re: /\bpatient\s+(?:name|dob|date of birth|address|phone|email)\b/i,
    },
  ];

const LIVE_CDS_TEXT_MARKERS: {
  id: Extract<CdsPhiRejectReason, "live_cds_claim_text">;
  re: RegExp;
}[] = [
  { id: "live_cds_claim_text", re: /\blive\s+CDS\b/i },
  { id: "live_cds_claim_text", re: /\bMHRA[- ]approved\s+CDS\b/i },
  {
    id: "live_cds_claim_text",
    re: /\bauto[- ]?(?:apply|write)\s+to\s+(?:EHR|chart|EMIS)\b/i,
  },
  {
    id: "live_cds_claim_text",
    re: /\bproduction\s+clinical\s+(?:AI|decision)\s+claim\b/i,
  },
];

export type CdsPhiPayloadFlags = {
  notCds?: boolean;
  autoSurfaceCds?: boolean;
  autoApproveIntoKg?: boolean;
  containsPhi?: boolean;
  mayUseLivePhi?: boolean;
  clinicalActive?: boolean;
  liveEmis?: boolean;
  ehrWriteBack?: boolean;
  mhraApprovedCds?: boolean;
  phiToLlm?: boolean;
  /** Free-text fields scanned for PHI / live-CDS claim markers. */
  textBlobs?: string[];
};

function fail(
  reasons: CdsPhiRejectReason[],
  detail: string,
): CdsPhiRejectResult {
  return { ok: false, reasons: [...new Set(reasons)], detail };
}

/** Reject any payload that claims or embeds PHI. */
export function rejectPhiPayload(
  payload: CdsPhiPayloadFlags,
): CdsPhiRejectResult {
  const reasons: CdsPhiRejectReason[] = [];
  if (payload.containsPhi === true) reasons.push("containsPhi_true");
  if (payload.mayUseLivePhi === true) reasons.push("mayUseLivePhi_true");
  if (payload.phiToLlm === true) reasons.push("phiToLlm_true");

  for (const blob of payload.textBlobs ?? []) {
    if (!blob) continue;
    for (const m of PHI_TEXT_MARKERS) {
      if (m.re.test(blob)) reasons.push(m.id);
    }
  }

  if (reasons.length > 0) {
    return fail(reasons, `PHI rejected: ${[...new Set(reasons)].join(", ")}`);
  }
  return { ok: true };
}

/** Reject any payload that claims live / production CDS. */
export function rejectLiveCdsClaim(
  payload: CdsPhiPayloadFlags,
): CdsPhiRejectResult {
  const reasons: CdsPhiRejectReason[] = [];
  if (payload.notCds === false) reasons.push("notCds_false");
  if (payload.autoSurfaceCds === true) reasons.push("autoSurfaceCds_true");
  if (payload.clinicalActive === true) reasons.push("clinicalActive_true");
  if (payload.liveEmis === true) reasons.push("liveEmis_true");
  if (payload.ehrWriteBack === true) reasons.push("ehrWriteBack_true");
  if (payload.mhraApprovedCds === true) reasons.push("mhraApprovedCds_true");

  for (const blob of payload.textBlobs ?? []) {
    if (!blob) continue;
    for (const m of LIVE_CDS_TEXT_MARKERS) {
      if (m.re.test(blob)) reasons.push(m.id);
    }
  }

  if (reasons.length > 0) {
    return fail(
      reasons,
      `Live CDS claim rejected: ${[...new Set(reasons)].join(", ")}`,
    );
  }
  return { ok: true };
}

/**
 * Combined honesty gate — throw on violation (consume / Gate C / agent paths).
 * Soft equivalent of Aksh syntheticOnly + research-evaluation boundary.
 */
export function assertHsiCdsPhiBoundary(
  payload: CdsPhiPayloadFlags,
  label = "hsi-cds-phi",
): void {
  const phi = rejectPhiPayload(payload);
  if (!phi.ok) {
    throw new Error(`${label}: ${phi.detail}`);
  }
  const cds = rejectLiveCdsClaim(payload);
  if (!cds.ok) {
    throw new Error(`${label}: ${cds.detail}`);
  }
  if (payload.autoApproveIntoKg === true) {
    throw new Error(`${label}: autoApproveIntoKg=true is forbidden`);
  }
}

/** Agent / curator checklist — encode refuse-PHI / notCds posture. */
export const CDS_PHI_AGENT_CHECKLIST = [
  {
    id: "cds-phi-1",
    assertion: "HSI artifacts must set notCds=true; never claim live CDS.",
    rejectIf: "notCds_false | autoSurfaceCds_true | live_cds_claim_text",
  },
  {
    id: "cds-phi-2",
    assertion: "HSI must never store or forward PHI; containsPhi must stay false.",
    rejectIf: "containsPhi_true | mayUseLivePhi_true | phi_marker_text",
  },
  {
    id: "cds-phi-3",
    assertion: "No PHI→LLM in HSI substrate paths.",
    rejectIf: "phiToLlm_true",
  },
  {
    id: "cds-phi-4",
    assertion: "No EMR/EMIS write-back from hsi-core (liveEmis=false).",
    rejectIf: "liveEmis_true | ehrWriteBack_true",
  },
  {
    id: "cds-phi-5",
    assertion: "Gate C stays human-only; autoApproveIntoKg=false.",
    rejectIf: "autoApproveIntoKg=true",
  },
  {
    id: "cds-phi-6",
    assertion:
      "Aksh clinic product CDS/PHI stay out-of-repo; HSI lifts boundary contracts only.",
    rejectIf: "wiring live Aksh patient spine / Medplum PHI into red-wave",
  },
  {
    id: "cds-phi-7",
    assertion: "Akeno /clinicalActive remains false inside HSI HITL stubs.",
    rejectIf: "clinicalActive_true | mhraApprovedCds_true",
  },
] as const;

export type CdsPhiBoundaryBundle = {
  schemaVersion: typeof CDS_PHI_BOUNDARY_SCHEMA;
  generatedAt: string;
  notCds: true;
  autoSurfaceCds: false;
  containsPhi: false;
  mayUseLivePhi: false;
  clinicalActive: false;
  invariants: HsiCdsPhiInvariants;
  outOfScopeForHsi: readonly string[];
  agentChecklist: typeof CDS_PHI_AGENT_CHECKLIST;
  provenance: typeof CDS_PHI_BOUNDARY_PROVENANCE;
  akshPatternsLifted: string[];
  honesty: string[];
};

export function buildCdsPhiBoundaryBundle(
  now = new Date(),
): CdsPhiBoundaryBundle {
  return {
    schemaVersion: CDS_PHI_BOUNDARY_SCHEMA,
    generatedAt: now.toISOString(),
    notCds: true,
    autoSurfaceCds: false,
    containsPhi: false,
    mayUseLivePhi: false,
    clinicalActive: false,
    invariants: { ...HSI_CDS_PHI_INVARIANTS },
    outOfScopeForHsi: CDS_PHI_OUT_OF_SCOPE_FOR_HSI,
    agentChecklist: CDS_PHI_AGENT_CHECKLIST,
    provenance: CDS_PHI_BOUNDARY_PROVENANCE,
    akshPatternsLifted: [
      "Research evaluation boundary: synthetic → offline eval → evidence → governance (never live reviewer CDS).",
      "system-contracts syntheticOnly / realPatientData=false / liveNhsIntegration=false.",
      "whole-loop honesty: physiologicalTwin:false · liveEmis:false · autoRetrain:false · not MHRA-approved CDS.",
      "permission-matrix: operations_lead / researcher denied named PHI chat; productionRbacEnforced=false honesty.",
      "EMIS partner env presence ≠ permission to flip liveEmis.",
      "India/Akeno PHI residency and CDSCO claims stay product-side — documented out of HSI scope.",
    ],
    honesty: [
      "No live CDS in hsi-core.",
      "No PHI stores on red-wave.",
      "Aksh health-live / clinic product code is out-of-scope; boundary docs + reject helpers only.",
      "Gate C never auto-approves; Discovery consume must keep notCds.",
    ],
  };
}

export function serializeCdsPhiBoundary(
  bundle: CdsPhiBoundaryBundle = buildCdsPhiBoundaryBundle(),
): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
