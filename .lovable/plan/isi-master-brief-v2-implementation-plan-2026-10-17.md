# ISI master brief v2 — implementation plan

The updated brief keeps what is already built (12 layers, 15-step chain, knowledge graph, evidence rules) and adds four new things: a fourth TRUST menu, a new homepage story (sections A–H), a Nature Immunology Research Library, and a stronger assistant. Work runs in the brief's phase order. Nothing is published without your go-ahead.

## Decisions already made (change any you disagree with)
- **Look:** a dark scientific opening band on the homepage only. Every other page keeps the light professional theme you approved.
- **Headline:** switch to the brief's "Understand the immune system as a connected, investigable system." with the CTAs "Explore the Immune System" and "Investigate a Mechanism".
- **Nature Immunology:** use the free, public Crossref metadata service (no key or paywall bypass). It provides titles, authors, dates, DOIs, article types and licence info, plus abstracts only when the publisher has deposited them. Every article links out to nature.com.

## Phase 1 — Baseline (short)
- Re-run tests, build and the 30-page check to record the starting point. Work through the gaps against the brief and log them in roadmap.md.

## Phase 2 — Design system and global shell
- Consolidate tokens into one documented foundation. The brief mentions `src/isi.css`, which doesn't exist yet, so it will be created and made to hold the shared tokens. Graph-specific styles stay where they are.
- Menu: Learn / Explore / Investigate / **Trust**, mapped onto existing pages with no duplicates:
  - Learn: Overview, Cell atlas, Foundations (Academy), Mechanisms
  - Explore: Graph, Dynamics, Disease, Therapy
  - Investigate: Simulator, Reasoning & AI, Research Library, Evidence, Patient
  - Trust: Methods, Evidence standards, Scientific review, Data sources and limitations (sections within Methods)
- Breadcrumbs on deep pages, active states, one page-header template and shared content widths.

## Phase 3 — Homepage A–H
- A: dark hero with the existing helix visual.
- B: a real path from entity to mechanism to disease to therapy to evidence.
- C: the 12 layers and the 15 steps, with model and evidence content labelled separately.
- D: an interactive real pathway (recognition, signalling, cytokines, activation, outcome) that opens the Inspector.
- E: Research Library teaser.
- F: Simulator, Reasoning and Patient, each with its limits stated.
- G: trust panel using verified counts only.
- H: four CTAs.
- Removes the repeated card grids.

## Phase 4 — Every existing page
- Cell atlas: search and filters, plus function, location and interaction fields.
- Mechanism: labelled stages with evidence for each step.
- Graph: clearer labels and filters, a better table view, exports kept.
- Simulator: assumptions panel and a "simulated, not observed" label.
- Disease and Therapy: established vs experimental labels.
- Patient: the evidence basis and limits behind each rule.
- Evidence: search and filters, plus honest empty states.
- Reasoning: how each answer was built, plus gaps and conflicts.
- Methods: data model, source order, review process.
- Curation: tidier layout, permissions unchanged.

## Phase 5 — Research Library (Nature Immunology)
- A new Research Library section inside Research. You can search by title, keyword and author, and filter by year, type and open access. It includes article detail views with DOI, publisher link and licence, and every article shows its source and when it was fetched.
- Shows clear loading, empty, error and "last synchronised" states.
- "Propose as evidence" creates an unreviewed candidate linked to graph concepts. It is never approved automatically.
- Saving imports and keeping import history needs the database. That is still blocked on the Neon keys, so until then the library runs live and import is documented as blocked.

## Phase 6 — Assistant and provenance
- Ask can find matching Library articles and cite them only by real DOI, labelled "source metadata, not reviewed evidence". Existing clinical refusal, limits and rate limiting stay unchanged.

## Phase 7 — QA and report
- Tests for the menu mapping, Crossref result parsing, DOI de-duplication, and "candidates never auto-approve".
- Desktop, tablet and phone checks on every page, plus build and lint.
- Final report saved as `isi-brief-v2-report.md` using the brief's 10-point format. Roadmap updated.

## Known blockers
- Sign-in, curation writes and saved imports still need Neon keys or a move to Lovable Cloud.
- Scientific approval of evidence needs expert review.

## Technical details
- Connector: `src/lib/research/natureImmunology.functions.ts` (createServerFn) calls `api.crossref.org/journals/1529-2908/works`. It validates input with zod and uses cursor paging, a 5s timeout, one retry with backoff, a polite mailto User-Agent and a 6h in-memory cache. Parsing lives in a browser-safe module so it can be unit-tested.
- Abstracts are shown only when Crossref returns them, with JATS markup stripped. No scraping of nature.com.
- Candidate evidence reuses the existing `evidence_records` shape (curation='candidate', source_type='doi') through the admin-gated functions, so it is inactive until the database is configured.
- `JOURNEY_NAV` gets a `trust` group; `NAV_GROUPS` is unchanged. AGENTS.md records the token-file and connector rules.
