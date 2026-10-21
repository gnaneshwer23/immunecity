# Professional presentation review

**Date:** 2026-10-21 · **Scope:** public site presentation and trust signals (not evidence/curation maturity — see `ISI_EVIDENCE_FIRST_DEEP_RESEARCH.md`).
**Method:** live-site audit at 1440px and 375px (home, Atlas, concept page, Ask, About), head/metadata inspection, code read, and a check against published credibility frameworks.

## What the research says readers and search engines look for

| Framework | Signals it rewards |
|---|---|
| [Stanford Web Credibility guidelines](https://credibility.stanford.edu/guidelines) | Easy to verify sources, a real organisation and people behind the site, signs it is kept up to date |
| [CADTH: evaluating health websites](https://www.cda-amc.ca/sites/default/files/pdf/CADTH_credible_websites_onepager.pdf) / JAMA benchmarks | A named author, institution or editor, attribution, disclosure, dated updates |
| Google's E-E-A-T approach to health ("Your Money or Your Life") pages ([summary](https://lseo.com/blog/vertical-specific-aeo-b2b-saas-ymyl-and-local/the-reviewed-by-tag-implementing-expert-attribution-in-aeo/)) | A visible expert reviewer, the reviewer's credentials, a last-reviewed date, structured data that matches what readers can see |
| Scientific databases ([Reactome cite page](https://reactome.org/cite), [linking guide](https://reactome.org/linking-to-us)) | A suggested citation for each entry, version numbers, stable IDs, links to external databases |

ISI already does the hard part well: it labels its own uncertainty honestly, gives every concept a stable graph ID, separates draft from reviewed content, and states its limits clearly. The weak point is how it presents itself: until now, none of the signals above were visible on the page.

## Findings and status

### Shipped on `feat/professional-trust-signals`
1. **No share image.** `og-image.jpg` existed, but `seoHead` only emitted it when a page passed an image, and no page did, so shared links had no preview card. → Every page now gets a default branded 1200×630 card (the hero illustration plus the wordmark), with dimensions and alt text set.
2. **No "how to cite" on concept pages.** → Added a "Cite this page" block that shows the graph release and the canonical URL, with a copy button. It also tells readers to cite primary literature for scientific claims.
3. **No structured data on concept pages.** → Each indexable `/atlas/$id` page now emits schema.org `DefinedTerm` data (aliases, graph ID as `termCode`, a `DefinedTermSet` with the graph version and publisher). Draft and sparsely linked pages emit none, so they stay out of search, as before.
4. **Machine-sounding "In short" copy.** It used to read "a molecule in molecules and receptors" and "mostly 1 cell, 2 receptor, 3 tissue". Those types came in a fixed order, so for TNF it skipped the 4 therapies, its largest group. → It now reads correct English, ranks types by count, and links the Atlas domain.
5. **Hydration mismatch on every concept page.** The mini diagram's coordinates came out slightly different on the server and in the browser (React logged a hydration error). → The coordinates are now rounded.
6. **No named person or editorial responsibility.** The founder appeared only through a YouTube link. → Added an About section, "Who stands behind the content", that names the editor and explains what review means. **Needs your sign-off. It is a separate commit, so you can drop it.**

### Recommended next (not done here)
- **Last-reviewed dates on concept pages.** Show a real `reviewed_at` from Neon when one exists. Never make up a date. This needs a data field, not just copy.
- **External identifier cross-links.** Map nodes to UniProt, HGNC, Cell Ontology, MeSH or MONDO, and to DrugBank or ChEMBL for therapies. This is the strongest "real scientific resource" signal and helps search engines connect the entities. It needs curation, so the IDs should go in KG/extension data, not code.
- **One font provider.** The site loads General Sans from Fontshare plus Inter and JetBrains Mono from Google, which means three families and two render-blocking origins. Self-hosting them, or dropping General Sans, would improve page-load speed (LCP) and make rendering more consistent.
- **Homepage language.** The "Brand & platform: The world, and the intelligence that navigates it" and "Fifteen stages / twelve layers" sections read as internal architecture. Readers come for the TNF → RA pathway demo and the Atlas. Consider moving the architecture to /platform and leading with an Atlas search box.
- **Concept prose density.** Some `desc` and `clinical_relevance` text reads like shorthand notes ("anti-TNF → TB/fungal reactivation, mandatory LTBI screening…"). An editorial pass on the 20 most-visited concepts would help most.
- **Release notes page.** `graphReleaseSnapshot()` already exists. A public changelog would show the site is maintained, which credibility research rewards.
- **Person JSON-LD.** Once the editorial section is approved, add `founder` / `editor` to the Organization JSON-LD so it matches the visible text.
