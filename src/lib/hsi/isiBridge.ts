/**
 * ISI-only bridge over hsi-core.
 *
 * Keeps three axes separate (never collapsed into one score):
 * - curationReview (Gate C lifecycle)
 * - hsiGrade (shared discovery/CDS band from hsi-core)
 * - teachingStatus (KG teaching label — orthogonal to hsiGrade)
 *
 * Discovery / Ask / Methods only. Not CDS. No invented PMIDs.
 */
import {
  HSI_CURATION_LABELS,
  HSI_GRADE_INFO,
  HSI_T2D_IMMUNO_SEED_EDGES,
  buildIsiExportBundle,
  isCdsSurfacable,
  isDiscoverySurfacable,
  listBridgeCandidates,
  summarizeGradeCounts,
  type HsiEdge,
  type HsiGrade,
  type HsiTeachingStatus,
  type IsiHsiExportBundle,
} from "./hsiCorePin";
import exportSnapshot from "@/data/hsi-isi-export.json";

export const HSI_AXES_NOTE =
  "curationReview ≠ hsiGrade ≠ teachingStatus — never merge into one confidence score. ISI surfaces discovery grades only; clinic CDS stays in Aksh under HITL.";

export type HsiAxisPanel = {
  curation: { value: string; description: string };
  hsiGrade: { value: HsiGrade; description: string };
  teachingStatus: { value: HsiTeachingStatus | "unspecified"; description: string };
};

/** Orthogonal axis panel for a single HSI edge (UI / Inspector). */
export function hsiAxesForEdge(edge: HsiEdge): HsiAxisPanel {
  const curation = HSI_CURATION_LABELS[edge.curationReview];
  const grade = HSI_GRADE_INFO[edge.hsiGrade];
  const teaching = edge.teachingStatus;
  return {
    curation: { value: curation.label, description: curation.desc },
    hsiGrade: { value: edge.hsiGrade, description: grade.desc },
    teachingStatus: {
      value: teaching ?? "unspecified",
      description:
        "Optional KG teaching evidence class. Independent of Gate C curation and of hsiGrade — do not treat teaching=established as CDS-ready.",
    },
  };
}

export type IsiDiscoverySeedSummary = {
  schemaVersion: IsiHsiExportBundle["schemaVersion"];
  notCds: true;
  edgeCount: number;
  gradeCounts: Record<HsiGrade, number>;
  bridgeCandidates: number;
  cdsSurfacableCount: number;
  discoverySurfacableCount: number;
  axesNote: string;
};

/** Live summary from HSI seed pin (preferred when the package resolves). */
export function discoverySeedSummary(
  edges: readonly HsiEdge[] = HSI_T2D_IMMUNO_SEED_EDGES,
): IsiDiscoverySeedSummary {
  return {
    schemaVersion: "hsi-isi-export-1",
    notCds: true,
    edgeCount: edges.length,
    gradeCounts: summarizeGradeCounts(edges),
    bridgeCandidates: listBridgeCandidates().length,
    cdsSurfacableCount: edges.filter(isCdsSurfacable).length,
    discoverySurfacableCount: edges.filter(isDiscoverySurfacable).length,
    axesNote: HSI_AXES_NOTE,
  };
}

/**
 * Frozen JSON from `bun run hsi:sync-export` (hsi-core `export:isi`).
 * Browser-safe SSR snapshot; regenerate after seed changes — do not hand-edit PMIDs.
 */
export function loadIsiHsiExportSnapshot(): IsiHsiExportBundle {
  const snap = exportSnapshot as IsiHsiExportBundle;
  if (snap.schemaVersion !== "hsi-isi-export-1" || snap.notCds !== true) {
    // Fall back to pin export if the snapshot is corrupt.
    return buildIsiExportBundle();
  }
  return snap;
}
