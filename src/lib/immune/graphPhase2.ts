/**
 * Phase 2 graph helpers.
 * Disease and species filters are omitted unless those fields already exist on records.
 * Edge copy keeps evidence status and drops user-facing confidence and weight.
 */
import { edgeRef, type KGEdge } from "@/lib/immune/engine";

function fieldPresent(rows: readonly object[], key: string): boolean {
  return rows.some((row) => {
    if (!row || typeof row !== "object") return false;
    if (!Object.prototype.hasOwnProperty.call(row, key)) return false;
    const value = (row as Record<string, unknown>)[key];
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  });
}

/** True only when a record already has a non-empty `disease` property. Node type DISEASE does not count. */
export function graphHasDiseaseField(nodes: readonly object[], edges: readonly object[]): boolean {
  return fieldPresent(nodes, "disease") || fieldPresent(edges, "disease");
}

/** True only when a record already has a non-empty `species` property. */
export function graphHasSpeciesField(nodes: readonly object[], edges: readonly object[]): boolean {
  return fieldPresent(nodes, "species") || fieldPresent(edges, "species");
}

export function edgeDirectionLegend(sample?: { source: string; target: string } | null): {
  key: "source → target";
  example: string | null;
} {
  const source = sample?.source?.trim();
  const target = sample?.target?.trim();
  return {
    key: "source → target",
    example: source && target ? `${source} → ${target}` : null,
  };
}

function recordedText(edge: object, keys: string[]): string | null {
  const row = edge as Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export interface EdgePanelFields {
  direction: string;
  predicate: string;
  tissue: string;
  mechanism: string;
  source: string;
  reviewer: string;
  reviewDecision: string;
  version: string;
  timestamp: string;
  evidenceStatus: string;
}

/** User-facing edge panel. Reviewer, decision, version, and timestamp say “Not recorded” when absent. */
export function edgePanelFields(edge: KGEdge, sourceName: string, targetName: string): EdgePanelFields {
  const ref = edgeRef(edge);
  const source = ref?.label || recordedText(edge, ["source", "provenance"]);
  return {
    direction: `${sourceName} → ${targetName}`,
    predicate: edge.relation,
    tissue: edge.location?.trim() || "Not recorded",
    mechanism: edge.mechanism?.trim() || "Not recorded",
    source: source || "Not recorded",
    reviewer: recordedText(edge, ["reviewer", "reviewed_by"]) ?? "Not recorded",
    reviewDecision: recordedText(edge, ["review_decision", "reviewDecision"]) ?? "Not recorded",
    version: recordedText(edge, ["version"]) ?? "Not recorded",
    timestamp: recordedText(edge, ["timestamp", "updated_at", "reviewed_at"]) ?? "Not recorded",
    evidenceStatus: edge.evidence_status,
  };
}
