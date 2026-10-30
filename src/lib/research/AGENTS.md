# Research rules
- Nature Immunology metadata comes from Crossref via `searchNatureImmunology` (`src/lib/research/natureImmunology.functions.ts`) with parsing in browser-safe `src/lib/research/crossref.ts`; why: no credentials or scraping, and parsing/de-duplication are unit-tested. Library proposals only seed draft literature projects — never evidence approval.

- Evidence collections (`collections.ts` + `collections.functions.ts`, Neon `evidence_collections`) store named member sets of existing graph concept ids + optional evidence_id refs; why: research organisation without KG writes (`kgWrite=false`).
- Evidence-gap labels live in browser-safe `evidenceGap.ts` and use real graph/status signals only; why: never invent Gate C density.
- Research briefs (`researchBrief.ts`) are AI/draft · unreviewed, cite retrieved ids only, fail closed on unsupported ids, and export JSON/Markdown without approving into the KG; why: reproducible, reviewable, source-traceable outputs.

