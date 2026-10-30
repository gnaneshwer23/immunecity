-- Discovery Intelligence 3.0 appraisal sprint — additive columns for scientific appraisal
-- (orthogonal to identifier validation). Does not touch evidence_records rows / Gate C.
-- Idempotent-friendly IF NOT EXISTS. Reversible via DROP COLUMN if needed.

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS scientific_relation TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS screening_decision TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS supporting_passage TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS study_context TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS appraisal_limitations TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS question_key TEXT;

ALTER TABLE public.research_gap_evidence_links
  ADD COLUMN IF NOT EXISTS identifier_validated BOOLEAN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'research_gap_evidence_links_scientific_relation_chk'
  ) THEN
    ALTER TABLE public.research_gap_evidence_links
      ADD CONSTRAINT research_gap_evidence_links_scientific_relation_chk
      CHECK (
        scientific_relation IS NULL OR scientific_relation IN (
          'support',
          'contradict',
          'background',
          'insufficient_context'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'research_gap_evidence_links_screening_decision_chk'
  ) THEN
    ALTER TABLE public.research_gap_evidence_links
      ADD CONSTRAINT research_gap_evidence_links_screening_decision_chk
      CHECK (
        screening_decision IS NULL OR screening_decision IN (
          'include_for_sme',
          'background_only',
          'exclude_off_topic',
          'exclude_invalid_id',
          'needs_full_text'
        )
      );
  END IF;
END $$;

-- Idempotent uniqueness for (gap, question, identifier) when identifiers present.
CREATE UNIQUE INDEX IF NOT EXISTS research_gap_evidence_links_gap_q_pmid_uidx
  ON public.research_gap_evidence_links (gap_id, question_key, pmid)
  WHERE pmid IS NOT NULL AND question_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS research_gap_evidence_links_gap_q_doi_uidx
  ON public.research_gap_evidence_links (gap_id, question_key, doi)
  WHERE doi IS NOT NULL AND question_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS research_gap_evidence_links_question_idx
  ON public.research_gap_evidence_links (question_key, scientific_relation);

COMMENT ON COLUMN public.research_gap_evidence_links.scientific_relation IS
  'Per-question appraisal: support|contradict|background|insufficient_context — not identifier validation';
COMMENT ON COLUMN public.research_gap_evidence_links.identifier_validated IS
  'Structural PMID/DOI/NCT validation only; true does not mean scientific support';
COMMENT ON COLUMN public.research_gap_evidence_links.question_key IS
  'Gap/question key for this appraisal — same PMID must be re-appraised per question';
