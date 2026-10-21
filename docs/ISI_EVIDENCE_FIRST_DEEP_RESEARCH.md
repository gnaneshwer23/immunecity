# ISI Evidence-First Deep Research

**Status:** Research only — docs deliverable; no master-build implementation, merge, or deploy  
**Date (UTC):** 2026-10-21  
**Workspace HEAD:** `4648cb74817f18d63d94505f50215a9bbe861b29` (`main`)  
**Architecture source:** `isi/intelligence-architecture-v1` → [`docs/ISI_INTELLIGENCE_ARCHITECTURE_V1.md`](https://github.com/gnaneshwer23/immunecity/blob/isi/intelligence-architecture-v1/docs/ISI_INTELLIGENCE_ARCHITECTURE_V1.md) (PR [#1](https://github.com/gnaneshwer23/immunecity/pull/1), open, docs-only)  
**Canonical product:** https://www.immune-super-intelligence.co.uk/  
**Confidence:** Medium–High on ISI baseline (code + Neon + dated audits); Medium on YC F26 peers (public YC listings / secondary roundups); High on category literature (peer-reviewed / official product pages)

---

## Executive summary

Immune Super Intelligence (ISI) already has the right **product skeleton** for evidence-first scientific intelligence: a typed immunology knowledge graph, relationship-level curation with identifier verification, Ask Immune grounding with clinical abstention, provisional literature labelling, and a research workbench that does not auto-write the graph. Architecture v1 (PR #1) correctly prioritises a **claim ledger**, hybrid retrieval, citation validation, bounded research agents, and honest evaluation gates.

The scientific maturity gap is not landing chrome. It is **reviewed claim density + counterevidence + citation-to-passage validation + SME-signed evaluation**. Live Neon production (queried 2026-10-21) still shows **9** distinct `approved` + `supports` relationship claims out of **46** evidence rows vs **~549** runtime relationships — Gate C remains sparse. Ask Immune is honestly labelled **partial** (graph-retrieved teaching + Gate C cites when present + provisional PubMed/Europe PMC). SME gold-set sign-off is still awaiting a human expert.

Category leaders (OpenScholar, Elicit, Consensus, scite) win on literature scale and synthesis UX; ISI’s differentiation should be **immunology mechanism graph ↔ reviewed claims ↔ researcher workflow with calibrated abstention** — not EHR admin, billing, or general medical AI post-training. YC Fall 2026 healthcare companies mostly compete in adjacent markets (clinical ops, CRO, MedTech knowledge, billing). Closest scientific-adjacent signals: **Halmos Labs** (experiment design / multi-agent research) and **CONUS** (cited domain knowledge layer). Neither owns immunology evidence-to-mechanism teaching + research workbench.

**Recommended posture after this research:** approve a 90-day evidence-first programme that starts with Gate C exemplar completion + retrieval/audit hardening + SME gold set, then hybrid retrieval / claim ledger / skeptic pass — defer Academy polish, omics adapters, vector/graph DB migration, and agent swarms until measured.

---

## Part A — Architecture v1 digest

Source: [ISI_INTELLIGENCE_ARCHITECTURE_V1.md](https://github.com/gnaneshwer23/immunecity/blob/isi/intelligence-architecture-v1/docs/ISI_INTELLIGENCE_ARCHITECTURE_V1.md) on branch `isi/intelligence-architecture-v1`, baseline SHA `4648cb7…`.

### Product objective and pillars

Become an **evidence-first scientific intelligence workspace for immunology**: learn → navigate typed KG → investigate literature → compare mechanisms → draft hypotheses → design experiments — with provenance and human review. Explicitly **not** a general chatbot, CDS, or validated biological predictor.

| Pillar | Intent |
|--------|--------|
| Immune Academy | Structured learning; distinguish finished vs scaffold |
| Immune City / Atlas | Entities, pathways, relationships, graph exploration |
| Evidence Intelligence | Discovery, verification, claim extraction, support/contradiction, curation |
| Ask Immune | Evidence-grounded QA with claim-level citations + abstention |
| Research Workbench | Question → literature → claims → mechanism → hypothesis → experiment → review |
| Scientific evaluation | Gold sets, traceability, release snapshots, expert sign-off |

### Target layers (A–G)

| Layer | Name | Essence |
|-------|------|---------|
| **A** | Source ingestion | PubMed / Europe PMC / OA full text / guidelines; canonical IDs, licence, hash, retraction status |
| **B** | Evidence & claim ledger | Claim as unit of review; polarity, context, evidence type, span, lifecycle `candidate → … → approved\|rejected` |
| **C** | Knowledge graph | Keep engine + stable `relId`s; topology ≠ evidence; support/contradiction links |
| **D** | Hybrid scientific retrieval | Intent → lexical → dense → graph → relation-aware → rerank → diversity; **no** vector/graph DB until benchmarked |
| **E** | Bounded research planner | Planner / Retriever / Assessor / Mechanism / Skeptic / Synthesiser / Validator; caps + run traces |
| **F** | Answer & citation validation | Passage/claim IDs; existence; entailment; conflict labels; fail closed on unsupported |
| **G** | Research workbench | Guided E2E; human approval before graph publication; no autonomous wet-lab |

### P0 / P1 backlog (architecture IDs)

| ID | Pri | Deliverable |
|----|-----|-------------|
| ISI-001 | P0 | Reviewed evidence retrieval hardening |
| ISI-002 | P0 | Durable curation audit history |
| ISI-003 | P1 | Shared Ask rate limiter |
| ISI-004 | P1 | Gold scientific evaluation set |
| ISI-005 | P1 | Citation-to-claim validator |
| ISI-006 | P1 | Evidence coverage dashboard |
| ISI-007 | P1 | Hybrid retrieval benchmark |
| ISI-008 | P2 | Research workbench end-to-end |
| ISI-009 | P2 | Research pilot and UX evaluation |
| ISI-010 | P2 | Release evidence report |

### 90-day sequence (architecture)

1. **D1–14:** Live reconcile, evidence predicates, audit retention, shared rate limit, baseline tests, SME for gold set  
2. **D15–30:** Trusted exemplars (TNF/RA, PD-1, IFN/SLE); contradiction + context UI; measure support/recall/abstention  
3. **D31–50:** Hybrid retrieval (benchmarked), rerank, skeptic pass, claim validation, run traces  
4. **D51–70:** Workbench completion + exports; human-gated graph publish; researcher pilots  
5. **D71–90:** Blind eval, a11y, honest capability publish, release only after gates

### Explicit non-goals (v1)

No diagnosis/treatment/CDS; no digital-twin claims without validation; no auto-approve LLM edges; no autonomous wet-lab; no agent swarm without measured need; no premature vector/graph DB; no graph expansion over source verification; no claiming unimplemented adapters.

### Mapping architecture → current Ask / Gate C / workbench

| Architecture concept | Current ISI reality (2026-10-21) |
|----------------------|----------------------------------|
| Layer B claim ledger | **Partial:** `evidence_records` + `claim_support` + `relationship_id` + approve invariants (`evidenceInvariants.ts`); not a full claim-span ledger with supersession graph |
| Layer C KG | **Shipped (beta):** `kg.json` + draft extensions; stable `REL-*` IDs; `graphReleaseSnapshot()` |
| Gate C | **Sparse:** Neon prod **9** approved+supports distinct rels / ~549 edges; curator queue + exemplar matrix in `docs/CURATOR_EVIDENCE_QUEUE.md` |
| Ask Immune (Layer D/F) | **Partial:** `askGrounding.ts` graph retrieval + query classes + clinical abstain; Neon reviewed cites; `provisionalLit.server.ts` labelled unreviewed; citation validation on stream; **not** fully evidence-grounded |
| Layer E agents | **Not shipped:** single Ask path; no skeptic/validator multi-stage planner |
| Layer G workbench | **Partial:** `workbench.ts` + `/research`; candidates only; no KG write-back |
| Eval / SME | **Incomplete:** 50 automated cases (`scientific-eval-set.ts`); `docs/SME_GOLD_SET_SIGNOFF.md` awaiting SME |
| Capability honesty | **Shipped:** `src/data/capabilityStatus.ts` |

---

## Part B — Competitor / category research

### Epistemic rules

- **Verified:** statements grounded in official YC company pages, peer-reviewed papers, or product docs with URLs.  
- **Assumption / hypothesis:** secondary blogs, inferred strategic fit, or unverified scale claims.  
- YC Fall 2026 list treated as **public directory signals**, not due-diligence-complete profiles.

### B1 — YC Fall 2026–related companies

Secondary roundup (hypothesis framing until cross-checked against YC): [ontross.com — YC Fall 2026 healthcare AI startups](https://ontross.com/blog/yc-s-fall-2026-healthcare-ai-startups) (2026-10-16). Official profiles linked below.

#### Competitor matrix

Columns: (1) Target user/use case · (2) Core capability · (3) Evidence/citation · (4) Mechanism/graph · (5) Research workflow · (6) Eval/validation · (7) UX · (8) ISI differentiation · (9) Evidence for assessment · (10) Strategic implications

| Company | 1 Target | 2 Core | 3 Evidence/cite | 4 Mechanism/graph | 5 Research workflow | 6 Eval/validation | 7 UX | 8 ISI differentiation | 9 Evidence | 10 Implications |
|---------|----------|--------|-----------------|-------------------|---------------------|-------------------|------|----------------------|------------|-----------------|
| **Archangel Health** | Frontier labs / medical AI builders; later health systems | Post-train + evaluate medical AI: de-ID EHR RL envs, physician-verified data, clinical-reasoning benchmarks | Clinical data / physician grading (not literature KG) | Not a mech KG product | Training/eval infra, not lit→hypothesis | Clinical reasoning benchmarks central | Infra / developer + health-system | ISI is **educational immunology + reviewed claims**, not EHR post-training | [YC](https://www.ycombinator.com/companies/archangel-health), [archangelhealth.ai](https://www.archangelhealth.ai/) | Learn **eval discipline** (hard cases, physician/SME labels); do **not** chase EHR RL |
| **CONUS** | Surgeons, MedTech, hospitals | Structured medical-device knowledge; AI answers with source citations | Manufacturer docs + hospital protocols + research; citation-backed answers claimed | Device/procedure knowledge layer (not immune mech graph) | Procedure/product knowledge access | Hospital deployments claimed (20 EU hospitals) | Clinical product knowledge UX | Closest **cited domain-knowledge** analogue; different vertical (devices vs immunology) | [YC CONUS](https://www.ycombinator.com/companies/conus) | Steal lesson: **one vertical knowledge layer + cited answers + institutional deployment**; stay in immunology |
| **NxtCure Labs** | Drug discovery / oncology patients | AI-native CRO + cancer patient platform | Wet-lab / CRO execution assumed | Drug discovery OS (assumption: not public mech teaching graph) | Discovery→market CRO | Industry R&D outcomes (claimed) | Dual CRO + patient app | Different business: execution CRO vs educational scientific intelligence | [YC NxtCure](https://www.ycombinator.com/companies/nxtcure-labs) | Do not divert into CRO ops; hypothesis-planning only (arch non-goal: no wet-lab execution) |
| **Halmos Labs** | Biotech R&D / process / manufacturing | Automated experiment design, sims, multi-agent research with validity checks | Literature-informed design claimed | Not immunology teaching KG | Experiment optimisation workflows | Simulation/case studies claimed (fewer evals, fermentation insight) | Research automation | Closest **research-agent** peer; ISI should stay **bounded** (arch Layer E) vs “hundreds of agents” | [YC Halmos](https://www.ycombinator.com/companies/halmos-labs) | Adopt **skeptic/validity pass + experiment plan artefacts**; reject unbounded agent swarms |
| **Saccade** | Longevity clinics / neurology pathway | VR oculomotor Alzheimer’s risk test | Biomarker/ML, not lit claims | N/A | Diagnostic pathway | Biomarker claims (need clinical validation — not verified here) | Hardware + clinic UX | Orthogonal | [YC Saccade](https://www.ycombinator.com/companies/saccade) | No product overlap; ignore for ISI roadmap |
| **Ascenix** | Skilled nursing facilities | EHR notes → reporting, reimbursement, compliance, risk | Operational documentation | N/A | Care-ops workflows | Live in 50 homes (claimed) | Clinical ops | Orthogonal admin | [YC Ascenix](https://www.ycombinator.com/companies/ascenix) | Explicit deferral: no SNF/EHR ops |
| **Kairos Health** | Dental practices | AI front desk, calls, insurance, scheduling | Practice ops | N/A | Scheduling | Practice automation | Conversational ops | Orthogonal | [YC Kairos](https://www.ycombinator.com/companies/kairos-health) | Defer |
| **Altair Health** | Independent practices | AI medical billing + policy theorem prover | Payer policy formalisation | N/A | Claims workflow | Prover-gated agent actions | Billing | Orthogonal; interesting **policy gate before agent action** pattern | [YC Altair](https://www.ycombinator.com/companies/altair-health) | Steal pattern: **validator before release** (maps to Layer F); not billing |
| **Sutrix** | Hospital research teams | EHR/wearable → study-ready datasets | Clinical data prep | N/A | Study data cleaning | 10+ institutions, 80% prep cut (claimed) | Research-ops data | Adjacent to clinical research ops, not immunology KG teaching | [YC Sutrix](https://www.ycombinator.com/companies/sutrix) | Defer EHR data prep; Tross/EHR integration not ISI core |
| **Rhem Labs** | Families / aging-at-home | Home-care companion robot + family app | Wellness readings / routines | N/A | Home care | Consumer hardware | Consumer | Orthogonal | [YC Rhem](https://www.ycombinator.com/companies/rhem-labs) | Defer |
| **Tross** (context only) | Healthtech builders needing EHR/payer APIs | Integration APIs (from roundup author) | Clinical systems | N/A | Integration | N/A | Infra | Do **not** divert ISI into admin EHR | [ontross blog](https://ontross.com/blog/yc-s-fall-2026-healthcare-ai-startups) | Mentioned only to reject scope creep |

### B2 — Category peers (scientific literature / KG / RAG / lab workflow)

| Peer | 1 Target | 2 Core | 3 Evidence/cite | 4 Mechanism/graph | 5 Research workflow | 6 Eval/validation | 7 UX | 8 ISI differentiation | 9 Evidence | 10 Implications |
|------|----------|--------|-----------------|-------------------|---------------------|-------------------|------|----------------------|------------|-----------------|
| **OpenScholar** | Scientists (multi-domain) | Retrieval-augmented synthesis over ~45M OA papers; rerank; self-feedback; citation verification | Passage retrieval + citation accuracy focus | Not immunology-typed teaching KG | Lit synthesis | ScholarQABench; citation hallucination rates documented for baselines | Research QA | ISI wins on **typed immune mechanisms + human Gate C**; OpenScholar wins on lit scale | [Nature](https://www.nature.com/articles/s41586-025-10072-4), [arXiv](https://arxiv.org/html/2411.14199) | P1: hybrid retrieval + citation-to-passage; do not claim OpenScholar-scale datastore |
| **PubMed** | Biomedical researchers | Authoritative MEDLINE search, MeSH, filters | PMID records; links to PMC/full text | N/A | Search baseline | Reproducible queries | Classic search | ISI already adapters provisional lit; PubMed remains source of truth for IDs | [PubMed](https://pubmed.ncbi.nlm.nih.gov/) | Keep PubMed as Layer A adapter; never invent PMIDs |
| **Europe PMC** | Researchers needing OA + preprints | Literature + full text / preprints / linked resources | PMCID/PMID | N/A | Discovery | Open corpus | Search | Complement PubMed for OA | [Europe PMC](https://europepmc.org/) | Keep dual provisional adapter |
| **Biomedical KGs / EvidenceNet-style** | Disease-specific reasoning researchers | Evidence nodes from full text with provenance & quality scores | Structured evidence records | Disease KGs | Extraction → QA | Technical validation metrics reported in paper | Research datasets | ISI already has typed immune KG; should deepen **evidence-as-nodes**, not flatten triples | [arXiv EvidenceNet](https://arxiv.org/abs/2603.28325v2); MedGraphRAG [ACL](https://aclanthology.org/2025.acl-long.1381/) | Aligns with arch Layer B; human review mandatory (checkpoint KG paper in arch §2) |
| **Elicit** | Systematic reviewers / researchers | Screening, extraction, review workflows | Quote-backed extractions; search sensitivity limits in independent eval | N/A | Systematic review stages | Independent: ~39.5% search sensitivity vs librarian searches; higher precision | Review workspace | ISI is mechanism teaching + claim-linked graph, not full SR platform | [PMC 12483133](https://pmc.ncbi.nlm.nih.gov/articles/PMC12483133/), [PMC 12462964](https://pmc.ncbi.nlm.nih.gov/articles/PMC12462964/) | Lesson: **human verification required**; high precision adjunct ≠ replace gold search |
| **Consensus** | Rapid evidence direction | Synthesised answers + agreement meter (category descriptions) | Paper-backed synthesis | N/A | Quick Q&A | Library comparisons exist | Simple Q&A | ISI should prefer **conflict surfaces** over agreement meters alone | [HKUST library note](https://library.hkust.edu.hk/news-events/news/trust-ai-evaluating-scite-elicit-consensus-and-scopus-ai-generating-literature) | Add counterevidence UI (arch skeptic) |
| **scite** | Researchers checking citation context | Smart Citations: supporting / contrasting / mentioning | 1.6B+ citation statements (vendor claim) | Citation graph | Reference check / assistant | Large classified citation index | Citation intelligence | ISI claim_support polarity is **edge-local**; scite is **citation-statement** scale | [scite features](https://scite.ai/features), [coverage](https://scite.ai/coverage) | P1 inspiration: contrast/support display; optional later API — not a substitute for Gate C |
| **Semantic Scholar** | Broad academic search | Free scholarly graph, TLDRs, APIs | Metadata + citations | Citation graph | Discovery | Open Academic Graph | Search | Infrastructure peer | Category reviews / product | Optional discovery adapter later |
| **Protocols.io** | Labs sharing methods | Versioned protocols / SOPs | Method provenance | N/A | Method library | Reproducibility focus | Protocol UX | ISI experiment plans are **hypothesis-linked**, not ELN SOPs | [protocols.io](https://www.protocols.io/) | P2: export experiment plans compatible with protocol culture; do not build ELN |
| **Labguru** | Life-science labs | ELN + LIMS + inventory | Lab execution records | N/A | Wet-lab ops | Enterprise lab informatics | Lab platform | Arch non-goal: no wet-lab execution | [Labguru](https://www.labguru.com/eln) | Explicit deferral |

### Cross-cutting competitor lessons

1. **Citation existence ≠ support.** OpenScholar and library audits show hallucinated / unsupported citations are the failure mode to beat.  
2. **AI literature tools need human gates.** Elicit independent evals: useful adjunct, insufficient alone.  
3. **Vertical knowledge + citations ships.** CONUS shows institutional adoption for a narrow knowledge layer.  
4. **Agents need validators.** Halmos (validity), Altair (prover) → ISI Layer E/F.  
5. **Do not chase admin healthcare.** Billing, dental ops, SNF, home robots dilute scientific maturity.

---

## Part C — ISI baseline refresh (readonly)

### Verified HEAD / deploy posture

| Item | Value | Source |
|------|-------|--------|
| Local / research branch base | `4648cb7` Cap graph detail grid… | `git rev-parse HEAD` 2026-10-21 |
| Architecture PR | [#1](https://github.com/gnaneshwer23/immunecity/pull/1) OPEN, docs-only | `gh pr view 1` |
| Canonical | https://www.immune-super-intelligence.co.uk | Brand / audit |
| Last full RELEASE_AUDIT | 2026-10-12; educational-beta **GO**; Gate C **PARTIAL** | `docs/RELEASE_AUDIT.md` |
| SME gold set | **Awaiting SME** | `docs/SME_GOLD_SET_SIGNOFF.md` |

### Neon production (live query 2026-10-21)

Project `immunecity` / branch `production` (`br-super-sea-b5pre85r`):

| Metric | Count |
|--------|------:|
| `evidence_records` total | **46** |
| `approved` + `supports` rows | **9** |
| Distinct approved+supports `relationship_id` | **9** |
| `unreviewed` | **34** |
| `claim_support = contradicts` rows | **0** |

**Do not invent coverage % beyond this.** Relative to ~549 runtime relationships from release snapshot/docs: Gate C remains ~1.6% if denominator unchanged — reconfirm edge count via `graphReleaseSnapshot()` at next release, do not treat as permanent.

### Gate C / Ask / workbench posture

| Area | State | Notes |
|------|-------|-------|
| Gate C | **Incomplete / sparse** | TNF→RA on-path reviewed; PD-1 partial; IFN→SLE scaffold (BAFF detour ≠ IFN spine). Queue: `docs/CURATOR_EVIDENCE_QUEUE.md` |
| Ask Immune | **Partial** | Graph grounding + provisional lit; capability id `ask-atlas`; prompt `ask-grounding-v5` |
| Counterevidence path | **Gap** | `contradicts` vocabulary exists; **0** contradict rows in prod; UI path for skeptic incomplete vs arch |
| Rate limit | **Residual** | In-memory (`ASK_RATE_LIMIT_BACKEND`); shared limiter deferred (IC-15) |
| Workbench | **Partial** | Guided artefacts; no auto KG write-back |
| Academy | **In development** | Foundation navigable; intermediate scaffold |
| Omics adapters | **Planned** | `implementedModels() === []` |
| Eval harness | **Existing / incomplete** | 50 smoke cases; SME unsigned |
| Capability registry | **Existing** | `capabilityStatus.ts` |

### Inventory: Existing / Incomplete / Proposed

#### Existing (shipped, honest)

- Typed KG + draft extensions; Graph / Atlas / Inspector  
- Neon Auth + admin-gated curation; approve invariants; identifier check  
- `getApprovedCitations` public filter  
- Ask grounding, clinical/omics abstention, citation validation, provisional lit labelling  
- Research literature workflow (local) + workbench candidates  
- Graph release snapshot counts on trust surfaces  
- Capability status registry  
- Automated scientific eval starter (50) + Ask-focused vitest guidance  
- Architecture v1 document on PR branch (not merged)

#### Incomplete (partial / residual)

- Gate C exemplar coverage (PD-1, IFN spine)  
- SME gold-set sign-off  
- Shared/distributed Ask rate limiting  
- Contradiction / counterevidence curation + Ask surface  
- Citation-to-**passage** / claim-span validation (ID validation exists; entailment incomplete)  
- Hybrid retrieval (lexical/dense/rerank) beyond graph + provisional lit  
- Workbench export completeness / researcher pilot metrics  
- Human a11y / CWV sign-off  
- Academy curriculum depth  
- Audit history defence-in-depth vs arch ISI-002 (table exists; verify append-only under all roles)  
- Dual public URL honesty (Lovable residual in audit)

#### Proposed (architecture / this research — not claimed shipped)

- Full Layer B claim ledger (spans, supersession, invalidate-on-edit lifecycle)  
- Layer D hybrid retrieval benchmark + optional dense index  
- Layer E bounded multi-role research planner with run traces  
- Layer F claim entailment validator + fail-closed release  
- Evidence coverage live dashboard (ISI-006)  
- Trusted exemplar programmes with measured recall/support  
- Optional scite-like contrast views / relation-aware retrieval (SciNet-inspired)  
- Gold set expansion to 100+ with SME ownership

---

## Part D — Target architecture deltas vs v1

Architecture v1 remains the right north star. This research proposes **deltas of emphasis**, not a rewrite:

| Delta | Why | vs v1 |
|-------|-----|-------|
| **Gate C exemplar density before hybrid infra** | Competitors show synthesis UX without reviewed mechanism edges; ISI’s unique asset is the typed graph — sparse Gate C undercuts credibility | Strengthens Days 15–30; elevates curator work as P0 science |
| **Counterevidence as first-class (not later)** | Prod has **0** contradict rows; Consensus/scite win on contrast; arch Skeptic needs data | Pull contradiction path into P0/P1 alongside supports |
| **Claim ledger MVP on Neon (not greenfield)** | Extend `evidence_records` + audit events toward span/context fields; avoid new platform | Layer B via migrations, matching §5 technology choices |
| **Benchmark-gated dense retrieval** | OpenScholar lesson; arch already warns against premature vector DB | Keep ISI-007 as hard gate before infra spend |
| **Bounded agents only after validator** | Halmos-scale agents are a trap without Layer F | Sequence: F/citation validator → then E skeptic pass |
| **Explicit reject EHR/ops peers** | YC F26 majority is ops/billing/devices | Add to non-goals / deferrals list |
| **Marketing language lock** | Audit: do not claim “evidence-grounded scientific AI” until Gate C + SME | Align capabilityStatus + homepage copy (already partial) |

No change recommended to: React/TanStack stack, Neon primary store, JSON graph initial strategy, educational-beta clinical non-goals.

---

## Part E — Prioritised technology enhancements (scientific maturity)

### P0 — Must-build for evidence-first credibility

| # | Enhancement | Arch § | Competitor lesson | Current ISI file/capability | Effort | Risk | Success metric |
|---|-------------|--------|-------------------|----------------------------|--------|------|----------------|
| P0.1 | Finish Gate C on P0 exemplars (PD-1 remaining + IFN spine); honest maturity badges | §8 D15–30; ISI-001 | CONUS: vertical cited knowledge; OpenScholar: cites must be real | `CURATOR_EVIDENCE_QUEUE.md`, `/curation`, `exemplarPathways.ts` | M (human science + eng support) | Scientific error if rushed | On-path approved+supports for PD-1 + IFN waypoints; Neon distinct approved rels ↑ with documented PMIDs |
| P0.2 | Reviewed-evidence retrieval hardening + regression tests | ISI-001 §6 | Altair-style gate before action | `citations.functions.ts`, Ask stream, `evidenceInvariants.ts` | S–M | Silent wrong cite | Only approved+supports in answer support path; contradicts via separate path; tests green |
| P0.3 | Durable audit history verification (append-only under app roles) | ISI-002 | Lab evidence integrity | `evidence_audit_events`, drizzle schema | S | History wipe | Delete/update cannot erase decisions; role tests |
| P0.4 | SME gold-set sign-off + attach smoke SHA | ISI-004 §7 | Archangel: hard-case eval | `SME_GOLD_SET_SIGNOFF.md`, `scientific-eval-set.ts` | S eng + SME time | Fake sign-off | Named SME acceptance on SHA |
| P0.5 | Counterevidence path MVP (curate ≥N contradict/partial displays on exemplars) | Layers B/F/E Skeptic | scite / Consensus contrast | `claim_support` vocab; Ask UI | M | Empty UI theatre | ≥1 contradict/partial surfaced on Ask/reasoning for an exemplar; Neon contradict > 0 where true |

### P1 — Platform tech

| # | Enhancement | Arch § | Competitor lesson | Current ISI | Effort | Risk | Success metric |
|---|-------------|--------|-------------------|-------------|--------|------|----------------|
| P1.1 | Citation-to-claim / passage validator | ISI-005 Layer F | OpenScholar attribution | Citation ID checks exist | M–L | Latency/cost | Material claims map to span or reviewed claim ID; unsupported fail closed |
| P1.2 | Hybrid retrieval benchmark (graph+BM25 vs +dense) | ISI-007 Layer D | OpenScholar / SciNet | Graph + provisional lit | M | Premature infra | Decision memo with recall@k / cost; no vector DB unless win |
| P1.3 | Shared atomic Ask rate limiter | ISI-003 | Abuse resilience | In-memory residual | S–M | Ops deps | Cross-instance limit verified |
| P1.4 | Claim ledger schema extensions (context, span, supersedes) | Layer B | EvidenceNet | `evidence_records` | M | Migration risk | Versioned migration; approvals invalidate on span/context edit |
| P1.5 | Skeptic / counterevidence pass for complex synthesis | Layer E | Halmos validity; SciNet | Single Ask path | M | Cost / hallucination | Run trace shows skeptic step; measured contradiction recall on gold set |
| P1.6 | Evidence coverage dashboard (live Neon vs snapshot) | ISI-006 | Honesty | Release audit dated counts | S–M | Wrong denom | Live approved vs mapped vs runtime edges |
| P1.7 | Structured Ask run traces + cost/latency budgets | Layer E/F | OpenScholar observability | `AskTrace` partial | M | PII in logs | Trace persisted (redacted); p50/p95 reported |

### P2 — Research workbench / Academy / UX

| # | Enhancement | Arch § | Competitor lesson | Current ISI | Effort | Risk | Success metric |
|---|-------------|--------|-------------------|-------------|--------|------|----------------|
| P2.1 | Workbench E2E export (evidence table + hypothesis + experiment + curation manifest) | ISI-008 Layer G | Elicit review artefacts; Protocols culture | `workbench.ts` | M | Feature sprawl | Versioned export used in pilot |
| P2.2 | Researcher pilot (n≥5 immunology learners/researchers) | ISI-009 | CONUS surgeon co-design | `/research`, `/ask` | M | Recruit | Task completion + defect list |
| P2.3 | Academy content depth (foundation complete; intermediate beyond scaffold) | Pillar 1 | Teaching differentiation | `academyCurriculum.ts` | L content | Divert eng from Gate C | Capability status upgrade only when true |
| P2.4 | Human a11y / keyboard / contrast pass | §6 | Trust | Automated partial | S human | Cosmetic delay | Signed a11y note |
| P2.5 | Release evidence report template (SHA, Neon, gates) | ISI-010 | Archangel eval infra spirit | `RELEASE_AUDIT.md` | S | Stale reports | Per-candidate SHA report |

### Explicit deferrals

| Defer | Reason |
|-------|--------|
| EHR / billing / dental / SNF / home-care products | YC F26 adjacency; not scientific maturity |
| Tross-style EHR integration | Admin diversion |
| Wet-lab execution / CRO | Arch non-goal; NxtCure/Halmos lane |
| Unbounded multi-agent swarms | Halmos-scale without validators |
| Vector DB / graph DB migration | Until ISI-007 fails baseline |
| Omics / molecular model registry go-live | Planned stubs; no fake scores |
| Mass graph expansion / mass Gate C approve | Integrity risk |
| Claiming “evidence-grounded scientific AI” in marketing | Until Gate C breadth + SME |
| Building a full ELN (Labguru competitor) | Out of scope |
| Master build / merge PR #1 / prod deploy as part of this research | User forbid |

---

## 90-day backlog (refreshed)

Aligned to architecture §8 with research emphasis:

| Window | Focus | Exit criteria |
|--------|-------|---------------|
| **Days 1–14** | Integrity + baseline | Neon reconcile (done this doc for counts); ISI-001/002 tests; rate-limit plan; SME scheduled; release baseline SHA report |
| **Days 15–30** | Exemplar Gate C + counterevidence | PD-1 + IFN P0 edges claim-linked or explicitly blocked with rationale; contradict/partial UI; coverage dashboard v0 |
| **Days 31–50** | Ask scientific quality | Citation-to-claim validator MVP; skeptic pass on complex class; hybrid retrieval **benchmark** (decide infra); run traces |
| **Days 51–70** | Workbench + pilots | Exportable workflow; 5-user pilot; no auto graph write |
| **Days 71–90** | Eval + honest release | SME-signed gold set; blind holdout; a11y note; capability copy update; release only if proposed gates met |

---

## Recommended “start here” first sprint (after research approval)

**Sprint goal:** Make ISI’s scientific honesty *demonstrably* stronger on exemplars — without new platforms.

1. **Curator P0 pass** on `docs/CURATOR_EVIDENCE_QUEUE.md` ordered actions (Chemnitz reassessment → PD-1 biomarker edges → IFN spine). No invented PMIDs.  
2. **Engineering:** regression tests for reviewed-evidence predicates + contradiction separation (ISI-001).  
3. **Engineering:** verify `evidence_audit_events` append-only / role restrictions (ISI-002).  
4. **Ops/product:** schedule named SME for `SME_GOLD_SET_SIGNOFF.md`; attach `smoke-prd-a2` output + SHA.  
5. **UX (small):** surface Gate C vs provisional lit more clearly on Ask/reasoning; show partial/contradict when present.  
6. **Decision memo only:** hybrid retrieval benchmark plan (no vector DB purchase yet).

**Out of sprint:** Academy redesign, omics, agent swarm, merge architecture PR unless docs-only merge is desired separately, production marketing claim upgrades.

---

## Top 5 next big things (parent summary)

1. **Gate C exemplar completion** — reviewed claim density on PD-1 and IFN→SLE (science P0).  
2. **Citation-to-claim / passage validation + fail-closed Ask** — match OpenScholar-grade integrity expectations.  
3. **Counterevidence / skeptic path** — first-class contradicts/partial in ledger + Ask (scite/Consensus lesson).  
4. **Hybrid retrieval benchmark → measured upgrade** — graph + lit + optional dense/rerank only if metrics win.  
5. **SME-signed evaluation + bounded research planner** — gold set sign-off, then Layer E tools with run traces (not unbounded agents).

---

## Sources

### ISI internal

- Architecture v1: https://github.com/gnaneshwer23/immunecity/blob/isi/intelligence-architecture-v1/docs/ISI_INTELLIGENCE_ARCHITECTURE_V1.md  
- PR #1: https://github.com/gnaneshwer23/immunecity/pull/1  
- `docs/RELEASE_AUDIT.md`, `docs/CURATOR_EVIDENCE_QUEUE.md`, `docs/SME_GOLD_SET_SIGNOFF.md`, `docs/ASK_IMMUNE_EVALS.md`  
- `src/data/capabilityStatus.ts`, `src/lib/askGrounding.ts`, `src/lib/immune/evidenceInvariants.ts`, `src/lib/research/workbench.ts`  
- Neon production SQL 2026-10-21 (project `autumn-snow-67879321`, branch `production`)

### Architecture research basis (from v1)

- DeepEvidence (Nature MI 2026): https://www.nature.com/articles/s42256-026-01266-0  
- OpenScholar (Nature 2025/2026): https://www.nature.com/articles/s41586-025-10072-4  
- Immune-checkpoint KG extraction (Frontiers 2026): https://www.frontiersin.org/journals/immunology/articles/10.3389/fimmu.2026.1937268/full  
- SciNet: https://proceedings.mlr.press/v306/shao26h.html  
- BioMedAgent: https://www.nature.com/articles/s41551-026-01634-6  
- BTE-RAG: https://pmc.ncbi.nlm.nih.gov/articles/PMC12324469/

### YC / companies

- YC Healthcare directory: https://www.ycombinator.com/companies/industry/Healthcare  
- Archangel, CONUS, NxtCure, Halmos, Saccade, Ascenix, Kairos, Altair, Sutrix, Rhem — linked YC company pages above  
- Secondary roundup: https://ontross.com/blog/yc-s-fall-2026-healthcare-ai-startups  

### Category peers

- Elicit evaluations: https://pmc.ncbi.nlm.nih.gov/articles/PMC12483133/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC12462964/  
- scite: https://scite.ai/features  
- EvidenceNet: https://arxiv.org/abs/2603.28325v2  
- MedGraphRAG: https://aclanthology.org/2025.acl-long.1381/  
- Protocols.io: https://www.protocols.io/  
- Labguru: https://www.labguru.com/eln  
- PubMed / Europe PMC: https://pubmed.ncbi.nlm.nih.gov/ , https://europepmc.org/

---

## Methodology

- Read architecture v1 via `git fetch` + `git show` (no merge).  
- Readonly codebase + docs audit; Neon `run_sql` count query only.  
- Web research via Cursor WebSearch/WebFetch on YC pages and peer literature (2026-10-21).  
- Distinguishes verified vs assumed; does not invent Gate C coverage beyond Neon + dated docs.  
- **No** production code changes, **no** `vercel --prod`, **no** PR merge.

---

*End of research deliverable.*
