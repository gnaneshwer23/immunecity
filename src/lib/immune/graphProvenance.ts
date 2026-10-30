/**
 * Phase B — Versioned provenance + scientific review metadata helpers.
 * Graph version fields come from kg.json; review decisions come from Neon
 * evidence rows when provided. Never invents reviewer names or approvals.
 */
import type { KGEdge, KGNode } from "@/lib/immune/engine";
import { byId, edgeByRel, relId } from "@/lib/immune/engine";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { edgePanelFields } from "@/lib/immune/graphPhase2";
import type { CitationLike, ReviewStatus } from "@/lib/immune/evidenceStatus";
import { honestEvidenceStatus, relationshipHonestyNote, relationshipStatus } from "@/lib/immune/evidenceStatus";

export interface ConceptProvenance {
  isiId: string;
  name: string;
  draft: boolean;
  /** Node version field when present on raw KG record. */
  recordVersion: string | null;
  graphCoreVersion: string;
  graphExtensionsVersion: string;
  releaseSnapshotAt: string;
  evidenceStatus: string | null;
}

export interface RelationshipProvenance {
  relId: string;
  draft: boolean;
  recordVersion: string | null;
  graphCoreVersion: string;
  graphExtensionsVersion: string;
  /** Honest teaching label (may demote ESTABLISHED when draft / TO_BE_CURATED / audit override). */
  evidenceStatus: string;
  /** Raw kg.json evidence_status before honesty demotion. */
  recordedEvidenceStatus: string;
  /** Optional S-P-O / Gate C honesty note — never invents science. */
  honestyNote: string | null;
  /** Review status derived from provided citations only — missing cites → unreviewed/draft. */
  reviewStatus: ReviewStatus;
  reviewer: string;
  reviewDecision: string;
  panelTimestamp: string;
  mechanism: string | null;
  location: string | null;
}

function recordVersion(row: object): string | null {
  const v = (row as { version?: unknown }).version;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function conceptProvenance(isiId: string): ConceptProvenance | null {
  const node = byId[isiId] as (KGNode & { evidence_status?: string; version?: string }) | undefined;
  if (!node) return null;
  const release = graphReleaseSnapshot();
  return {
    isiId,
    name: node.name,
    draft: Boolean(node.draft),
    recordVersion: recordVersion(node),
    graphCoreVersion: GRAPH_CORE_VERSION,
    graphExtensionsVersion: GRAPH_EXTENSIONS_VERSION,
    releaseSnapshotAt: release.snapshotAt,
    evidenceStatus: node.evidence_status ?? null,
  };
}

export function relationshipProvenance(
  edgeOrRelId: KGEdge | string,
  cites: CitationLike[] = [],
): RelationshipProvenance | null {
  const edge =
    typeof edgeOrRelId === "string" ? edgeByRel[edgeOrRelId] : edgeOrRelId;
  if (!edge) return null;
  const sub = byId[edge.subject_id];
  const obj = byId[edge.object_id];
  if (!sub || !obj) return null;
  const panel = edgePanelFields(edge, sub.name, obj.name);
  return {
    relId: relId(edge),
    draft: Boolean(edge.draft),
    recordVersion: recordVersion(edge),
    graphCoreVersion: GRAPH_CORE_VERSION,
    graphExtensionsVersion: GRAPH_EXTENSIONS_VERSION,
    evidenceStatus: honestEvidenceStatus(edge),
    recordedEvidenceStatus: edge.evidence_status,
    honestyNote: relationshipHonestyNote(edge),
    reviewStatus: relationshipStatus(edge, cites),
    reviewer: panel.reviewer,
    reviewDecision: panel.reviewDecision,
    panelTimestamp: panel.timestamp,
    mechanism: edge.mechanism?.trim() || null,
    location: edge.location?.trim() || null,
  };
}
