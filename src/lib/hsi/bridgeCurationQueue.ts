/**
 * HSI bridge → Gate C curation queue (ISI side).
 *
 * Lists hsi-core bridge / IO suggestions with suggested REL-* matches.
 * Validates ids against the live Immune City graph. Never auto-approves.
 * Axes stay separate: teachingStatus ≠ hsiGrade ≠ CDS ≠ Gate C.
 */
import {
  HSI_AXES_NOTE,
  HSI_T2D_IMMUNO_SEED_CLAIMS,
  HSI_T2D_IMMUNO_SEED_EDGES,
  claimsWithIsiMappings,
  hsiEvidenceHandoff,
  listBridgeCandidates,
  listIsiRelSuggestions,
  summarizeIsiRelMappings,
  type HsiEdge,
  type HsiEvidenceLinkStatus,
  type HsiGateCHandoffStatus,
  type HsiGrade,
  type HsiTeachingStatus,
  type IsiRelMatchKind,
  type IsiRelSuggestionStatus,
} from "@/lib/hsi";
import { byId, edgeByRel } from "@/lib/immune/engine";
import { resolveGraphRelationshipId } from "@/lib/immune/graphInventory";

export type HsiBridgeQueueItem = {
  edgeId: string;
  claimId: string;
  assertion: string;
  subjectLabel: string;
  objectLabel: string;
  domain: HsiEdge["domain"];
  bridgeCandidate: boolean;
  hsiGrade: HsiGrade;
  teachingStatus: HsiTeachingStatus;
  curationReview: HsiEdge["curationReview"];
  suggestedIsiRelationshipId: string | null;
  matchKind: IsiRelMatchKind;
  suggestionStatus: IsiRelSuggestionStatus;
  rationale: string;
  /** True when suggested REL-* resolves in the live KG. */
  relExistsInGraph: boolean;
  /** Human-readable SPO when the REL exists. */
  relLabel: string | null;
  isiNodeLabels: string[];
  /** Real PMID from HSI provenance when linked — never invented. */
  pmid: string | null;
  doi: string | null;
  /** HSI evidence link axis (locator present vs absent). */
  evidenceLink: HsiEvidenceLinkStatus;
  /** HSI Gate C handoff — not Neon approve+supports. */
  gateCHandoff: HsiGateCHandoffStatus;
  /** Curator-facing compound label (e.g. evidence-linked · Gate C pending). */
  evidenceHandoffLabel: string;
  /** Always false — documentation invariant. */
  autoApprove: false;
  /** Always false until Gate C + established grade. */
  cdsSurfacable: false;
};

export type HsiBridgeCurationQueue = {
  notCds: true;
  autoApproveIntoKg: false;
  axesNote: string;
  summary: {
    items: number;
    bridgeCandidates: number;
    withSuggestedRel: number;
    relValidatedInGraph: number;
    exactConceptPair: number;
    relatedAxis: number;
    unmapped: number;
    evidenceLinked: number;
    gateCPending: number;
    mapping: ReturnType<typeof summarizeIsiRelMappings>;
  };
  items: HsiBridgeQueueItem[];
};

function relLabelFor(relId: string | null): string | null {
  if (!relId) return null;
  const edge = edgeByRel[relId];
  if (!edge) return null;
  const s = byId[edge.subject_id];
  const o = byId[edge.object_id];
  if (!s || !o) return null;
  return `${s.name} —${edge.relation}→ ${o.name}`;
}

function nodeLabels(ids: string[]): string[] {
  return ids
    .map((id) => {
      const n = byId[id];
      return n ? `${id} · ${n.name}` : null;
    })
    .filter((x): x is string => Boolean(x));
}

/**
 * Build the curator-facing queue from hsi-core suggestions + live KG validation.
 * Prefer bridge candidates; include non-bridge IO/AU suggestions that have REL pointers.
 */
export function buildHsiBridgeCurationQueue(): HsiBridgeCurationQueue {
  const suggestions = listIsiRelSuggestions();
  const edgeById = new Map(HSI_T2D_IMMUNO_SEED_EDGES.map((e) => [e.id, e]));
  const claimById = new Map(claimsWithIsiMappings(HSI_T2D_IMMUNO_SEED_CLAIMS).map((c) => [c.id, c]));
  const bridgeIds = new Set(listBridgeCandidates().map((e) => e.id));

  const items: HsiBridgeQueueItem[] = [];

  for (const s of suggestions) {
    const edge = edgeById.get(s.edgeId);
    const claim = claimById.get(s.claimId);
    if (!edge || !claim) continue;

    // Queue = bridge candidates OR any seed with a suggested / explicit unmapped bridge-relevant row.
    if (!edge.bridgeCandidate && !s.suggestedIsiRelationshipId && s.matchKind === "none") {
      // Keep explicit IO/AU unmapped rows that are listed in the suggestion file for honesty.
      if (edge.domain !== "io" && edge.domain !== "autoimmunity" && edge.domain !== "immuno_metabolic") {
        continue;
      }
    }

    const relId = s.suggestedIsiRelationshipId;
    const relExistsInGraph = Boolean(relId && resolveGraphRelationshipId(relId));
    const handoff = hsiEvidenceHandoff(edge);

    items.push({
      edgeId: edge.id,
      claimId: claim.id,
      assertion: claim.assertion,
      subjectLabel: edge.subjectLabel,
      objectLabel: edge.objectLabel,
      domain: edge.domain,
      bridgeCandidate: edge.bridgeCandidate || bridgeIds.has(edge.id),
      hsiGrade: edge.hsiGrade,
      teachingStatus: edge.teachingStatus,
      curationReview: edge.curationReview,
      suggestedIsiRelationshipId: relId,
      matchKind: s.matchKind,
      suggestionStatus: s.status,
      rationale: s.rationale,
      relExistsInGraph,
      relLabel: relExistsInGraph ? relLabelFor(relId) : null,
      isiNodeLabels: nodeLabels(s.isiNodeIds),
      pmid: handoff.pmid,
      doi: handoff.doi,
      evidenceLink: handoff.evidenceLink,
      gateCHandoff: handoff.gateC,
      evidenceHandoffLabel: handoff.label,
      autoApprove: false,
      cdsSurfacable: false,
    });
  }

  // Stable: bridges first, then exact matches, then related, then unmapped.
  const rank = (i: HsiBridgeQueueItem) => {
    let score = 0;
    if (i.bridgeCandidate) score += 100;
    if (i.matchKind === "exact_concept_pair") score += 50;
    else if (i.matchKind === "related_axis") score += 30;
    if (i.relExistsInGraph) score += 10;
    return -score;
  };
  items.sort((a, b) => rank(a) - rank(b) || a.edgeId.localeCompare(b.edgeId));

  const mapping = summarizeIsiRelMappings();

  return {
    notCds: true,
    autoApproveIntoKg: false,
    axesNote: HSI_AXES_NOTE,
    summary: {
      items: items.length,
      bridgeCandidates: items.filter((i) => i.bridgeCandidate).length,
      withSuggestedRel: items.filter((i) => i.suggestedIsiRelationshipId).length,
      relValidatedInGraph: items.filter((i) => i.relExistsInGraph).length,
      exactConceptPair: items.filter((i) => i.matchKind === "exact_concept_pair").length,
      relatedAxis: items.filter((i) => i.matchKind === "related_axis").length,
      unmapped: items.filter((i) => i.matchKind === "none").length,
      evidenceLinked: items.filter((i) => i.evidenceLink === "evidence_linked").length,
      gateCPending: items.filter((i) => i.gateCHandoff === "pending").length,
      mapping,
    },
    items,
  };
}
