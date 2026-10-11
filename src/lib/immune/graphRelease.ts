/* Graph release metadata — FR-001 / FR-051.
   Counts and versions must stay consistent across homepage, footer, Methods and exports. */
import kgJson from "@/data/kg.json";
import { KG } from "@/lib/immune/engine";

const raw = kgJson as {
  version?: string;
  version_notes?: string;
  product?: string;
  stats?: { total_nodes?: number; total_relationships?: number };
};

export const GRAPH_CORE_VERSION = String(raw.version ?? "0.3");
export const GRAPH_EXTENSIONS_VERSION = "draft-ext-4";
export const GRAPH_SCHEMA_VERSION = "0.3";

export interface GraphReleaseSnapshot {
  coreVersion: string;
  extensionsVersion: string;
  schemaVersion: string;
  versionNotes: string;
  coreNodes: number;
  coreRelationships: number;
  draftNodes: number;
  draftRelationships: number;
  runtimeNodes: number;
  runtimeRelationships: number;
  spineSteps: number;
  snapshotAt: string;
}

/** Deterministic snapshot of the loaded graph (no clock — stable for tests). */
export function graphReleaseSnapshot(): GraphReleaseSnapshot {
  const draftNodes = KG.nodes.filter((n) => n.draft).length;
  const draftRelationships = KG.relationships.filter((r) => r.draft).length;
  const coreNodes = KG.nodes.length - draftNodes;
  const coreRelationships = KG.relationships.length - draftRelationships;
  return {
    coreVersion: GRAPH_CORE_VERSION,
    extensionsVersion: GRAPH_EXTENSIONS_VERSION,
    schemaVersion: GRAPH_SCHEMA_VERSION,
    versionNotes: String(raw.version_notes ?? ""),
    coreNodes,
    coreRelationships,
    draftNodes,
    draftRelationships,
    runtimeNodes: KG.nodes.length,
    runtimeRelationships: KG.relationships.length,
    spineSteps: KG.core_spine.length,
    snapshotAt: `graph-${GRAPH_CORE_VERSION}+${GRAPH_EXTENSIONS_VERSION}`,
  };
}

export function graphReleaseLabel(s = graphReleaseSnapshot()): string {
  return `KG ${s.coreVersion} · extensions ${s.extensionsVersion} · ${s.coreNodes} core / ${s.draftNodes} draft concepts`;
}
