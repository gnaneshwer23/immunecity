-- P0 Trial Intelligence (Master PRD P0-F03). Additive only.
-- ClinicalTrial → TrialArm → EndpointResult. Does not alter curation tables,
-- roles, community, or graph JSON. Seed rows are applied by the apply script
-- from source-verified browser-safe modules — never invented endpoints.
-- No Supabase-style anon/authenticated GRANTs (Neon app roles differ).

CREATE TABLE IF NOT EXISTS public.clinical_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id TEXT NOT NULL UNIQUE,
  graph_node_id TEXT NOT NULL,
  nct_id TEXT,
  acronym TEXT NOT NULL,
  title TEXT NOT NULL,
  phase TEXT,
  design TEXT,
  sponsor TEXT,
  status TEXT,
  condition_label TEXT,
  population_summary TEXT,
  analysis_set_note TEXT,
  verification_state TEXT NOT NULL DEFAULT 'unverified',
  primary_pmid TEXT,
  primary_doi TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clinical_trials_verification_chk
    CHECK (verification_state IN ('verified', 'partial', 'unverified')),
  CONSTRAINT clinical_trials_nct_chk
    CHECK (nct_id IS NULL OR nct_id ~ '^NCT[0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS clinical_trials_graph_node_idx
  ON public.clinical_trials (graph_node_id);
CREATE INDEX IF NOT EXISTS clinical_trials_nct_idx
  ON public.clinical_trials (nct_id);

CREATE TABLE IF NOT EXISTS public.trial_arms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arm_id TEXT NOT NULL UNIQUE,
  trial_id TEXT NOT NULL REFERENCES public.clinical_trials(trial_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  regimen TEXT NOT NULL,
  dose_schedule TEXT,
  comparator_role TEXT NOT NULL DEFAULT 'experimental',
  enrolled_n INTEGER,
  treated_n INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT trial_arms_role_chk
    CHECK (comparator_role IN ('experimental', 'active_comparator', 'placebo', 'control', 'other'))
);

CREATE INDEX IF NOT EXISTS trial_arms_trial_idx
  ON public.trial_arms (trial_id, sort_order);

CREATE TABLE IF NOT EXISTS public.endpoint_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id TEXT NOT NULL UNIQUE,
  arm_id TEXT NOT NULL REFERENCES public.trial_arms(arm_id) ON DELETE CASCADE,
  endpoint_type TEXT NOT NULL,
  label TEXT NOT NULL,
  value_num DOUBLE PRECISION,
  value_text TEXT,
  unit TEXT,
  ci_lower DOUBLE PRECISION,
  ci_upper DOUBLE PRECISION,
  p_value TEXT,
  timepoint TEXT,
  analysis_set TEXT,
  follow_up TEXT,
  population_note TEXT,
  verification_state TEXT NOT NULL DEFAULT 'unverified',
  source_pmid TEXT,
  source_doi TEXT,
  source_locator TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT endpoint_results_type_chk
    CHECK (endpoint_type IN (
      'orr', 'pfs', 'os', 'pfs_rate', 'os_rate', 'cr', 'dor', 'safety_grade_3_4', 'safety_grade_3_5', 'other'
    )),
  CONSTRAINT endpoint_results_verification_chk
    CHECK (verification_state IN ('verified', 'partial', 'unverified')),
  CONSTRAINT endpoint_results_value_chk
    CHECK (value_num IS NOT NULL OR value_text IS NOT NULL OR verification_state = 'unverified')
);

CREATE INDEX IF NOT EXISTS endpoint_results_arm_idx
  ON public.endpoint_results (arm_id, endpoint_type);
