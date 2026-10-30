-- Discovery Intelligence Phase 7 — entitlement plan stubs + team readiness notes.
-- Extends research_profiles.entitlement CHECK to include team | enterprise.
-- Does NOT activate Stripe, publish prices, collect payments, or create multi-tenant tables.
-- Does not alter evidence_records, user_roles, community, trials, or the curated graph JSON.
-- Shared profiles / collab remain code scaffolding only (see src/lib/discovery/team.ts).

ALTER TABLE public.research_profiles
  DROP CONSTRAINT IF EXISTS research_profiles_entitlement_chk;

ALTER TABLE public.research_profiles
  ADD CONSTRAINT research_profiles_entitlement_chk
  CHECK (entitlement IN ('free', 'researcher_pro', 'team', 'enterprise'));

COMMENT ON COLUMN public.research_profiles.entitlement IS
  'Discovery plan stub: free | researcher_pro | team | enterprise. Server-checked only; billing not activated. Orthogonal to account role rows.';
