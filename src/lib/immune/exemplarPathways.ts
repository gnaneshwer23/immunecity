/* Three PRD exemplar pathways (TNF→RA, PD-1 checkpoint, type-I IFN→SLE).
   Waypoints are canonical concept IDs. Evidence maturity is honest: most edges
   still lack approved claim-linked assessments — do not market as fully reviewed. */
import { byId, shortestPath, relId, type PathStep } from "@/lib/immune/engine";
import { relationshipStatus, type CitationLike, type ReviewStatus } from "@/lib/immune/evidenceStatus";

export type ExemplarMaturity = "scaffold" | "partially-reviewed" | "reviewed";

export interface ExemplarPathway {
  id: string;
  title: string;
  purpose: string;
  /** Ordered waypoints the pathway should connect. */
  waypointIds: string[];
  /** Suggested mechanism-workspace defaults. */
  mechanism?: { startId: string; perturbId: string; outcomeId: string; mode: "inhibit" | "activate" };
  maturity: ExemplarMaturity;
  notes: string[];
}

export const EXEMPLAR_PATHWAYS: ExemplarPathway[] = [
  {
    id: "ex-tnf-ra",
    title: "TNF → rheumatoid arthritis",
    purpose: "Classic inflammatory cytokine → disease, with a therapy target on the same axis.",
    waypointIds: ["C003", "M001", "D001", "I001"],
    mechanism: { startId: "C003", perturbId: "I001", outcomeId: "D001", mode: "inhibit" },
    maturity: "partially-reviewed",
    notes: [
      "Macrophage → TNF → RA on-path edges carry approved claim-linked cites (Chu / Feldmann / Lipsky).",
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
      "Separate cell biology, tumour context, therapeutic mechanism and trial endpoints — do not overgeneralise response rates.",
      "Some edges have approved support (e.g. Barber / KEYNOTE axis); full pathway claim review remains partial.",
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
      "Show where the chain is direct, indirect or still under review.",
      "A few edges reviewed (e.g. IFN→BAFF / belimumab axis); overall pathway remains scaffold-ish.",
    ],
  },
];

export interface ExemplarPathReport {
  pathway: ExemplarPathway;
  segments: { fromId: string; toId: string; steps: PathStep[] | null; relIds: string[]; reviews: ReviewStatus[] }[];
  connected: boolean;
  missingSegment: string | null;
  /** Honest maturity from approved claim cites when provided; else scaffold. */
  maturity: ExemplarMaturity;
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
  let maturity: ExemplarMaturity = pathway.maturity;
  if (connected && allReviews.length) {
    const approved = allReviews.filter((r) => r === "approved").length;
    if (approved === allReviews.length) maturity = "reviewed";
    else if (approved > 0 || allReviews.some((r) => r === "claim-assessed")) maturity = "partially-reviewed";
    else maturity = "scaffold";
  }
  return {
    pathway,
    segments,
    connected,
    missingSegment: missing,
    maturity,
  };
}

/** Unique relationship IDs on exemplar pathways — curator focus order, no auto-approve. */
export function exemplarQueueFocus(): {
  pathways: { pathwayId: string; title: string; relIds: string[] }[];
  relIds: string[];
} {
  const pathways = EXEMPLAR_PATHWAYS.map((p) => {
    const report = reportExemplar(p);
    const relIds = [...new Set(report.segments.flatMap((s) => s.relIds))];
    return { pathwayId: p.id, title: p.title, relIds };
  });
  return { pathways, relIds: [...new Set(pathways.flatMap((p) => p.relIds))] };
}
