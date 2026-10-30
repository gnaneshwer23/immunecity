/**
 * Phase B — Ontology crosswalk stubs retaining existing ISI graph IDs.
 *
 * Rules:
 * - ISI concept id is always primary (`isiId`).
 * - External ontology IDs are added ONLY when curator-supplied (never fabricated).
 * - This file starts empty of scientific crosswalks; Neon table
 *   `ontology_mappings` (migration 0017) is the durable store for reviewed rows.
 * - Draft extensions keep their ISI ids; mapping does not rename them.
 */
export const ONTOLOGY_SYSTEMS = [
  "MeSH",
  "UBERON",
  "CL",
  "GO",
  "MONDO",
  "ChEBI",
  "NCBITaxon",
  "ClinicalTrials.gov",
  "PubMed",
] as const;

export type OntologySystem = (typeof ONTOLOGY_SYSTEMS)[number];

export type OntologyMappingReviewStatus = "unreviewed" | "approved" | "rejected";

export interface OntologyMapping {
  /** Existing ISI graph node id (C001, D012, …) — never invented. */
  isiId: string;
  system: OntologySystem;
  /** External accession as published by that ontology — curator-supplied only. */
  externalId: string;
  label?: string | null;
  reviewStatus: OntologyMappingReviewStatus;
  notes?: string | null;
}

/**
 * Browser-safe seed list. Intentionally empty of scientific crosswalks until
 * a human curator adds verified rows (via Neon backfill or explicit PR).
 * Trial NCT / PMID links for pilots live in Trial Intelligence fixtures — not here.
 */
export const ONTOLOGY_MAPPINGS_SEED: readonly OntologyMapping[] = [];

export function mappingsForIsiId(
  isiId: string,
  rows: readonly OntologyMapping[] = ONTOLOGY_MAPPINGS_SEED,
): OntologyMapping[] {
  const id = isiId.trim();
  if (!id) return [];
  return rows.filter((r) => r.isiId === id && r.reviewStatus !== "rejected");
}

export function approvedMappingsOnly(rows: readonly OntologyMapping[]): OntologyMapping[] {
  return rows.filter((r) => r.reviewStatus === "approved");
}
