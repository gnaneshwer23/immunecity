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

/** Parsed S-P-O for the mapped ISI REL (curator re-read reminder). */
export type HsiBridgeSpo = {
  subjectId: string;
  subjectName: string;
  predicate: string;
  objectId: string;
  objectName: string;
  /** e.g. "PD-1 —drives→ T-cell exhaustion programme" */
  label: string;
};

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
  /** Structured S-P-O for Gate C re-read (null if REL missing from graph). */
  spo: HsiBridgeSpo | null;
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
  /**
   * Ready for human Discovery Gate C (REVIEW queue) when:
   * evidence-linked + Gate C pending + PMID + curated map + REL-* in live KG.
   * Still autoApprove=false.
   */
  neonGateCReady: boolean;
  /**
   * P2.2 — Discovery Gate C already human_approved on autumn-snow;
   * public cite still needs Check → claim_support=supports → Approve on /curation.
   */
  citeReadyAfterGateC: boolean;
  /** autumn-snow / pin decision status when known. */
  isiGateCDecisionStatus: string | null;
  /** Deep-link hash + query for /curation evidence filter. */
  neonGateCHref: string | null;
  /** Always false — documentation invariant. */
  autoApprove: false;
  /** Always false until Gate C + established grade. */
  cdsSurfacable: false;
};

/**
 * Gate C–ready filter: evidence-linked + Gate C pending + PMID + mapped REL-* in graph
 * + curated (or accepted_for_curation). Never true when autoApprove would be set.
 */
export function isNeonGateCReadyItem(
  item: Pick<
    HsiBridgeQueueItem,
    | "evidenceLink"
    | "gateCHandoff"
    | "pmid"
    | "suggestedIsiRelationshipId"
    | "relExistsInGraph"
    | "suggestionStatus"
    | "autoApprove"
  >,
): boolean {
  return (
    item.evidenceLink === "evidence_linked" &&
    item.gateCHandoff === "pending" &&
    Boolean(item.pmid) &&
    Boolean(item.suggestedIsiRelationshipId?.startsWith("REL-")) &&
    item.relExistsInGraph === true &&
    (item.suggestionStatus === "curated" || item.suggestionStatus === "accepted_for_curation") &&
    item.autoApprove === false
  );
}

export type HsiBridgeCurationQueue = {
  notCds: true;
  autoApproveIntoKg: false;
  axesNote: string;
  /** Human-only Neon path copy for the panel. */
  neonGateCPath: readonly [
    "1. Discovery Gate C on /hsi/discovery REVIEW (approve/reject/defer)",
    "2. Check identifiers (PubMed/Crossref) on /curation",
    "3. Map relationship_id to the suggested REL-*",
    "4. Assess claim_support = supports (or contradicts/partial)",
    "5. Approve — only then public cite counts (separate from Discovery Gate C)",
  ];
  summary: {
    items: number;
    bridgeCandidates: number;
    withSuggestedRel: number;
    relValidatedInGraph: number;
    exactConceptPair: number;
    relatedAxis: number;
    unmapped: number;
    curated: number;
    evidenceLinked: number;
    gateCPending: number;
    neonGateCReady: number;
    citeReadyAfterGateC: number;
    mapping: ReturnType<typeof summarizeIsiRelMappings>;
  };
  items: HsiBridgeQueueItem[];
};

/** Decision status keyed by HSI edge id (from autumn-snow or pin JSON). */
export type GateCDecisionStatusByEdge = ReadonlyMap<string, string>;

export function parseGateCDecisionStatusByEdge(
  raw: unknown,
): GateCDecisionStatusByEdge {
  const map = new Map<string, string>();
  const doc =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(doc?.decisions)
      ? doc!.decisions
      : [];
  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const edgeId = typeof r.edgeId === "string" ? r.edgeId : "";
    const status = typeof r.status === "string" ? r.status : "";
    if (edgeId && status) map.set(edgeId, status);
  }
  return map;
}

export function isCiteReadyAfterGateCItem(
  item: Pick<
    HsiBridgeQueueItem,
    | "pmid"
    | "suggestedIsiRelationshipId"
    | "relExistsInGraph"
    | "isiGateCDecisionStatus"
    | "autoApprove"
  >,
): boolean {
  return (
    item.isiGateCDecisionStatus === "human_approved" &&
    Boolean(item.pmid) &&
    Boolean(item.suggestedIsiRelationshipId?.startsWith("REL-")) &&
    item.relExistsInGraph === true &&
    item.autoApprove === false
  );
}

function spoFor(relId: string | null): HsiBridgeSpo | null {
  if (!relId) return null;
  const edge = edgeByRel[relId];
  if (!edge) return null;
  const s = byId[edge.subject_id];
  const o = byId[edge.object_id];
  if (!s || !o) return null;
  const label = `${s.name} —${edge.relation}→ ${o.name}`;
  return {
    subjectId: edge.subject_id,
    subjectName: s.name,
    predicate: edge.relation,
    objectId: edge.object_id,
    objectName: o.name,
    label,
  };
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
 * Optional `gateCDecisionsByEdge` overlays autumn-snow / pin human decisions (P2.2 cite path).
 */
export function buildHsiBridgeCurationQueue(
  gateCDecisionsByEdge: GateCDecisionStatusByEdge = new Map(),
): HsiBridgeCurationQueue {
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
    const spo = relExistsInGraph ? spoFor(relId) : null;
    const isiGateCDecisionStatus = gateCDecisionsByEdge.get(edge.id) ?? null;
    const draft: Omit<
      HsiBridgeQueueItem,
      "neonGateCReady" | "citeReadyAfterGateC" | "neonGateCHref"
    > = {
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
      relLabel: spo?.label ?? null,
      spo,
      isiNodeLabels: nodeLabels(s.isiNodeIds),
      pmid: handoff.pmid,
      doi: handoff.doi,
      evidenceLink: handoff.evidenceLink,
      gateCHandoff: handoff.gateC,
      evidenceHandoffLabel: handoff.label,
      isiGateCDecisionStatus,
      autoApprove: false,
      cdsSurfacable: false,
    };
    const neonGateCReady =
      isiGateCDecisionStatus === "human_approved"
        ? false
        : isNeonGateCReadyItem(draft);
    const citeReadyAfterGateC = isCiteReadyAfterGateCItem({
      ...draft,
      isiGateCDecisionStatus,
    });
    const hsiFlag = citeReadyAfterGateC ? "cite" : "ready";
    items.push({
      ...draft,
      neonGateCReady,
      citeReadyAfterGateC,
      neonGateCHref: relId
        ? `/curation?q=${encodeURIComponent(relId)}&hsi=${hsiFlag}#import`
        : null,
    });
  }

  // Stable: cite-ready first, then Discovery-Gate-C-ready, then bridges…
  const rank = (i: HsiBridgeQueueItem) => {
    let score = 0;
    if (i.citeReadyAfterGateC) score += 300;
    if (i.neonGateCReady) score += 200;
    if (i.bridgeCandidate) score += 100;
    if (i.matchKind === "exact_concept_pair") score += 50;
    else if (i.matchKind === "related_axis") score += 30;
    if (i.suggestionStatus === "curated") score += 20;
    if (i.relExistsInGraph) score += 10;
    return -score;
  };
  items.sort((a, b) => rank(a) - rank(b) || a.edgeId.localeCompare(b.edgeId));

  const mapping = summarizeIsiRelMappings();

  return {
    notCds: true,
    autoApproveIntoKg: false,
    axesNote: HSI_AXES_NOTE,
    neonGateCPath: [
      "1. Discovery Gate C on /hsi/discovery REVIEW (approve/reject/defer)",
      "2. Check identifiers (PubMed/Crossref) on /curation",
      "3. Map relationship_id to the suggested REL-*",
      "4. Assess claim_support = supports (or contradicts/partial)",
      "5. Approve — only then public cite counts (separate from Discovery Gate C)",
    ] as const,
    summary: {
      items: items.length,
      bridgeCandidates: items.filter((i) => i.bridgeCandidate).length,
      withSuggestedRel: items.filter((i) => i.suggestedIsiRelationshipId).length,
      relValidatedInGraph: items.filter((i) => i.relExistsInGraph).length,
      exactConceptPair: items.filter((i) => i.matchKind === "exact_concept_pair").length,
      relatedAxis: items.filter((i) => i.matchKind === "related_axis").length,
      unmapped: items.filter((i) => i.matchKind === "none").length,
      curated: items.filter((i) => i.suggestionStatus === "curated").length,
      evidenceLinked: items.filter((i) => i.evidenceLink === "evidence_linked").length,
      gateCPending: items.filter((i) => i.gateCHandoff === "pending").length,
      neonGateCReady: items.filter((i) => i.neonGateCReady).length,
      citeReadyAfterGateC: items.filter((i) => i.citeReadyAfterGateC).length,
      mapping,
    },
    items,
  };
}

/** Curator sprint slice: only Discovery Gate C–ready rows (human path; never auto-approve). */
export function listNeonGateCReadyItems(
  queue: HsiBridgeCurationQueue = buildHsiBridgeCurationQueue(),
): HsiBridgeQueueItem[] {
  return queue.items.filter((i) => i.neonGateCReady && isNeonGateCReadyItem(i));
}

/** P2.2 — cite Check→supports→Approve candidates after Discovery Gate C approve. */
export function listCiteReadyAfterGateCItems(
  queue: HsiBridgeCurationQueue = buildHsiBridgeCurationQueue(),
): HsiBridgeQueueItem[] {
  return queue.items.filter(
    (i) => i.citeReadyAfterGateC && isCiteReadyAfterGateCItem(i),
  );
}

/** Fixed curator warnings shown on the Gate C–ready panel (not CDS). */
export const NEON_GATE_C_CURATOR_WARNINGS = [
  "Re-read the mapped S-P-O before claim_support=supports — the paper must support this directional claim, not a nearby axis.",
  "HSI source-verified / curated ≠ Discovery Gate C human_approved ≠ public cite. Only Check → claim_support=supports → Approve on /curation counts for cites.",
  "autoApprove stays false everywhere — never bulk-approve or invent PMIDs.",
  "Not clinical decision support (CDS). teachingStatus ≠ hsiGrade ≠ Discovery Gate C ≠ public cite.",
] as const;
