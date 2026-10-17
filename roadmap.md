# Roadmap

- [x] Fix confirmed code-level production-audit failures (lookup, accessibility, metadata, error states, bounded pagination, and stale navigation assertions)
- [x] Re-audit public journeys after fixes: 60 page checks, zero axe/overflow/page errors; 140 unit tests; report isi-production-re-audit.md
- [ ] Verify authenticated curation, real evidence pagination, approved-source read-back and evidence-grounded Ask — blocked by existing auth/database configuration
- [ ] Owner privacy/operator and scientific claim review — requires operator and expert confirmation
- [ ] Run repository JavaScript E2E suite — blocked by unavailable runner browser; equivalent Python Playwright journeys passed

- [x] Refresh the entire app with a light professional theme and consistent page layouts
- [x] Verify light surfaces, scientific tools, navigation, and narrow-screen layouts (24 pages at desktop and phone widths; existing sign-in configuration blocker unchanged)

- [x] Launch audit: all pages and core interactions
- [x] Resolve vulnerable dependencies and rerun security checks
- [x] Record launch limitations: public educational workflows pass; evidence service is unavailable (not confirmed empty); authenticated approval writes unverified; owner and scientific review remain required

- [x] Replace header search with a unified Ask chatbot and instant concept lookup
- [x] Verify assistant opening, concept inspection, graph navigation, and header layout

- [x] Biotech-inspired overview and shared navigation refresh
- [x] Verify exploration, graph access, and narrow-screen layouts

- [x] Port all atlas pages (Overview, Cell atlas, Mechanism, Graph, Dynamics, Disease, Evidence, Patient, Reasoning)
- [x] Use uploaded stylesheet (from the Pages file)
- [x] Swap in real data (KG v0.3, CONTENT, LEGACY)
- [x] Citation curation workspace (sign-in, manifest import, PubMed/Crossref check, approve/reject)
- [x] Phase 1: approved citations on links, evidence badges, coverage panel, Suggest sources
- [x] Phase 2: microbiome, vaccines, transplantation, PID, frontier concepts + lessons/routes (draft)
- [x] Phase 3: tissue filter, link weights, patient modifiers, simulator memory/exhaustion + compare
- [x] Phase 4: graph health report, automated tests
- [x] Biomarker sliders on Patient (PD-L1, TMB, lymphocytes, eosinophils → threshold rules)
- [x] Export from Graph (Cytoscape JSON, GraphML, CSV) and Simulator (CSV, JSON)
- [x] Live metadata: ClinicalTrials.gov status on Therapy cards, UniProt proteins on Cell atlas

- [x] Credibility upgrade P1: stable relationship IDs, claim-level evidence mapping, honest coverage
- [x] P2: shared Scientific detail drawer across graph, mechanism/therapy link lists, evidence, assistant
- [x] P3: grounded assistant (relationship IDs, draft flags, clinical refusal, rate limit, 500-char cap) + tests
- [x] P4: restrained glow tokens, honest footer/coverage metrics
- [x] P5: Methods & trust page, educational banners, accessible graph table, focus rings
- [ ] Curators map approved sources to relationships (needs expert review)

## AI-native platform phases

- [x] Phase A: Positioning, evidence-grounded Copilot panel (concepts, tiers, causal chain), mechanism workspace (start → perturbation → outcome), scientific eval set skeleton
- [x] Phase A2 (PRD Epic D P0 slice): query classification, prepareAsk abstention (unsupported/omics/clinical), citation ID validation, prompt/graph trace, exemplar pathway scaffolds, hypothesis draft template, expanded eval cases, consistent core/draft version labels

### Phase plan B–E (PRD-aligned)

| Phase | Goal | Acceptance (summary) | Status |
| --- | --- | --- | --- |
| **B** Knowledge-layer gap fills | Draft nodes/edges/lessons for microbiome, vaccines, transplant, PID, **immunogenetics** with stable IDs, context, evidence_status, provenance | Extensions merge as `draft`; immunogenetics lesson/routes; extensions version bump; domain coverage + gap queue; smoke resolves new IDs | **partial** — `draft-ext-4` teaching fills + domain coverage/gap queue on Evidence; exemplar pathway claim-curation still open |
| **C** Literature intelligence | Source ID → metadata validation → claims → map relIds → conflict flags → claim approval; claim_support vocab; curation-candidate export; no fake PMIDs | Workflow module + Research UI; conflict flags; unreviewed manifest export; never auto-approve | **partial** — deepened local workflow + curation handoff; no live PubMed bulk ingest |
| **D** Model registry UI | Omics / structure / pMHC / genomics / agents as modular contracts on Research & Methods | Status badges, request-shape previews, stub dry-run → `not_available`; `implementedModels()` empty | **partial** — contracts + shape validation + promotion gate + planned molecular stubs; no live predictors |
| **E** Scientific Workbench | Question → evidence → mechanism → hypothesis → experiment proposal → review | Workbench first-class on Research; step gating; candidate imports from Ask/lit/mechanism; versioned export; never auto-promote | **partial** — step machine + Ask/lit/mechanism imports + Literature handoff + local drafts; no lab execution / KG write-back |

Machine-readable copy: `src/data/implementation-phases.ts`.

- [x] Phase B (partial): immunogenetics + thin-domain draft gap fills (`draft-ext-4`), infection↔autoimmunity lesson/routes, domain coverage report + knowledge gap queue, provenance labels
- [x] Phase C (partial): literature step machine, conflict flags, claim_support mapping, curation-candidate export + Research UI (no live PubMed bulk ingest)
- [x] Phase D (partial): modular adapter contracts, request-shape validation, promotion gate, planned molecular stubs, stub dry-run (`not_available`), registry on Research/Methods — still no live predictors
- [x] Phase E (partial): Scientific Workbench step gating, Ask/lit/mechanism candidate imports, Literature→Workbench handoff, curation-manifest import, local draft save, URL seeds, versioned export (`wb-1`) — still no lab execution or KG write-back
- [ ] Curator work: claim-linked approved evidence on the three exemplar pathways (TNF→RA, PD-1, IFN→SLE)
- [ ] Eval scale-up: grow scientific gold set toward PRD targets (≥100 questions, ≥30 path, ≥30 unsupported, safety suite)
- [ ] Live literature connectors with caching/backoff beyond existing curation PubMed/Crossref checks
- [ ] Wire any advanced model adapter only after rights + evaluation gates (keep registry honest)

## ISI master brief
- [x] Stage 1: full product audit (report in Files: isi-audit.md)
- [x] Stage 2a: navy/cyan theme, fonts, unified Learn/Explore/Investigate header
- [x] Stage 2b: duplicate addresses redirect to one page; mechanism 404; Research error fixed
- [x] Stage 3: homepage A–G (tagline unchanged — awaiting user)
- [x] Stage 4 (Phase D): Evidence fits phones; Cell atlas links cells to mechanisms + graph and flags gaps; graph/science pages have no unlabelled controls
- [x] Stage 5: end-to-end audit + fixes (report isi-audit-v2.md)
- [x] Shortened Evidence/Therapy/Research on phones; merged Reasoning + Scientific AI; one phone menu; Platform spine panel; phone footer
- [ ] Sign-in/curation: blocked on Neon keys or Cloud move

## ISI master brief v2
- [x] Trust menu group; breadcrumbs on science pages; shared `isi.css` foundation
- [x] Homepage A–H (dark opening band, interactive interferon mechanism, research, investigate tools, verified counts)
- [x] Research Library: live Nature Immunology metadata search, filters, details, paging, propose-as-candidate
- [x] Simulator assumptions panel; Ask links to library search
- [ ] Saved library imports and import history — blocked on database configuration
- [ ] Deeper per-page redesign (Cell atlas filters, Disease/Therapy established vs experimental, Patient rule evidence) — next pass

## Master build (Ask · Atlas · Research)
- [x] Concept layer, 8-domain Knowledge Atlas, a page for every concept (drafts/sparse noindex)
- [x] Full Ask ISI page: grouped suggestions, one saved conversation, copy/retry, concept-page links, ?about context
- [x] Research Library: five Nature Portfolio journals, journal filter, DOI search, Review labelling, concept links
- [x] Menu, homepage three-ways strip, sitemap, tests
- [ ] Ask answers blocked while the evidence service is unavailable (database configuration)
