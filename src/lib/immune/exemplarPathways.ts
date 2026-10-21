/* Three PRD exemplar pathways (TNF→RA, PD-1 checkpoint, type-I IFN→SLE).
   Waypoints are canonical concept IDs. Evidence maturity is honest: most edges
   still lack approved claim-linked assessments — do not market as fully reviewed. */
import { byId, shortestPath, relId, type PathStep } from "@/lib/immune/engine";
import { relationshipStatus, STATUS_INFO, type CitationLike, type ReviewStatus } from "@/lib/immune/evidenceStatus";

export type ExemplarMaturity = "scaffold" | "partially-reviewed" | "reviewed";

/** User-facing maturity labels — never imply Gate C is complete when partial/scaffold. */
export const EXEMPLAR_MATURITY_LABEL: Record<ExemplarMaturity, string> = {
  scaffold: "Scaffold — few or no approved claim cites",
  "partially-reviewed": "Partially reviewed — some edges still need approved+supports",
  reviewed: "On-path edges reviewed — teaching axis, not disease-complete",
};

/** Compact strip labels for landings (TNF reviewed / PD-1 partial / IFN scaffold). */
export const EXEMPLAR_MATURITY_SHORT: Record<ExemplarMaturity, string> = {
  scaffold: "Scaffold",
  "partially-reviewed": "Partial",
  reviewed: "Reviewed",
};

export interface ExemplarPathway {
  id: string;
  title: string;
  purpose: string;
  /** Ordered waypoints the pathway should connect. */
  waypointIds: string[];
  /** Suggested mechanism-workspace defaults. */
  mechanism?: { startId: string; perturbId: string; outcomeId: string; mode: "inhibit" | "activate" };
  /**
   * Documented baseline when live approved cites are unavailable.
   * Live `reportExemplar(..., cites)` recomputes from approved+supports when cites are provided.
   */
  maturity: ExemplarMaturity;
  notes: string[];
}

/** Curator-facing PubMed/Crossref search hints — never invent PMIDs; human verifies. */
export interface ExemplarCuratorTarget {
  relId: string;
  pathwayId: string;
  claimHint: string;
  pubmedQuery: string;
  /** Known Neon row state as of last audit (read-only hint; live DB wins). */
  neonHint?: string;
}

export const EXEMPLAR_PATHWAYS: ExemplarPathway[] = [
  {
    id: "ex-tnf-ra",
    title: "TNF → rheumatoid arthritis",
    purpose: "Classic inflammatory cytokine → disease, with a therapy target on the same axis.",
    waypointIds: ["C003", "M001", "D001", "I001"],
    mechanism: { startId: "C003", perturbId: "I001", outcomeId: "D001", mode: "inhibit" },
    maturity: "reviewed",
    notes: [
      "On-path edges Macrophage→TNF, TNF→RA, Infliximab→TNF carry approved claim-linked cites (Chu / Feldmann / Lipsky).",
      "Still a teaching axis — do not treat the whole disease biology as evidence-complete.",
    ],
  },
  {
    id: "ex-pd1-io",
    title: "PD-1 / PD-L1 → cancer immunotherapy",
    purpose: "Checkpoint receptor biology linked to a clinical antibody and biomarker context.",
    waypointIds: ["R011", "R012", "B011", "I008"],
    mechanism: { startId: "R012", perturbId: "I008", outcomeId: "R011", mode: "inhibit" },
    maturity: "partially-reviewed",
    notes: [
      "CD8→PD-1 expression has approved support (Barber). Pembrolizumab→PD-1 block is approved off this shortest path (KEYNOTE).",
      "Still open for Gate C on this path: PD-L1→CD8 suppress (Chemnitz mapped partial), PD-L1 expression measures PD-L1, PD-L1 expression predicts pembrolizumab response.",
      "Separate cell biology, tumour context, therapeutic mechanism and trial endpoints — do not overgeneralise response rates.",
    ],
  },
  {
    id: "ex-ifn-sle",
    title: "Type-I interferon axis → SLE",
    purpose: "Innate nucleic-acid sensing / pDC–IFN biology connected to SLE and IFNAR blockade.",
    waypointIds: ["C005", "P004", "M018", "D007", "I015"],
    mechanism: { startId: "C005", perturbId: "I015", outcomeId: "D007", mode: "inhibit" },
    maturity: "scaffold",
    notes: [
      "Shortest graph path Type-I IFN→SLE currently detours via BAFF/belimumab (Lopez / Shin / Navarra approved) — not a direct IFN→SLE claim review.",
      "Still open: pDC→IFN signalling, IFNAR→signalling, IFN↔IFNAR bind, Anifrolumab→SLE.",
      "Show where the chain is direct, indirect or still under review — overall pathway remains scaffold-ish.",
    ],
  },
];

/**
 * P0 curator focus: exemplar edges still needing honest approved+supports.
 * Queries are search starting points only — curator must verify identifiers before approve.
 */
export const EXEMPLAR_CURATOR_TARGETS: ExemplarCuratorTarget[] = [
  {
    relId: "REL-R012-suppresses-C015",
    pathwayId: "ex-pd1-io",
    claimHint: "PD-L1 suppresses CD8 CTL activity via PD-1 checkpoint engagement",
    pubmedQuery: "Chemnitz PD-L1 PD-1 CD8 T cell 2004",
    neonHint:
      "Neon: verified PMID 15240681; claim_support=partial (Chemnitz 2004) — reassess to supports only if source truly supports this directional claim, else keep partial",
  },
  {
    relId: "REL-B011-measures-R012",
    pathwayId: "ex-pd1-io",
    claimHint: "PD-L1 expression biomarker / assay measures PD-L1 (R012)",
    pubmedQuery: "PD-L1 immunohistochemistry companion diagnostic 22C3 OR SP263 assay",
    neonHint: "No mapped row yet — default PubMed ranking is noisy; curator must pick assay/CDx paper manually (auto-seed blocked)",
  },
  {
    relId: "REL-B011-predicts_response_to-I008",
    pathwayId: "ex-pd1-io",
    claimHint: "PD-L1 expression predicts response to pembrolizumab",
    pubmedQuery: "pembrolizumab PD-L1 biomarker KEYNOTE-001 Garon",
    neonHint: "No mapped row yet (KEYNOTE-006 is on REL-I008-blocks-R011, not this edge)",
  },
  {
    relId: "REL-C005-produces-P004",
    pathwayId: "ex-ifn-sle",
    claimHint: "Plasmacytoid dendritic cells produce type-I interferon signalling",
    pubmedQuery: "plasmacytoid dendritic cells natural interferon-producing cells Siegal",
    neonHint: "No mapped row yet — classic Siegal 1999 often ranks when query is specific",
  },
  {
    relId: "REL-R018-signals_through-P004",
    pathwayId: "ex-ifn-sle",
    claimHint: "IFNAR1 signals through type-I interferon pathway",
    pubmedQuery: "IFNAR1 interferon receptor signalling JAK STAT pathway review",
    neonHint: "No mapped row yet — title heuristic often fails; curator picks signalling review manually",
  },
  {
    relId: "REL-M018-binds-R018",
    pathwayId: "ex-ifn-sle",
    claimHint: "Type I interferon binds IFNAR1",
    pubmedQuery: "IFNAR1 interferon-beta binding hot spot receptor interaction",
    neonHint: "No mapped row yet",
  },
  {
    relId: "REL-I015-treats-D007",
    pathwayId: "ex-ifn-sle",
    claimHint: "Anifrolumab treats SLE (IFNAR blockade)",
    pubmedQuery: "anifrolumab TULIP-2 Morand NEJM",
    neonHint: "No mapped row yet — Morand TULIP-2 ranks with this query",
  },
];

export interface ExemplarPathReport {
  pathway: ExemplarPathway;
  segments: { fromId: string; toId: string; steps: PathStep[] | null; relIds: string[]; reviews: ReviewStatus[] }[];
  connected: boolean;
  missingSegment: string | null;
  /** Honest maturity from approved claim cites when provided; else documented baseline. */
  maturity: ExemplarMaturity;
  /** Unique on-path relationship IDs (order of first appearance). */
  uniqueRelIds: string[];
  /** Per unique relId review status (worst/conflict-aware via relationshipStatus on first matching step). */
  edgeReviews: { relId: string; review: ReviewStatus; label: string }[];
  approvedEdgeCount: number;
}

function maturityFromReviews(reviews: ReviewStatus[]): ExemplarMaturity {
  if (!reviews.length) return "scaffold";
  const approved = reviews.filter((r) => r === "approved").length;
  if (approved === reviews.length) return "reviewed";
  if (approved > 0 || reviews.some((r) => r === "claim-assessed")) return "partially-reviewed";
  return "scaffold";
}

/** Stitch shortest undirected paths between successive waypoints. */
export function reportExemplar(pathway: ExemplarPathway, cites: CitationLike[] = []): ExemplarPathReport {
  const segments: ExemplarPathReport["segments"] = [];
  let missing: string | null = null;
  const allReviews: ReviewStatus[] = [];
  for (let i = 0; i < pathway.waypointIds.length - 1; i++) {
    const fromId = pathway.waypointIds[i]!;
    const toId = pathway.waypointIds[i + 1]!;
    if (!byId[fromId] || !byId[toId]) {
      missing = `Missing concept ${!byId[fromId] ? fromId : toId}`;
      segments.push({ fromId, toId, steps: null, relIds: [], reviews: [] });
      continue;
    }
    const steps = fromId === toId ? [] : shortestPath(fromId, toId, false);
    if (!steps) {
      missing ??= `No curated path ${byId[fromId]!.name} → ${byId[toId]!.name}`;
      segments.push({ fromId, toId, steps: null, relIds: [], reviews: [] });
    } else {
      const relIds = steps.map((s) => relId(s.r));
      const reviews = steps.map((s) => relationshipStatus(s.r, cites));
      allReviews.push(...reviews);
      segments.push({ fromId, toId, steps, relIds, reviews });
    }
  }
  const connected = !missing && segments.every((s) => s.steps !== null);

  const seen = new Set<string>();
  const uniqueRelIds: string[] = [];
  const edgeReviews: ExemplarPathReport["edgeReviews"] = [];
  for (const seg of segments) {
    if (!seg.steps) continue;
    for (let i = 0; i < seg.steps.length; i++) {
      const rid = seg.relIds[i]!;
      if (seen.has(rid)) continue;
      seen.add(rid);
      uniqueRelIds.push(rid);
      const review = seg.reviews[i]!;
      edgeReviews.push({ relId: rid, review, label: STATUS_INFO[review].label });
    }
  }

  // Without live cites, keep documented baseline — do not demote to scaffold from KG source refs alone.
  let maturity: ExemplarMaturity = pathway.maturity;
  if (connected && allReviews.length && cites.length > 0) {
    maturity = maturityFromReviews(allReviews);
  }

  const approvedEdgeCount = edgeReviews.filter((e) => e.review === "approved").length;

  return {
    pathway,
    segments,
    connected,
    missingSegment: missing,
    maturity,
    uniqueRelIds,
    edgeReviews,
    approvedEdgeCount,
  };
}

/** Unique relationship IDs on exemplar pathways — curator focus order, no auto-approve. */
export function exemplarQueueFocus(): {
  pathways: { pathwayId: string; title: string; relIds: string[]; maturity: ExemplarMaturity }[];
  relIds: string[];
  /** Edges still lacking approved+supports under provided cites (or all curator targets if cites empty). */
  pendingTargets: ExemplarCuratorTarget[];
} {
  const pathways = EXEMPLAR_PATHWAYS.map((p) => {
    const report = reportExemplar(p);
    const relIds = [...new Set(report.segments.flatMap((s) => s.relIds))];
    return { pathwayId: p.id, title: p.title, relIds, maturity: p.maturity };
  });
  const relIds = [...new Set(pathways.flatMap((p) => p.relIds))];
  return {
    pathways,
    relIds,
    pendingTargets: EXEMPLAR_CURATOR_TARGETS.filter((t) => relIds.includes(t.relId)),
  };
}

/** Pending Gate C targets for a pathway given live cites. */
export function pendingExemplarTargets(pathwayId: string, cites: CitationLike[]): ExemplarCuratorTarget[] {
  const pathway = EXEMPLAR_PATHWAYS.find((p) => p.id === pathwayId);
  if (!pathway) return [];
  const report = reportExemplar(pathway, cites);
  const approved = new Set(report.edgeReviews.filter((e) => e.review === "approved").map((e) => e.relId));
  return EXEMPLAR_CURATOR_TARGETS.filter((t) => t.pathwayId === pathwayId && report.uniqueRelIds.includes(t.relId) && !approved.has(t.relId));
}

/** Marketing / copy guard: never call a pathway "evidence-grounded" or fully reviewed unless maturity is reviewed. */
export function exemplarAllowsEvidenceGroundedClaim(maturity: ExemplarMaturity): boolean {
  return maturity === "reviewed";
}
