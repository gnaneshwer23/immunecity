/**
 * View helpers for ISI product Discovery (ASK → MAP → REVIEW).
 * Shapes vendored HSI packs without importing hsi-core as a runtime dep.
 */

import type { ConsumeLoadResult, HsiGradeBand, PartnerLock } from "./discoveryConsume";

export type EvidenceRowView = {
  claimId: string;
  edgeId: string;
  claimText: string;
  subject: string;
  relationship: string;
  object: string;
  evidenceGrade: HsiGradeBand | string;
  reviewStatus?: string;
  pmid: string | null;
  citationLabel: string | null;
  sourceUrl: string | null;
  markerName: string | null;
  loinc: string | null;
};

export type ExplanationView = {
  id: string;
  label: string;
  status: string;
  relatedClaimIds: string[];
  note: string;
};

export type ExpertItemView = {
  id: string;
  kind: string;
  text: string;
  relatedClaimIds: string[];
  autoApproved: boolean;
};

export type EntitySliceView = {
  diseases: string[];
  cells: string[];
  pathwaysOrMechanisms: string[];
  biomarkers: string[];
  treatments: string[];
  studies: string[];
  note?: string;
};

export type GraphEdgeView = {
  id: string;
  subject: string;
  relationship: string;
  object: string;
  grade: string;
};

export type R2CardView = {
  id: string;
  label: string;
  validationStatus: string;
  statusRationale: string;
  autoApproved: boolean;
  groundingPmids: string[];
};

export type TranslationCandidateView = {
  id: string;
  assertion: string;
  clinicLabel: string | null;
  hsiGrade: string;
  clinicalUse: string;
  cdsSurfacable: boolean;
  status: string;
  hitlRequired: boolean;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function mapEvidenceRow(raw: unknown): EvidenceRowView | null {
  const r = asRecord(raw);
  if (!r) return null;
  const source = asRecord(r.source) ?? {};
  const marker = asRecord(r.marker) ?? {};
  const claimId = asString(r.claimId);
  if (!claimId) return null;
  return {
    claimId,
    edgeId: asString(r.edgeId, claimId),
    claimText: asString(r.claimText, claimId),
    subject: asString(r.subject, "—"),
    relationship: asString(r.relationship, "related_to"),
    object: asString(r.object, "—"),
    evidenceGrade: asString(r.evidenceGrade, "uncertain"),
    reviewStatus: asString(r.reviewStatus) || undefined,
    pmid: typeof source.pmid === "string" ? source.pmid : null,
    citationLabel: typeof source.citationLabel === "string" ? source.citationLabel : null,
    sourceUrl: typeof source.sourceUrl === "string" ? source.sourceUrl : null,
    markerName: typeof marker.markerName === "string" ? marker.markerName : null,
    loinc: typeof marker.loinc === "string" ? marker.loinc : null,
  };
}

function mapExplanation(raw: unknown): ExplanationView | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  if (!id) return null;
  return {
    id,
    label: asString(r.label, id),
    status: asString(r.status, "unknown"),
    relatedClaimIds: asStringArray(r.relatedClaimIds),
    note: asString(r.note),
  };
}

function mapExpert(raw: unknown): ExpertItemView | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asString(r.id);
  if (!id) return null;
  return {
    id,
    kind: asString(r.kind, "gap"),
    text: asString(r.text),
    relatedClaimIds: asStringArray(r.relatedClaimIds),
    autoApproved: r.autoApproved === true,
  };
}

function mapEntitySlice(raw: unknown): EntitySliceView {
  const r = asRecord(raw) ?? {};
  return {
    diseases: asStringArray(r.diseases),
    cells: asStringArray(r.cells),
    pathwaysOrMechanisms: asStringArray(r.pathwaysOrMechanisms),
    biomarkers: asStringArray(r.biomarkers),
    treatments: asStringArray(r.treatments),
    studies: asStringArray(r.studies),
    note: typeof r.note === "string" ? r.note : undefined,
  };
}

/** Prefer pathway claim IDs from the partner lock; fall back to RA/TNF heuristics. */
export function partnerScopedEvidenceRows(
  evidenceMap: unknown,
  partnerLock?: PartnerLock,
  packPartnerLock?: unknown,
): EvidenceRowView[] {
  const rows = Array.isArray(evidenceMap)
    ? evidenceMap.map(mapEvidenceRow).filter((x): x is EvidenceRowView => x != null)
    : [];
  const packLock = asRecord(packPartnerLock);
  const seed = asRecord(partnerLock?.seedPathway as unknown) ?? asRecord(packLock?.seedPathway);
  const focus = new Set(asStringArray(seed?.primaryClaimIds));
  if (focus.size > 0) {
    const scoped = rows.filter((r) => focus.has(r.claimId));
    if (scoped.length > 0) return scoped;
  }
  return rows.filter(
    (r) =>
      r.claimId.includes("-RA-") ||
      /anti-?tnf|rheumatoid|acpa|\bADA\b|anti-CCP/i.test(r.claimText),
  );
}

export function gradeCounts(rows: EvidenceRowView[]): Record<string, number> {
  const out: Record<string, number> = {
    established: 0,
    uncertain: 0,
    unexplored: 0,
  };
  for (const r of rows) {
    const g = r.evidenceGrade || "uncertain";
    out[g] = (out[g] ?? 0) + 1;
  }
  return out;
}

export function evidenceToGraphEdges(rows: EvidenceRowView[]): GraphEdgeView[] {
  return rows.map((r) => ({
    id: r.edgeId || r.claimId,
    subject: r.subject,
    relationship: r.relationship,
    object: r.object,
    grade: r.evidenceGrade,
  }));
}

export function raCompetingExplanations(list: unknown): ExplanationView[] {
  const all = Array.isArray(list)
    ? list.map(mapExplanation).filter((x): x is ExplanationView => x != null)
    : [];
  return all.filter((e) => !e.id.includes("sle"));
}

export function expertShortlist(list: unknown): ExpertItemView[] {
  return Array.isArray(list)
    ? list.map(mapExpert).filter((x): x is ExpertItemView => x != null)
    : [];
}

export function entitySliceFromPack(pack: Record<string, unknown> | undefined): EntitySliceView {
  return mapEntitySlice(pack?.partnerScopedEntitySlice ?? pack?.entitySlice);
}

export function r2HypothesisCards(r2: Record<string, unknown> | undefined): R2CardView[] {
  const cards = r2?.hypothesisCards;
  if (!Array.isArray(cards)) return [];
  return cards
    .map((raw) => {
      const r = asRecord(raw);
      if (!r) return null;
      const id = asString(r.id);
      if (!id) return null;
      return {
        id,
        label: asString(r.label, id),
        validationStatus: asString(r.validationStatus, "untested"),
        statusRationale: asString(r.statusRationale),
        autoApproved: r.autoApproved === true,
        groundingPmids: asStringArray(r.groundingPmids),
      } satisfies R2CardView;
    })
    .filter((x): x is R2CardView => x != null);
}

export function translationCandidates(
  translation: Record<string, unknown> | undefined,
): TranslationCandidateView[] {
  const list = translation?.candidates;
  if (!Array.isArray(list)) return [];
  return list
    .map((raw) => {
      const r = asRecord(raw);
      if (!r) return null;
      const id = asString(r.id);
      if (!id) return null;
      return {
        id,
        assertion: asString(r.assertion),
        clinicLabel: typeof r.clinicLabel === "string" ? r.clinicLabel : null,
        hsiGrade: asString(r.hsiGrade, "uncertain"),
        clinicalUse: asString(r.clinicalUse, "not_for_clinical_use"),
        cdsSurfacable: r.cdsSurfacable === true,
        status: asString(r.status, "deferred_until_hitl"),
        hitlRequired: r.hitlRequired !== false,
      } satisfies TranslationCandidateView;
    })
    .filter((x): x is TranslationCandidateView => x != null);
}

export function gateCPendingCount(gateC: ConsumeLoadResult["gateC"]): number {
  // Prefer published checklist rows with gateCStatus=pending (+ mapped REL).
  const rows = Array.isArray(gateC.rows)
    ? gateC.rows
    : Array.isArray(gateC.pending)
      ? gateC.pending
      : Array.isArray(gateC.items)
        ? gateC.items
        : [];
  let pending = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const status = String(r.gateCStatus ?? r.gate_c_status ?? "");
    const rel = r.isiRelationshipId ?? r.isi_relationship_id;
    if (status === "pending" && typeof rel === "string" && rel.length > 0) pending += 1;
  }
  if (pending > 0) return pending;
  if (Array.isArray(gateC.pending)) return gateC.pending.length;
  if (Array.isArray(gateC.items)) return gateC.items.length;
  return 0;
}

export function partnerLabel(lock: PartnerLock): string {
  const partner = asRecord(lock.partner);
  return asString(partner?.label, "Partner unset");
}

export function partnerDisease(lock: PartnerLock, pack: Record<string, unknown>): string {
  const disease = asRecord(lock.disease);
  return asString(disease?.label) || asString(pack.disease, "Rheumatoid arthritis");
}

export function partnerQuestion(lock: PartnerLock, pack: Record<string, unknown>): string {
  return (
    asString(lock.researchQuestion) ||
    asString(pack.researchQuestion) ||
    "Scoped research question unavailable in this pin."
  );
}

export function partnerHonestyLines(lock: PartnerLock): string[] {
  return asStringArray(lock.honesty);
}

export type DiscoveryLoopTab = "ask" | "map" | "review" | "validate" | "translate";

export const DISCOVERY_LOOP_TABS: {
  id: DiscoveryLoopTab;
  n: string;
  label: string;
  blurb: string;
}[] = [
  { id: "ask", n: "01", label: "ASK", blurb: "Frame the locked question" },
  { id: "map", n: "02", label: "MAP", blurb: "Traceable evidence edges" },
  { id: "review", n: "03", label: "REVIEW", blurb: "Challenge & Gate C queue" },
  { id: "validate", n: "04", label: "VALIDATE", blurb: "Hypotheses & gaps" },
  { id: "translate", n: "05", label: "TRANSLATE", blurb: "HITL only — not CDS" },
];
