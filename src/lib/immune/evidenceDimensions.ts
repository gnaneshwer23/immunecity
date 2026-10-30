/**
 * Three orthogonal evidence dimensions for graph / trial panels.
 * Never collapse into a single confidence score.
 *
 * 1. Curation / review — human Gate C or trial source verification
 * 2. Evidence status — KG teaching label (ESTABLISHED / …) when present
 * 3. Quality — recorded link confidence only (not Gate C, not invented)
 */
import type { KGEdge } from "./engine";
import { honestEvidenceStatus, STATUS_INFO, type ReviewStatus } from "./evidenceStatus";
import { VERIFICATION_LABEL, type EndpointProvenanceView } from "./trialProvenance";
import type { EndpointResultRecord } from "@/data/trialIntelligence";

export type EvidenceDimensionKind = "curation" | "evidence_status" | "quality";

export interface EvidenceDimension {
  kind: EvidenceDimensionKind;
  /** Short axis name shown in UI. */
  axis: string;
  /** Display value — never a composite of other axes. */
  value: string;
  description: string;
}

const AXIS: Record<EvidenceDimensionKind, string> = {
  curation: "Curation / review",
  evidence_status: "Evidence status",
  quality: "Recorded quality",
};

/** Graph edge: review status ≠ evidence_status ≠ confidence. */
export function edgeEvidenceDimensions(edge: KGEdge, review: ReviewStatus): EvidenceDimension[] {
  const reviewInfo = STATUS_INFO[review];
  const statusRaw = honestEvidenceStatus(edge).trim();
  const confidence = edge.confidence;
  return [
    {
      kind: "curation",
      axis: AXIS.curation,
      value: reviewInfo.label,
      description: reviewInfo.desc,
    },
    {
      kind: "evidence_status",
      axis: AXIS.evidence_status,
      value: statusRaw ? statusRaw.toLowerCase().replace(/_/g, " ") : "unspecified",
      description:
        "Honest teaching evidence class on the link (may demote ESTABLISHED when draft, TO_BE_CURATED, or audit override). Not curator approval.",
    },
    {
      kind: "quality",
      axis: AXIS.quality,
      value: confidence || "unspecified",
      description:
        "Author-recorded confidence on the graph link. Not a Gate C score and not merged with review status.",
    },
  ];
}

/**
 * Trial endpoint dimensions (no invented quality score):
 * curation → source verification; evidence_status → PMID/DOI presence;
 * quality → analysis-set / follow-up disclosure when recorded.
 */
export function trialEndpointDimensions(
  ep: EndpointResultRecord,
  view?: EndpointProvenanceView,
): EvidenceDimension[] {
  const v = view;
  const ver = VERIFICATION_LABEL[ep.verificationState];
  const sourceBits: string[] = [];
  if (ep.sourcePmid) sourceBits.push(`PMID ${ep.sourcePmid}`);
  if (ep.sourceDoi) sourceBits.push(`doi:${ep.sourceDoi}`);
  const sourceValue = sourceBits.length ? sourceBits.join(" · ") : "no verified identifier";

  const contextBits: string[] = [];
  if (ep.analysisSet) contextBits.push(ep.analysisSet);
  if (ep.followUp) contextBits.push(ep.followUp);
  else if (ep.timepoint) contextBits.push(ep.timepoint);

  return [
    {
      kind: "curation",
      axis: AXIS.curation,
      value: v?.verificationLabel ?? ver.label,
      description: v?.verificationDesc ?? ver.desc,
    },
    {
      kind: "evidence_status",
      axis: "Source identifiers",
      value: sourceValue,
      description: "Primary publication identifiers for this endpoint — not a graph evidence_status class.",
    },
    {
      kind: "quality",
      axis: "Analysis context",
      value: contextBits.length ? contextBits.join(" · ") : "not recorded",
      description:
        "Analysis set and follow-up/timepoint when present. Not a composite quality score.",
    },
  ];
}

/** Hard rule: UI must never treat the three axes as one score. */
export function dimensionsAreOrthogonal(dims: EvidenceDimension[]): boolean {
  if (dims.length !== 3) return false;
  const kinds = new Set(dims.map((d) => d.kind));
  return kinds.has("curation") && kinds.has("evidence_status") && kinds.has("quality");
}
