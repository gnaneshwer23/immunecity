-- Phase B — Additive ontology mapping + graph release provenance tables.
-- Does NOT store a second knowledge graph. Curated nodes/edges remain in kg.json.
-- Does NOT alter evidence_records approvals, roles, community, or trial numerics.
-- Ontology rows must be curator-supplied (isi_id must be an existing ISI concept id).

CREATE TABLE IF NOT EXISTS public.ontology_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isi_id TEXT NOT NULL,
  system TEXT NOT NULL,
  external_id TEXT NOT NULL,
  label TEXT,
  review_status TEXT NOT NULL DEFAULT 'unreviewed',
  notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ontology_mappings_system_chk
    CHECK (system IN (
      'MeSH', 'UBERON', 'CL', 'GO', 'MONDO', 'ChEBI', 'NCBITaxon',
      'ClinicalTrials.gov', 'PubMed'
    )),
  CONSTRAINT ontology_mappings_review_chk
    CHECK (review_status IN ('unreviewed', 'approved', 'rejected')),
  CONSTRAINT ontology_mappings_isi_ext_uniq UNIQUE (isi_id, system, external_id)
);

CREATE INDEX IF NOT EXISTS ontology_mappings_isi_idx
  ON public.ontology_mappings (isi_id);
CREATE INDEX IF NOT EXISTS ontology_mappings_system_ext_idx
  ON public.ontology_mappings (system, external_id);

-- Release / review metadata for exports — not claim approval.
CREATE TABLE IF NOT EXISTS public.graph_provenance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind TEXT NOT NULL,
  isi_id TEXT,
  relationship_id TEXT,
  graph_core_version TEXT NOT NULL,
  graph_extensions_version TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT graph_provenance_entity_chk
    CHECK (entity_kind IN ('concept', 'relationship', 'release', 'ontology_mapping')),
  CONSTRAINT graph_provenance_event_chk
    CHECK (event_type IN (
      'inventory_snapshot', 'mapping_added', 'mapping_reviewed',
      'release_noted', 'neighbourhood_export'
    ))
);

CREATE INDEX IF NOT EXISTS graph_provenance_events_isi_idx
  ON public.graph_provenance_events (isi_id);
CREATE INDEX IF NOT EXISTS graph_provenance_events_rel_idx
  ON public.graph_provenance_events (relationship_id);
CREATE INDEX IF NOT EXISTS graph_provenance_events_created_idx
  ON public.graph_provenance_events (created_at DESC);
