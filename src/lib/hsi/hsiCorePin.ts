/**
 * Vercel-safe HSI substrate pin for ISI.
 *
 * Production / CI resolve this module instead of the private local
 * `file:/Users/…/hsi-core` package. Refresh via `bun run hsi:sync-export`
 * (copies Discovery JSON + regenerates `src/data/hsi-substrate-pin.json`).
 *
 * Discovery honesty: notCds, never invent PMIDs, never auto Gate C.
 */
import pin from "@/data/hsi-substrate-pin.json";

export const HSI_CURATION_REVIEWS = [
  "draft",
  "unreviewed",
  "source-verified",
  "claim-assessed",
  "approved",
  "rejected",
  "conflicting",
  "superseded",
] as const;
export type HsiCurationReview = (typeof HSI_CURATION_REVIEWS)[number];

export const HSI_CURATION_LABELS: Record<
  HsiCurationReview,
  { label: string; desc: string }
> = {
  draft: {
    label: "Draft",
    desc: "Added to close a coverage gap; not yet reviewed by an expert.",
  },
  unreviewed: {
    label: "Unreviewed",
    desc: "No source has been mapped to this claim yet.",
  },
  "source-verified": {
    label: "Source linked",
    desc: "Carries a PubMed ID or DOI, but nobody has yet checked the source supports this exact claim.",
  },
  "claim-assessed": {
    label: "Partially supported",
    desc: "A reviewed source supports part of this claim.",
  },
  approved: {
    label: "Supported",
    desc: "An approved source was checked and supports this directional claim.",
  },
  rejected: {
    label: "Rejected",
    desc: "Reviewed sources do not address this claim.",
  },
  conflicting: {
    label: "Conflicting",
    desc: "Reviewed sources disagree about this claim.",
  },
  superseded: {
    label: "Superseded",
    desc: "Replaced by a newer claim.",
  },
};

export const HSI_GRADES = ["established", "uncertain", "unexplored"] as const;
export type HsiGrade = (typeof HSI_GRADES)[number];

export const HSI_GRADE_INFO: Record<HsiGrade, { label: string; desc: string }> = {
  established: {
    label: "Established",
    desc: "Human-supported claim with durable provenance; safe to surface under HITL / discovery constraints.",
  },
  uncertain: {
    label: "Uncertain",
    desc: "Partial support, conflict, or source-linked but not claim-assessed — label honesty required.",
  },
  unexplored: {
    label: "Unexplored",
    desc: "Draft, unreviewed, or no mapped source — discovery only; never CDS-actionable.",
  },
};

export const HSI_TEACHING_STATUSES = [
  "established",
  "associative",
  "hypothesized",
  "unknown",
] as const;
export type HsiTeachingStatus = (typeof HSI_TEACHING_STATUSES)[number];

export type HsiEdgeType = (typeof pin.edgeTypes)[number];
export type HsiDomain = (typeof pin.domains)[number];

export type HsiProvenance = {
  pmid: string | null;
  doi: string | null;
  citationLabel: string | null;
  sourceUrl: string | null;
  notes: string | null;
  recordedAt: string;
};

export type HsiClaim = {
  id: string;
  assertion: string;
  domain: HsiDomain;
  isiRelationshipId: string | null;
  akshNodeId: string | null;
};

export type HsiMarker = {
  id: string;
  name: string;
  loinc: string | null;
  unit: string | null;
  description: string;
};

export type HsiPatientObservationStub = {
  id: string;
  markerId: string;
  value: string | number | null;
  unit: string | null;
  observedAt: string | null;
  dataClass: "fixture" | "deid_aggregate" | "unknown";
};

export type HsiActionStub = {
  id: string;
  label: string;
  rationale: string;
  requiresHitl: true;
  cdsEligibleHint: boolean;
};

export type HsiEdge = {
  id: string;
  edgeType: HsiEdgeType;
  subjectId: string;
  subjectLabel: string;
  objectId: string;
  objectLabel: string;
  claimId: string;
  curationReview: HsiCurationReview;
  hsiGrade: HsiGrade;
  teachingStatus: HsiTeachingStatus;
  domain: HsiDomain;
  provenance: HsiProvenance;
  bridgeCandidate: boolean;
  seedKind: "placeholder" | "mapped";
};

export type HsiTranslationCard = {
  id: string;
  claim: HsiClaim;
  edge: HsiEdge;
  marker: HsiMarker;
  observation: HsiPatientObservationStub;
  action: HsiActionStub;
};

export type HsiValidationIssue = { path: string; message: string };
export type HsiValidationResult = { ok: boolean; issues: HsiValidationIssue[] };

export type HsiReleaseCriterion = {
  id: string;
  rule: string;
  [key: string]: unknown;
};

export type IsiRelMatchKind =
  | "exact_concept_pair"
  | "related_axis"
  | "none"
  | string;

export type IsiRelSuggestionStatus =
  | "suggested"
  | "accepted_for_curation"
  | "curated"
  | "rejected"
  | string;

export type IsiRelSuggestion = {
  edgeId: string;
  claimId: string;
  suggestedIsiRelationshipId: string | null;
  matchKind: IsiRelMatchKind;
  status: IsiRelSuggestionStatus;
  autoApprove: false;
  note?: string;
  rationale?: string;
  isiNodeIds?: string[];
  [key: string]: unknown;
};

export type IsiRelMappingSummary = {
  suggestions: number;
  withRelId: number;
  unmapped: number;
  exactConceptPair: number;
  relatedAxis: number;
  curated: number;
  acceptedForCuration: number;
  bridgeCandidatesCovered: number;
  bridgeCandidatesTotal: number;
  autoApproveIntoKg: false;
};

export type HsiEvidenceLinkStatus = "unlinked" | "evidence_linked";
export type HsiGateCHandoffStatus = "not_started" | "pending" | "hsi_passed";
export type HsiEvidenceHandoff = {
  evidenceLink: HsiEvidenceLinkStatus;
  gateC: HsiGateCHandoffStatus;
  label: string;
  pmid: string | null;
  doi: string | null;
  cdsSurfacable: boolean;
};

export type HsiClaimMarkerLink = {
  claimId: string;
  markerId: string;
  [key: string]: unknown;
};

export type HsiMappingGap = {
  id: string;
  [key: string]: unknown;
};

export type HsiSchemaGapReport = {
  schemaVersion: string;
  gaps: HsiMappingGap[];
  [key: string]: unknown;
};

export type IsiHsiExportBundle = typeof pin.exportBundle & {
  schemaVersion: "hsi-isi-export-1";
  notCds: true;
};

export const HSI_DOMAINS = pin.domains as readonly HsiDomain[];
export const HSI_EDGE_TYPES = pin.edgeTypes as readonly HsiEdgeType[];
export const HSI_T2D_IMMUNO_SEED_EDGES = pin.edges as unknown as readonly HsiEdge[];
export const HSI_T2D_IMMUNO_SEED_CLAIMS = pin.claims as unknown as readonly HsiClaim[];
export const HSI_MARKERS = pin.markers as unknown as readonly HsiMarker[];
export const ISI_REL_SUGGESTIONS = pin.isiRelSuggestions as unknown as readonly IsiRelSuggestion[];
export const HSI_EXAMPLE_TRANSLATION_CARDS =
  pin.translationCards as unknown as readonly HsiTranslationCard[];
export const HSI_SAFETY_RELEASE_CRITERIA_V0 =
  pin.safetyCriteria as unknown as readonly HsiReleaseCriterion[];
export const HSI_ALLOWED_AGENT_SURFACES_V0 =
  pin.allowedAgentSurfaces as readonly string[];

export function hsiGradeFromCuration(review: HsiCurationReview): HsiGrade {
  switch (review) {
    case "approved":
      return "established";
    case "claim-assessed":
    case "source-verified":
    case "conflicting":
      return "uncertain";
    case "draft":
    case "unreviewed":
    case "rejected":
    case "superseded":
      return "unexplored";
    default: {
      const _exhaustive: never = review;
      return _exhaustive;
    }
  }
}

export function hsiGradeFromTeaching(status: HsiTeachingStatus): HsiGrade {
  switch (status) {
    case "established":
      return "established";
    case "associative":
    case "hypothesized":
      return "uncertain";
    case "unknown":
      return "unexplored";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function isHsiCurationReview(v: unknown): v is HsiCurationReview {
  return typeof v === "string" && (HSI_CURATION_REVIEWS as readonly string[]).includes(v);
}

export function isHsiGrade(v: unknown): v is HsiGrade {
  return typeof v === "string" && (HSI_GRADES as readonly string[]).includes(v);
}

export function isHsiTeachingStatus(v: unknown): v is HsiTeachingStatus {
  return typeof v === "string" && (HSI_TEACHING_STATUSES as readonly string[]).includes(v);
}

export function isHsiEdgeType(v: unknown): v is HsiEdgeType {
  return typeof v === "string" && (HSI_EDGE_TYPES as readonly string[]).includes(v);
}

export function isHsiDomain(v: unknown): v is HsiDomain {
  return typeof v === "string" && (HSI_DOMAINS as readonly string[]).includes(v);
}

export function isCdsSurfacable(edge: Pick<HsiEdge, "curationReview" | "hsiGrade">): boolean {
  return edge.curationReview === "approved" && edge.hsiGrade === "established";
}

export function isDiscoverySurfacable(edge: Pick<HsiEdge, "curationReview">): boolean {
  return edge.curationReview !== "rejected" && edge.curationReview !== "superseded";
}

export function gradeForSeed(review: HsiCurationReview): HsiGrade {
  return hsiGradeFromCuration(review);
}

export function hasEvidenceLocator(edge: Pick<HsiEdge, "provenance">): boolean {
  const p = edge.provenance;
  return Boolean(
    p?.pmid?.trim() || p?.doi?.trim() || p?.citationLabel?.trim() || p?.sourceUrl?.trim(),
  );
}

export function validateProvenancePmid(pmid: string | null): HsiValidationIssue | null {
  if (pmid == null || pmid === "") return null;
  if (!/^\d{6,9}$/.test(pmid.trim())) {
    return { path: "provenance.pmid", message: "PMID must be 6–9 digits or null (never invent)." };
  }
  return null;
}

function issue(path: string, message: string): HsiValidationIssue {
  return { path, message };
}

export function validateHsiEdge(edge: HsiEdge): HsiValidationResult {
  const issues: HsiValidationIssue[] = [];
  if (!edge.id?.trim()) issues.push(issue("id", "Edge id is required."));
  if (!isHsiEdgeType(edge.edgeType)) {
    issues.push(issue("edgeType", `Unknown edge type: ${String(edge.edgeType)}`));
  }
  if (!edge.subjectId?.trim() || !edge.objectId?.trim()) {
    issues.push(issue("endpoints", "subjectId and objectId are required."));
  }
  if (!edge.claimId?.trim()) issues.push(issue("claimId", "claimId is required."));
  if (!isHsiCurationReview(edge.curationReview)) {
    issues.push(issue("curationReview", `Invalid curation review: ${String(edge.curationReview)}`));
  }
  if (!isHsiGrade(edge.hsiGrade)) {
    issues.push(issue("hsiGrade", `Invalid HSI grade: ${String(edge.hsiGrade)}`));
  }
  if (!isHsiTeachingStatus(edge.teachingStatus)) {
    issues.push(issue("teachingStatus", `Invalid teaching status: ${String(edge.teachingStatus)}`));
  }
  if (!isHsiDomain(edge.domain)) {
    issues.push(issue("domain", `Invalid domain: ${String(edge.domain)}`));
  }
  if (edge.hsiGrade === "established" && edge.curationReview !== "approved") {
    issues.push(
      issue("hsiGrade", "hsiGrade=established requires curationReview=approved (no silent promotion)."),
    );
  }
  if (edge.curationReview === "approved" && edge.hsiGrade === "unexplored") {
    issues.push(issue("hsiGrade", "approved edges must not be unexplored."));
  }
  const pmidIssue = validateProvenancePmid(edge.provenance?.pmid ?? null);
  if (pmidIssue) issues.push(pmidIssue);
  if (edge.curationReview === "source-verified" || edge.curationReview === "approved") {
    if (!hasEvidenceLocator(edge)) {
      issues.push(
        issue("provenance", "source-verified/approved edges need pmid, doi, or citationLabel."),
      );
    }
  }
  return { ok: issues.length === 0, issues };
}

export function validateTranslationCard(card: HsiTranslationCard): HsiValidationResult {
  const issues: HsiValidationIssue[] = [];
  const edgeResult = validateHsiEdge(card.edge);
  for (const i of edgeResult.issues) {
    issues.push(issue(`edge.${i.path}`, i.message));
  }
  if (card.claim.id !== card.edge.claimId) {
    issues.push(issue("claim.id", "claim.id must match edge.claimId."));
  }
  if (card.observation.markerId !== card.marker.id) {
    issues.push(issue("observation.markerId", "observation.markerId must match marker.id."));
  }
  if (card.observation.dataClass === undefined) {
    issues.push(issue("observation.dataClass", "dataClass is required."));
  }
  if (card.action.requiresHitl !== true) {
    issues.push(issue("action.requiresHitl", "Actions must require HITL."));
  }
  if (card.action.cdsEligibleHint && !isCdsSurfacable(card.edge)) {
    issues.push(
      issue(
        "action.cdsEligibleHint",
        "cdsEligibleHint=true only when curation=approved and hsiGrade=established.",
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}

export function summarizeGradeCounts(
  edges: readonly Pick<HsiEdge, "hsiGrade">[],
): Record<HsiGrade, number> {
  const out: Record<HsiGrade, number> = {
    established: 0,
    uncertain: 0,
    unexplored: 0,
  };
  for (const e of edges) {
    if (isHsiGrade(e.hsiGrade)) out[e.hsiGrade] += 1;
  }
  return out;
}

export function listBridgeCandidates(): HsiEdge[] {
  return HSI_T2D_IMMUNO_SEED_EDGES.filter((e) => e.bridgeCandidate);
}

export function listIsiRelSuggestions(): IsiRelSuggestion[] {
  return [...ISI_REL_SUGGESTIONS];
}

export function suggestionForClaim(claimId: string): IsiRelSuggestion | undefined {
  return ISI_REL_SUGGESTIONS.find((s) => s.claimId === claimId);
}

export function suggestionForEdge(edgeId: string): IsiRelSuggestion | undefined {
  return ISI_REL_SUGGESTIONS.find((s) => s.edgeId === edgeId);
}

function shouldApply(s: IsiRelSuggestion): boolean {
  return (
    Boolean(s.suggestedIsiRelationshipId) &&
    (s.status === "suggested" ||
      s.status === "accepted_for_curation" ||
      s.status === "curated") &&
    s.autoApprove === false
  );
}

export function claimsWithIsiMappings(
  claims: readonly HsiClaim[] = HSI_T2D_IMMUNO_SEED_CLAIMS,
): HsiClaim[] {
  return claims.map((claim) => {
    const s = suggestionForClaim(claim.id);
    if (!s || !shouldApply(s) || !s.suggestedIsiRelationshipId) return { ...claim };
    return { ...claim, isiRelationshipId: s.suggestedIsiRelationshipId };
  });
}

export function summarizeIsiRelMappings(
  suggestions: readonly IsiRelSuggestion[] = ISI_REL_SUGGESTIONS,
): IsiRelMappingSummary {
  const bridges = HSI_T2D_IMMUNO_SEED_EDGES.filter((e) => e.bridgeCandidate);
  const bridgeIds = new Set(bridges.map((e) => e.id));
  const withRel = suggestions.filter((s) => s.suggestedIsiRelationshipId);
  return {
    suggestions: suggestions.length,
    withRelId: withRel.length,
    unmapped: suggestions.filter((s) => s.matchKind === "none" || !s.suggestedIsiRelationshipId)
      .length,
    exactConceptPair: suggestions.filter((s) => s.matchKind === "exact_concept_pair").length,
    relatedAxis: suggestions.filter((s) => s.matchKind === "related_axis").length,
    curated: suggestions.filter((s) => s.status === "curated").length,
    acceptedForCuration: suggestions.filter((s) => s.status === "accepted_for_curation").length,
    bridgeCandidatesCovered: withRel.filter((s) => bridgeIds.has(s.edgeId)).length,
    bridgeCandidatesTotal: bridges.length,
    autoApproveIntoKg: false,
  };
}

export function hsiEvidenceHandoff(
  edge: Pick<HsiEdge, "provenance" | "curationReview" | "hsiGrade">,
): HsiEvidenceHandoff {
  const linked = hasEvidenceLocator(edge);
  const evidenceLink: HsiEvidenceLinkStatus = linked ? "evidence_linked" : "unlinked";
  let gateC: HsiGateCHandoffStatus;
  if (edge.curationReview === "approved") gateC = "hsi_passed";
  else if (linked) gateC = "pending";
  else gateC = "not_started";

  let label: string;
  if (evidenceLink === "unlinked") label = "unlinked · Gate C not started";
  else if (gateC === "hsi_passed") {
    label = "evidence-linked · HSI Gate C passed (Neon approve still separate)";
  } else label = "evidence-linked · Gate C pending";

  return {
    evidenceLink,
    gateC,
    label,
    pmid: edge.provenance?.pmid?.trim() || null,
    doi: edge.provenance?.doi?.trim() || null,
    cdsSurfacable: isCdsSurfacable(edge),
  };
}

export function markerByNodeId(nodeId: string): HsiMarker | undefined {
  return HSI_MARKERS.find((m) => m.id === nodeId);
}

export function markersWithLoinc(markers: readonly HsiMarker[] = HSI_MARKERS): HsiMarker[] {
  return markers.filter((m) => Boolean(m.loinc));
}

export function linkClaimToMarker(
  claimId: string,
  markerId: string,
): HsiClaimMarkerLink {
  return { claimId, markerId };
}

export function seedClaimLoincMap(): Array<HsiClaimMarkerLink & { claim: HsiClaim; loinc: string }> {
  const links = pin.exportBundle.claimLoincLinks ?? [];
  const claimById = new Map(HSI_T2D_IMMUNO_SEED_CLAIMS.map((c) => [c.id, c]));
  return links
    .map((l) => {
      const claim = claimById.get(l.claimId);
      const marker = markerByNodeId(l.marker.id);
      const loinc = l.loinc ?? marker?.loinc;
      if (!claim || !loinc) return null;
      return { claimId: l.claimId, markerId: l.marker.id, claim, loinc };
    })
    .filter((x): x is HsiClaimMarkerLink & { claim: HsiClaim; loinc: string } => x != null);
}

export function loincCoverageSummary(
  edges: readonly HsiEdge[] = HSI_T2D_IMMUNO_SEED_EDGES,
): {
  edgeCount: number;
  withLoincLink: number;
  [key: string]: unknown;
} {
  const bundled = pin.exportBundle.loincCoverage as {
    edgeCount?: number;
    withLoincLink?: number;
    [key: string]: unknown;
  };
  if (edges === HSI_T2D_IMMUNO_SEED_EDGES && bundled) {
    return {
      edgeCount: bundled.edgeCount ?? edges.length,
      withLoincLink: bundled.withLoincLink ?? 0,
      ...bundled,
    };
  }
  return { edgeCount: edges.length, withLoincLink: 0 };
}

export function criterionIds(): string[] {
  return HSI_SAFETY_RELEASE_CRITERIA_V0.map((c) => c.id);
}

export function buildIsiExportBundle(): IsiHsiExportBundle {
  return pin.exportBundle as unknown as IsiHsiExportBundle;
}

export function serializeIsiExport(bundle: IsiHsiExportBundle = buildIsiExportBundle()): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function buildSchemaGapReport(): HsiSchemaGapReport {
  return {
    schemaVersion: "hsi-schema-gap-pin-1",
    gaps: [],
    note: "Gap report lives in hsi-core publish outputs; pin ships empty for deploy safety.",
  };
}

export function serializeGapReport(report: HsiSchemaGapReport = buildSchemaGapReport()): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}
