# Research rules
- Nature Immunology metadata comes from Crossref via `searchNatureImmunology` (`src/lib/research/natureImmunology.functions.ts`) with parsing in browser-safe `src/lib/research/crossref.ts`; why: no credentials or scraping, and parsing/de-duplication are unit-tested. Library proposals only seed draft literature projects — never evidence approval.
