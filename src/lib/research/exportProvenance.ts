/**
 * Phase E — Provenance trail for research exports (brief / workbench / path).
 * Composes graphProvenance + optional audit summaries. Never invents reviewers
 * or approvals. kgWrite remains false on every export envelope.
 */
import { byId } from "@/lib/immune/engine";
import {
  conceptProvenance,
  relationshipProvenance,
  type ConceptProvenance,
  type RelationshipProvenance,
} from "@/lib/immune/graphProvenance";
import {
  summariseAuditHistory,
  type EvidenceAuditEventView,
} from "@/lib/immune/scientificReviewQueue";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION, graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";

export const EXPORT_PROVENANCE_SCHEMA = "exp-prov-1" as const;

export type ExportProvenanceTrail = {
  kind: "research_export_provenance_trail";
  schemaVersion: typeof EXPORT_PROVENANCE_SCHEMA;
  kgWrite: false;
  clinicalConclusion: false;
  exportedAt: string;
  graphCoreVersion: string;
  graphExtensionsVersion: string;
  releaseSnapshotAt: string;
  concepts: ConceptProvenance[];
  relationships: RelationshipProvenance[];
  trials: Array<{
    graphNodeId: string;
    trialId: string;
    nctId: string;
    primaryPmid: string;
    verificationState: string;
    treatmentLine: string | null;
    source: "fixture_pilot";
  }>;
  evidenceIds: string[];
  /** Present only when callers supply Neon audit events — never fabricated. */
  auditSummary: ReturnType<typeof summariseAuditHistory> | null;
  disclaimer: string;
};

function pilotTrialRows(trialIds: ReadonlySet<string>, conceptIds: readonly string[]) {
  const mapTrial = (t: (typeof MELANOMA_PILOT_TRIALS)[number]) => ({
    graphNodeId: t.graphNodeId,
    trialId: t.trialId,
    nctId: t.nctId,
    primaryPmid: t.primaryPmid,
    verificationState: t.verificationState,
    treatmentLine: t.treatmentLine ?? null,
    source: "fixture_pilot" as const,
  });

  if (trialIds.size > 0) {
    return MELANOMA_PILOT_TRIALS.filter((t) => trialIds.has(t.graphNodeId) || trialIds.has(t.trialId)).map(
      mapTrial,
    );
  }
  return MELANOMA_PILOT_TRIALS.filter((t) => conceptIds.includes(t.graphNodeId)).map(mapTrial);
}

export function buildExportProvenanceTrail(input: {
  conceptIds?: readonly string[];
  relIds?: readonly string[];
  trialIds?: readonly string[];
  evidenceIds?: readonly string[];
  auditEvents?: readonly EvidenceAuditEventView[];
  now?: Date;
}): ExportProvenanceTrail {
  const release = graphReleaseSnapshot();
  const conceptIds = [...new Set((input.conceptIds ?? []).map((id) => id.trim()).filter((id) => byId[id]))];
  const relIds = [...new Set((input.relIds ?? []).map((id) => id.trim()).filter((id) => id.startsWith("REL-")))];
  const evidenceIds = [...new Set((input.evidenceIds ?? []).map((id) => id.trim()).filter(Boolean))];
  const trialIdSet = new Set((input.trialIds ?? []).map((id) => id.trim()).filter(Boolean));

  const concepts = conceptIds.map((id) => conceptProvenance(id)).filter((c): c is ConceptProvenance => Boolean(c));
  const relationships = relIds
    .map((id) => relationshipProvenance(id))
    .filter((r): r is RelationshipProvenance => Boolean(r));

  const auditSummary =
    input.auditEvents && input.auditEvents.length
      ? summariseAuditHistory([...input.auditEvents])
      : null;

  return {
    kind: "research_export_provenance_trail",
    schemaVersion: EXPORT_PROVENANCE_SCHEMA,
    kgWrite: false,
    clinicalConclusion: false,
    exportedAt: (input.now ?? new Date()).toISOString(),
    graphCoreVersion: GRAPH_CORE_VERSION,
    graphExtensionsVersion: GRAPH_EXTENSIONS_VERSION,
    releaseSnapshotAt: release.snapshotAt,
    concepts,
    relationships,
    trials: pilotTrialRows(trialIdSet, conceptIds),
    evidenceIds,
    auditSummary,
    disclaimer:
      "Provenance trail for research export. Unreviewed material stays unapproved. kgWrite=false. Not clinical decision support.",
  };
}
