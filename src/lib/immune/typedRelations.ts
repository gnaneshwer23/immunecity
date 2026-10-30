/**
 * Phase B — Typed scientific relationships (direction + polarity + context).
 * Built from the single KG: relation_semantics + edge location/mechanism fields.
 * Does not invent predicates or signs beyond what kg.json already records.
 */
import { SEM, byId, edgeByRel, human, inn, out, relId, type KGEdge } from "@/lib/immune/engine";

/** Polarity as recorded in kg.json relation_semantics. */
export type RelationPolarity = "+" | "-" | "0" | "r+" | "unknown";

export interface TypedRelation {
  relId: string;
  subjectId: string;
  objectId: string;
  predicate: string;
  predicateLabel: string;
  /** subject → object (always directional in ISI). */
  direction: "subject→object";
  polarity: RelationPolarity;
  /** Tissue / location context when recorded on the edge. */
  context: string | null;
  mechanism: string | null;
  evidenceStatus: string;
  draft: boolean;
  /** Edge-level version string when present on the raw KG record. */
  version: string | null;
}

function asPolarity(raw: string | undefined): RelationPolarity {
  if (raw === "+" || raw === "-" || raw === "0" || raw === "r+") return raw;
  return "unknown";
}

/** Polarity for a predicate from curated relation_semantics (never guessed). */
export function relationPolarity(predicate: string): RelationPolarity {
  return asPolarity(SEM[predicate]);
}

export function typeRelationship(edge: KGEdge): TypedRelation {
  const version =
    typeof (edge as { version?: unknown }).version === "string"
      ? String((edge as { version?: string }).version).trim() || null
      : null;
  return {
    relId: relId(edge),
    subjectId: edge.subject_id,
    objectId: edge.object_id,
    predicate: edge.relation,
    predicateLabel: human(edge.relation),
    direction: "subject→object",
    polarity: relationPolarity(edge.relation),
    context: edge.location?.trim() || null,
    mechanism: edge.mechanism?.trim() || null,
    evidenceStatus: edge.evidence_status,
    draft: Boolean(edge.draft),
    version,
  };
}

export function typeRelationshipById(relationshipId: string): TypedRelation | null {
  const edge = edgeByRel[relationshipId];
  return edge ? typeRelationship(edge) : null;
}

/** All typed edges incident on a concept (out + in), endpoints must exist. */
export function typedIncidentRelations(conceptId: string): TypedRelation[] {
  if (!byId[conceptId]) return [];
  const seen = new Set<string>();
  const rows: TypedRelation[] = [];
  for (const edge of [...(out[conceptId] ?? []), ...(inn[conceptId] ?? [])]) {
    if (!byId[edge.subject_id] || !byId[edge.object_id]) continue;
    const id = relId(edge);
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(typeRelationship(edge));
  }
  return rows;
}

export function listRelationPredicates(): Array<{ predicate: string; polarity: RelationPolarity; label: string }> {
  return Object.keys(SEM)
    .sort()
    .map((predicate) => ({
      predicate,
      polarity: relationPolarity(predicate),
      label: human(predicate),
    }));
}
