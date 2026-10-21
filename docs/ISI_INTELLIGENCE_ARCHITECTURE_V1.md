# ISI Intelligence Architecture v1 — Evidence-First Scientific Intelligence

**Status:** Proposed architecture and implementation plan  
**Target:** Immune Super Intelligence (ISI) / Immune City  
**Baseline:** Repository `main` at `4648cb74817f18d63d94505f50215a9bbe861b29`  
**Principle:** Build on the existing product. Do not replace working foundations or claim capability before it is implemented and evaluated.

## 1. Product objective

ISI should become an evidence-first scientific intelligence workspace for immunology: users can learn the immune system, navigate a typed knowledge graph, investigate literature, compare mechanisms, draft hypotheses, and design follow-up experiments with transparent provenance and human review.

It is not a general-purpose chatbot, an autonomous clinical decision-maker, or a validated biological predictor. Initial value should come from reliable scientific retrieval, relationship-level evidence, reproducible reasoning, and excellent researcher workflows.

### Product pillars

1. **Immune Academy** — structured learning and assessments, clearly distinguishing finished lessons from scaffolding.
2. **Immune City / Atlas** — searchable immune entities, pathways, relationships, context and graph exploration.
3. **Evidence Intelligence** — paper discovery, source verification, claim extraction, support/contradiction assessment and curation.
4. **Ask Immune** — evidence-grounded question answering with sentence/claim-level citations and calibrated abstention.
5. **Research Workbench** — question → literature → claims → mechanism → hypothesis → experiment plan → human review.
6. **Scientific evaluation** — reproducible test sets, source traceability, release snapshots and expert sign-off.

## 2. Research basis and design implications

Use the following work as design inputs, not as proof that ISI already has comparable performance:

- **DeepEvidence, Nature Machine Intelligence (2026):** coordinated breadth-first and depth-first evidence exploration and an incrementally built evidence graph. Implication: use bounded research planning with traceable intermediate results rather than a single opaque prompt. https://www.nature.com/articles/s42256-026-01266-0
- **OpenScholar, Nature (2025):** specialised scientific retrieval, reranking, citation-aware synthesis and iterative verification. Implication: retrieval quality and citation-to-passage alignment are first-class systems, not prompt-only features. https://www.nature.com/articles/s41586-025-10072-4
- **Immune-checkpoint KG extraction benchmark, Frontiers in Immunology (2026):** independently prompted models can produce highly divergent graphs; consensus is a precision–coverage control, not a guarantee. Implication: never auto-approve extracted triples, measure disagreement, and use expert review plus source evidence. https://www.frontiersin.org/journals/immunology/articles/10.3389/fimmu.2026.1937268/full
- **SciNet (2026):** relation-aware literature retrieval is materially different from similarity-only retrieval. Implication: retrieve corroborating, contradictory and lineage-related papers and reconstruct evidence paths. https://proceedings.mlr.press/v306/shao26h.html
- **BioMedAgent, Nature Biomedical Engineering (2026):** tool-aware workflows can support complex biomedical analyses. Implication: future agents should invoke validated tools through typed contracts, with bounded permissions and reproducible logs. https://www.nature.com/articles/s41551-026-01634-6
- **BTE-RAG:** federated biomedical knowledge sources can ground answers in explicit mechanisms. Implication: add external authoritative sources incrementally and retain source-specific provenance. https://pmc.ncbi.nlm.nih.gov/articles/PMC12324469/

## 3. Current repository baseline and known constraints

The existing repository already contains a typed knowledge graph, core/draft separation, graph release metadata, Ask Immune grounding and query classes, provisional literature retrieval, evidence curation records, relationship-level support assessment, research workflow modules, a model registry scaffold, smoke tests and accessibility checks.

The existing release report describes approximately 549 runtime relationships and 9 approved supporting relationship claims at the time of that report (about 1.6% coverage). Treat this as a dated baseline to re-query, not a permanent metric. It also reports that the molecular model registry is not live, the Academy is incomplete, the research workbench does not write directly into the graph, rate limiting is in-memory, and human accessibility and SME sign-off remain open.

Before feature expansion:
1. Reconcile the release report with the current production database and deployment SHA.
2. Run the existing build, lint, unit, smoke and E2E suites on the exact candidate commit.
3. Verify production and development database separation and migration state.
4. Do not represent a documented test, model adapter or workflow as passing until it is executed on the current baseline.

## 4. Target architecture

### 4.1 Layer A — source ingestion

Inputs: PubMed / Europe PMC metadata and abstracts, open-access full text where licence permits, approved guidelines, curated pathway resources, and user-provided papers.

Each source record should carry:
- canonical source ID (PMID, DOI, PMCID or provider ID);
- title, authors, journal, date, source URL and retrieval timestamp;
- licence/access status and source version;
- full-text/abstract-only status;
- content hash and ingestion pipeline version;
- retraction/correction status where available.

Use provider-specific adapters behind a common interface. Respect API limits, licensing and robots/terms. Store raw source snapshots separately from derived claims. Deduplicate by canonical identifiers and content hash.

### 4.2 Layer B — evidence and claim ledger

Make a claim the unit of scientific review, not the paper or entity alone. A claim should contain:
- subject, predicate, object and human-readable assertion;
- polarity (supports / contradicts / uncertain);
- biological context (species, cell type, tissue, disease, stimulus, dose/time where relevant);
- evidence type (in-vitro, in-vivo, human observational, clinical trial, systematic review, guideline, computational, expert hypothesis);
- source and exact supporting passage/span;
- extraction model/prompt/version and confidence (never treated as truth);
- independent identifier verification status;
- reviewer, review timestamp, decision and rationale;
- relationships to duplicate, corroborating, conflicting or superseding claims.

Suggested lifecycle: `candidate → source_verified → claim_assessed → approved | rejected | needs_context`. Changing source identifiers, passages, biological context or assertion must invalidate prior approval and require re-review.

Never convert model confidence or multi-model agreement alone into scientific approval.

### 4.3 Layer C — knowledge graph

Retain current graph engine and stable relationship IDs where possible. Extend schema through versioned migrations rather than a rewrite.

Required relationship properties:
- stable ID, typed predicate and direction;
- mechanism and context;
- source claim IDs;
- evidence tier and review state;
- species/tissue/condition and known scope limits;
- support and contradiction links;
- created/updated timestamps and release provenance.

Separate graph topology from the evidence ledger. Core, draft, provisional and rejected content must be distinct states. A citation on an entity must never silently validate every adjacent edge.

### 4.4 Layer D — hybrid scientific retrieval

Use a staged pipeline:
1. Query intent classification and entity linking.
2. Lexical retrieval (BM25 or equivalent) for exact genes, cytokines, aliases, IDs and paper terms.
3. Dense retrieval for semantic passages.
4. Graph expansion for typed, context-compatible relationships and paths.
5. Relation-aware retrieval for corroboration, contradiction and scientific lineage.
6. Reranking with a domain-relevant cross-encoder or evaluated reranker.
7. Evidence diversity controls to avoid ten near-duplicate papers dominating the context.
8. Return source passages, claim IDs, graph paths and explicit gaps.

Start with current graph retrieval plus a reliable literature adapter. Do not add a vector database, graph database or model provider until a benchmark shows that the current architecture cannot meet retrieval needs. Keep storage and provider interfaces replaceable.

### 4.5 Layer E — bounded research planner

Use a small, observable workflow with typed tools rather than an unrestricted swarm of agents:
- Planner: decomposes the research question into bounded subquestions.
- Retriever: finds papers, claims and graph paths.
- Evidence assessor: classifies evidence type, context, agreement and conflicts; it cannot approve claims.
- Mechanism analyst: proposes paths using only retrieved relationships.
- Skeptic: searches for counterevidence, missing context and alternative explanations.
- Synthesiser: writes a cited answer with uncertainty.
- Validator: checks every citation, claim ID, path edge and policy rule before release.

Agents share an explicit task state and evidence ledger, not unstructured hidden memory. Cap tool calls, search depth, time, tokens and cost. Persist a reproducible run trace. If a stage fails, surface the failure instead of inventing a result.

### 4.6 Layer F — answer and citation validation

For each material scientific sentence:
- attach one or more retrieved source passage IDs or reviewed claim IDs;
- verify that each cited source exists and matches the displayed identifier;
- verify the cited passage supports the precise assertion and biological context;
- label evidence type and review state;
- identify conflicting evidence where retrieved;
- mark inference/hypothesis as inference/hypothesis;
- abstain when support is absent or conflicting beyond the answer's scope.

The validator must not use the generator's self-assessment as the only check. Citation existence, citation relevance and claim entailment are separate checks. High-risk unsupported claims should fail closed.

### 4.7 Layer G — research workbench

Build an end-to-end guided workflow:
1. Define research question, scope and inclusion criteria.
2. Search and screen sources with transparent inclusion/exclusion reasons.
3. Extract candidate claims with exact spans.
4. Map claims to existing graph entities/relationships.
5. Review support, partial support, contradiction or irrelevance.
6. Build evidence tables and mechanism maps.
7. Draft a hypothesis with rationale, alternatives, assumptions and falsification criteria.
8. Propose an experiment plan with controls, readouts, confounders and expected outcomes.
9. Export a versioned report and curation manifest.
10. Require authorised human approval before graph publication.

No autonomous graph write-back or experimental execution in v1.

## 5. Technology choices

Choose the simplest architecture that meets measured requirements.

- **Frontend:** keep the existing React + TypeScript + TanStack application; improve design-system consistency and keyboard/mobile interaction.
- **API/application:** keep current TanStack server routes and typed service modules; enforce input schemas and bounded execution.
- **Primary data:** retain Neon/Postgres for users, evidence ledger, workflow state and audit records.
- **Graph:** use the current versioned JSON graph initially; evaluate PostgreSQL graph-style recursive queries or a dedicated graph database only when query complexity, size or concurrency justifies it.
- **Literature:** adapters for PubMed and Europe PMC; add open-access full-text sources under licence constraints.
- **Search:** begin with Postgres full-text plus a measured dense retrieval index; add external vector infrastructure only if recall/latency benchmarks warrant it.
- **LLMs:** provider abstraction, model/version registry, structured outputs, timeouts, cost budgets and evaluation-gated promotion. Do not hardwire a single model into scientific policy.
- **Observability:** structured logs and traces with redaction; track latency, cost, retrieval IDs, validator outcomes, abstentions and errors. Do not log secrets or unnecessary sensitive user content.
- **Jobs:** add a durable background queue only when ingestion or research tasks exceed request lifetimes.
- **Security:** least privilege, explicit admin provisioning, shared atomic rate limiting, safe secret management, migration discipline, backups and retention policy.

## 6. High-priority fixes before expansion

1. **Evidence query defence in depth:** reviewed evidence retrieval must explicitly require approved status, `claim_support = supports`, and acceptable identifier verification; contradictory evidence must be surfaced through a separate path. Add regression tests for legacy or directly modified rows.
2. **Audit history:** verify all deployed schemas. Preserve review history if an evidence row is deleted; prohibit ordinary application roles from updating/deleting audit events. Do not rely on a code comment to enforce append-only behaviour.
3. **Rate limiting:** replace per-process memory counters with a shared atomic limiter or verified platform-level equivalent before wider usage. Apply consistently to both Ask endpoints.
4. **Release integrity:** test the exact SHA; verify production SHA, schema/migration state, domains, auth and runtime configuration.
5. **Scientific gold set:** obtain expert sign-off and expand beyond the existing small smoke/evaluation suite.
6. **Accessibility and E2E:** run full browser workflows, keyboard/contrast review and performance measurement; report actual results only.
7. **Capability honesty:** expose a single capability registry so beta, partial, in-development and planned status matches executable code.

## 7. Evaluation framework

Create a versioned gold set with expert-authored questions, accepted claims, mandatory citations, counterevidence and abstention expectations. Stratify by:
- factual lookup;
- multi-paper synthesis;
- mechanistic causal paths;
- comparisons and conflicting studies;
- cell/tissue/species-specific context;
- novel or unsupported claims;
- source lookup and retraction/correction;
- hypothesis generation;
- clinical-personal and other out-of-scope questions.

Track:
- retrieval recall@k and nDCG@k;
- citation existence and identifier correctness;
- citation-to-claim support precision;
- claim correctness and evidence coverage;
- contradiction recall;
- context preservation;
- abstention precision/recall;
- expert-rated completeness and usefulness;
- p50/p95 latency, provider failure rate and cost per completed task;
- researcher task completion and time saved.

Report denominators, confidence intervals and performance by task type. Automated judges are triage aids, not substitutes for expert labels. Never aggregate all results into one score that hides critical scientific failures.

### Proposed initial release gates (must be validated against a signed-off set)

- 100% of emitted citation identifiers resolve to the intended source in the deterministic citation regression suite.
- Zero known critical unsupported claims in the signed-off critical-case set.
- 100% correct handling of explicitly out-of-scope clinical-personal requests in the safety regression suite.
- Every answer claim is either evidence-linked, clearly labelled as a hypothesis/inference, or explicitly abstained.
- No candidate/draft claim can enter the approved graph without the required review controls.
- No open P0 security or data-integrity defects.
- E2E smoke, keyboard accessibility and deployment-SHA checks pass.

These are proposed gates, not achieved results. SME owners must approve the scientific thresholds and test cases.

## 8. 90-day implementation sequence

### Days 1–14: safety, integrity and baseline
- Reconcile live deployment, schema and current evidence counts.
- Fix reviewed-evidence retrieval predicates and audit retention.
- Add shared rate limiting and abuse controls.
- Run current build/test/E2E suites and establish a baseline report.
- Obtain a domain expert to approve the first gold set.

### Days 15–30: trusted exemplar pathways
- Curate a small set of high-value pathways (e.g., TNF/inflammation/rheumatoid arthritis; PD-1/checkpoint biology; type I interferon/SLE).
- Verify each claim against exact source passages and context.
- Add contradiction and context display.
- Measure citation-to-claim support, retrieval recall and abstention.

### Days 31–50: evidence retrieval and Ask Immune
- Implement hybrid retrieval only as benchmarked.
- Add reranking and source diversity.
- Add a skeptical counterevidence pass for complex synthesis.
- Validate every output claim and source.
- Add structured run traces and cost/latency budgets.

### Days 51–70: researcher workflow
- Complete question → literature → claims → mechanism → hypothesis → experiment plan → export.
- Add inclusion/exclusion logs, evidence tables and versioned exports.
- Keep graph publication human-approved.
- Test with immunology researchers and postgraduate learners.

### Days 71–90: pilot and release
- Run blind evaluation on held-out questions.
- Conduct human usability/accessibility review.
- Fix critical failures and compare metrics to baseline.
- Publish honest product capabilities and limitations.
- Release only after the gates above are met.

## 9. Explicit non-goals for v1

- No diagnosis, treatment recommendation or patient-specific clinical decision-making.
- No claims of validated immune-system prediction or digital-twin accuracy without prospective validation.
- No automatic approval of LLM-extracted graph edges.
- No autonomous execution of wet-lab experiments.
- No broad agent swarm without a measured workflow need.
- No premature migration to a graph database or vector platform without benchmarks.
- No broad graph expansion at the expense of source verification.
- No claim that planned models or adapters are implemented.

## 10. First implementation backlog

| ID | Priority | Deliverable | Acceptance |
|---|---|---|---|
| ISI-001 | P0 | Reviewed evidence retrieval hardening | Only verified, approved supporting claims can support an answer; contradiction path remains visible |
| ISI-002 | P0 | Durable curation audit history | Delete/update attempts cannot erase historical decisions |
| ISI-003 | P1 | Shared Ask rate limiter | Atomic limits work across instances and both endpoints |
| ISI-004 | P1 | Gold scientific evaluation set | SME-approved cases, citations, counterevidence and abstention expectations |
| ISI-005 | P1 | Citation-to-claim validator | Each scientific claim maps to relevant source spans/claim IDs |
| ISI-006 | P1 | Evidence coverage dashboard | Counts are live, reproducible and clearly distinguish mapped vs approved claims |
| ISI-007 | P1 | Hybrid retrieval benchmark | Compare current baseline vs lexical/dense/graph retrieval with measured recall and cost |
| ISI-008 | P2 | Research workbench end-to-end | Exportable, versioned evidence and hypothesis workflow; no auto-approval |
| ISI-009 | P2 | Research pilot and UX evaluation | Observed task completion, expert feedback and prioritised defect list |
| ISI-010 | P2 | Release evidence report | Candidate SHA, tests, deployment SHA, limitations and sign-offs recorded |

## 11. Definition of success

ISI is succeeding when an immunology researcher can ask a complex question, see which sources and exact claims support the answer, inspect conflicting evidence, trace a mechanism through context-compatible graph edges, identify gaps, draft a falsifiable hypothesis, and export the reasoning trail—without confusing AI-generated suggestions with reviewed scientific knowledge.

The core competitive advantage should be **reliable evidence-to-mechanism-to-research workflow**, not model size, agent count or graph-node count.
