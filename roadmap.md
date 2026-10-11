# Roadmap

- [x] Launch audit: all pages and core interactions
- [x] Resolve vulnerable dependencies and rerun security checks
- [x] Record launch limitations and readiness: public workflows pass; curation is empty; approval writes not exercised; expert review and AI spending safeguards remain owner launch considerations

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
| **B** Knowledge-layer gap fills | Draft nodes/edges/lessons for microbiome, vaccines, transplant, PID, **immunogenetics** with stable IDs, context, evidence_status, provenance | Extensions merge as `draft`; immunogenetics lesson/routes; extensions version bump; smoke resolves new IDs | **partial** — `draft-ext-3` deepens thin domains + infection↔autoimmunity lesson; exemplar pathway claim-curation still open |
| **C** Literature intelligence | Source ID → metadata validation → claims → map relIds → conflict flags → claim approval; claim_support vocab; curation-candidate export; no fake PMIDs | Workflow module + Research UI; conflict flags; unreviewed manifest export; never auto-approve | **partial** — deepened local workflow + curation handoff; no live PubMed bulk ingest |
| **D** Model registry UI | Omics / structure / pMHC / genomics / agents as modular contracts on Research & Methods | Status badges, request-shape previews, stub dry-run → `not_available`; `implementedModels()` empty | **partial** — deepened contracts + honesty UI; no live predictors |
| **E** Scientific Workbench | Question → evidence → mechanism → hypothesis → experiment proposal → review | Workbench first-class on Research; step gating; candidate imports from Ask/lit/mechanism; versioned export; never auto-promote | **partial** — deepened step machine + imports + export; no lab execution / KG write-back |

Machine-readable copy: `src/data/implementation-phases.ts`.

- [x] Phase B (partial): immunogenetics + thin-domain draft gap fills (`draft-ext-3`), infection↔autoimmunity lesson/routes, provenance labels
- [x] Phase C (partial): literature step machine, conflict flags, claim_support mapping, curation-candidate export + Research UI (no live PubMed bulk ingest)
- [x] Phase D (partial): modular adapter contracts, request-shape previews, stub dry-run (`not_available`), registry on Research/Methods — still no live predictors
- [x] Phase E (partial): Scientific Workbench step gating, Ask/lit/mechanism candidate imports, versioned export (`wb-1`), Research-first UX — still no lab execution or KG write-back
- [ ] Curator work: claim-linked approved evidence on the three exemplar pathways (TNF→RA, PD-1, IFN→SLE)
- [ ] Eval scale-up: grow scientific gold set toward PRD targets (≥100 questions, ≥30 path, ≥30 unsupported, safety suite)
- [ ] Live literature connectors with caching/backoff beyond existing curation PubMed/Crossref checks
- [ ] Wire any advanced model adapter only after rights + evaluation gates (keep registry honest)
