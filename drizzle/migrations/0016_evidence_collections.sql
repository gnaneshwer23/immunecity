-- Phase 4 Research Workbench — evidence collections (additive).
-- Named member collections of existing graph concept ids + optional evidence_id refs.
-- Does not alter curated citation rows, role rows, community, trials, or graph JSON.
-- No Supabase-style anon/authenticated GRANTs (Neon app roles differ).

CREATE TABLE IF NOT EXISTS public.evidence_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  concept_ids TEXT[] NOT NULL DEFAULT '{}',
  evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidence_collections_name_len CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT evidence_collections_concepts_len CHECK (cardinality(concept_ids) BETWEEN 1 AND 40),
  CONSTRAINT evidence_collections_refs_len CHECK (cardinality(evidence_refs) <= 40)
);

CREATE INDEX IF NOT EXISTS evidence_collections_user_idx
  ON public.evidence_collections (user_id, updated_at DESC);
