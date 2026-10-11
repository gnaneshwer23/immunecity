/* Three PRD exemplar pathways (TNF→RA, PD-1 checkpoint, type-I IFN→SLE).
   Waypoints are canonical concept IDs. Evidence maturity is honest: most edges
   still lack approved claim-linked assessments — do not market as fully reviewed. */
import { byId, shortestPath, relId, type PathStep } from "@/lib/immune/engine";
import { relationshipStatus, type ReviewStatus } from "@/lib/immune/evidenceStatus";

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
    maturity: "scaffold",
    notes: [
      "Macrophage → TNF → RA is present as curated ESTABLISHED edges in the core graph.",
      "Claim-linked approved evidence assessments are still required before calling the pathway evidence-complete.",
    ],
  },
  {
    id: "ex-pd1-io",
    title: "PD-1 / PD-L1 → cancer immunotherapy",
    purpose: "Checkpoint receptor biology linked to a clinical antibody and biomarker context.",
    waypointIds: ["R011", "R012", "B011", "I008"],
    mechanism: { startId: "R012", perturbId: "I008", outcomeId: "R011", mode: "inhibit" },
    maturity: "scaffold",
    notes: [
      "Separate cell biology, tumour context, therapeutic mechanism and trial endpoints — do not overgeneralise response rates.",
      "Pathway is a teaching scaffold pending claim-level review of each edge.",
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
      "Therapy and disease edges exist; full reviewed-support coverage is incomplete.",
    ],
  },
];

export interface ExemplarPathReport {
  pathway: ExemplarPathway;
  segments: { fromId: string; toId: string; steps: PathStep[] | null; relIds: string[]; reviews: ReviewStatus[] }[];
  connected: boolean;
  missingSegment: string | null;
}

/** Stitch shortest undirected paths between successive waypoints. */
export function reportExemplar(pathway: ExemplarPathway): ExemplarPathReport {
  const segments: ExemplarPathReport["segments"] = [];
  let missing: string | null = null;
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
      const reviews = steps.map((s) => relationshipStatus(s.r, []));
      segments.push({ fromId, toId, steps, relIds, reviews });
    }
  }
  return {
    pathway,
    segments,
    connected: !missing && segments.every((s) => s.steps !== null),
    missingSegment: missing,
  };
}
