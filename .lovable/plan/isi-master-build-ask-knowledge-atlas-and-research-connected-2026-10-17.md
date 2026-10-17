# ISI master build — Ask, Knowledge Atlas and Research, connected

Improve the existing app in place. The new brief adds four things on top of what is already built:
- a full Ask ISI page
- a page for each concept
- an Atlas organised into eight domains
- links that let you move between questions, concepts, pathways and papers

Your choices:
- Ask keeps one conversation in this browser.
- All 260 concepts get pages, with drafts clearly marked.
- The Research Library covers five journals.

## Phase 1 — Audit
- A short written audit against this brief. It covers what Ask, the graph, the library and the menu already do, and what is missing.
- Baseline tests and build.

## Phase 2 — Shared concept layer
- One helper gives each concept its stable ID, page address, related concepts grouped by type, and evidence status. The concept page, Ask, the Inspector and the library all use it, so links always go by ID, never by matching names.
- Domain map: each of the eight brief domains lists the existing concepts that belong to it. Uncovered topics (for example flow cytometry or single-cell sequencing) show as "not yet in the atlas" gaps. Nothing is invented.

## Phase 3 — Ask ISI page (`/ask`)
- A large question box and suggested questions grouped into Foundations, Mechanisms, Disease and Research.
- One conversation saved in this browser, with a "New conversation" button.
- Clear loading, streaming, error and retry states, plus copy-answer and open-citation actions.
- Answers link each matched concept to its own page, add "Related concepts" and "Find papers" links, and keep the existing follow-up questions.
- The existing grounding, clinical refusal, 500-character limit and rate limit are unchanged. Answers still say when evidence is missing.
- The corner Ask button stays and offers "Open full page".
- Opening `/ask?about=<concept>` pre-fills the question context (Journey B).
- Once built, Ask will be checked with a real question end to end. If the AI service isn't configured, that blocker will be reported rather than hidden.

## Phase 4 — Knowledge Atlas
- New `/atlas` landing page with the eight domains. Each domain card lists its real concepts and its known gaps, with a search box that filters all 260 concepts.
- New `/atlas/<id>` concept page, filled only where real data exists:
  - name, type and definition from the graph
  - why it matters and its place in the 15-step chain
  - its location (tissue)
  - a small diagram of its direct links
  - related cells, molecules, pathways and diseases
  - each link with its evidence status (clicking opens the evidence for that link: Journey C)
  - related papers, via a library search for its name
  - "Ask ISI about this" shortcuts
  - next steps (prerequisites and related mechanisms: Journey E)
- Draft or sparsely linked concepts show a "Draft — not curated core" notice and are hidden from search engines.
- The Inspector, graph nodes and Cell atlas cards gain an "Open concept page" link.

## Phase 5 — Research Intelligence
- The library covers Nature Immunology, Nature Reviews Immunology, Nature, Nature Medicine and Nature Microbiology. It adds a journal filter and DOI search.
- Nature Reviews titles are labelled "Review". Other articles say "Type not provided by source" instead of guessing.
- Paper details show "Possibly related concepts" linking to concept pages. These are labelled as title matches, not verified findings (Journey D).
- A note states that no endorsement or affiliation with Nature Portfolio is implied.

## Phase 6 — Navigation and homepage
- The menu adds Ask ISI and Knowledge Atlas under Learn; breadcrumbs cover the new pages.
- The homepage gains a short "Ask, Atlas, Research" strip that points to the three experiences.
- Metadata and sitemap are added for `/ask` and `/atlas`.

## Phase 7 — QA
- Tests cover:
  - concept ID links and that every concept page resolves
  - domain mapping that never lists a missing concept
  - the journal filter and review labelling
  - Ask context pre-fill
- Browser runs check Journeys A–E on desktop and phone.
- Report saved as `isi-master-build-report.md`; roadmap updated.

## Known blockers
- Saved paper imports, sign-in and curation still need the database (Neon keys or a move to Lovable Cloud).
- An evidence-grounded Ask needs approved evidence, which needs expert review.
- The "Research methods" domain has almost no graph concepts yet, so it will show as a gap.

## Technical details
- `src/lib/immune/concepts.ts` (browser-safe) exports `conceptPath(id)`, `conceptNeighbours(id)` and `DOMAINS` (domain → node IDs and gap labels), validated by tests against `kg.json` plus extensions.
- Routes: `src/routes/ask.tsx`, `src/routes/atlas.index.tsx`, `src/routes/atlas.$id.tsx`. Concept pages call `notFound()` for unknown IDs; their head() uses `seoHead` with noindex for drafts. The mini diagram is SVG, rendered server-side; the D3 graph stays lazy and client-only.
- Ask page reuses the `AskAtlas` transport and `/api/ask`. The conversation is stored under one localStorage key (`UIMessage[]`), restored after hydration, and the model and prompt are unchanged.
- Crossref: the ISSN list becomes `JOURNALS` (1529-2908, 1474-1733, 0028-0836, 1078-8956, 2058-5276). The search uses `/works?filter=issn:…`, the per-journal route or OR filters, and a DOI lookup via `/works/{doi}`. Review labelling for Nature Reviews Immunology is based on the journal.
- AGENTS.md records the concept-layer and route rules.
