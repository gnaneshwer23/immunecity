GRANT SELECT ON public.evidence_records TO anon;
CREATE POLICY "Anyone reads approved evidence" ON public.evidence_records FOR SELECT TO anon USING (curation = 'approved');