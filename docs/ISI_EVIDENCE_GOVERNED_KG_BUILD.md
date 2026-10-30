# ISI Evidence-Governed Knowledge Graph — Build Plan & Status

**Product:** Immune Super Intelligence · https://www.immune-super-intelligence.co.uk/  
**Repo:** `gnaneshwer23/immunecity` · local `/Users/gnaneshwerjadav/Desktop/immune-city`  
**Principle:** One knowledge graph. Evidence-governed. Educational — not CDS.  
**Never:** invent PMIDs / numerics / assay cut-offs; auto-approve AI into curated graph; mass-approve Gate C; force-push Lovable history.

---

## North-star (pilot)

In metastatic melanoma, which immune-escape mechanisms associate with PD-1 inhibitor response or resistance, which biomarkers and trials support those relationships, and what is unknown — with full provenance and human review before any clinical-sounding conclusion.

---

## Phase status

| Phase | Title | Status | Report / notes |
| --- | --- | --- | --- |
| **A** | Immediate corrections | **Complete (engineering)** | `docs/ISI_PHASE_A_REPORT.md` · `40d9bbc` |
| **B** | Scientific graph model | **Complete (engineering)** | `docs/ISI_PHASE_B_REPORT.md` · `1e48f1a` |
| **C** | Evidence intelligence | **Complete (engineering)** | `docs/ISI_PHASE_C_REPORT.md` · `2056b2f` |
| **D** | Ask Immune GraphRAG | **Partial** (neighbourhood + conflict lines; SME eval open) | `docs/ISI_PHASE_D_REPORT.md` · `2056b2f` |
| **E** | Clinical / research workflows | **Complete (engineering)** | `docs/ISI_PHASE_E_REPORT.md` · `23aabbd` |
| **F** | End-to-end QA | **Complete (focused bun suite)** | `docs/ISI_PHASE_F_REPORT.md` · SHA after F commit |

Prior hardening / correction sprints (2026-10-30) remain prerequisites: `docs/ISI_HARDENING_SPRINT_2026-10-30.md`, `docs/ISI_AUDIT_BASELINE_2026-10-30.md`.

---

## Phase A exit (done)

1. Endpoint pairing without positional mismatch — `pairEndpointsByIdentity`
2. `insufficient_coverage` ≠ verified `no_mapped_evidence`
3. Trial fixture / schema / read-model contract audited + tested
4. Positive / negative / boundary regressions in `src/test/phase-a-evidence-governed.test.ts`

**Tests:** 31 pass across phase-a + phase4 + correction-sprint suites.  
**SHA:** `40d9bbc`

---

## Phase B exit (done)

1. Inventory — `graphInventory.ts` (single KG; Neon = evidence/trials/collections only)
2. Typed relations — `typedRelations.ts` (direction, polarity from `relation_semantics`, context)
3. Ontology mappings — empty seed + migration 0017 `ontology_mappings` (curator backfill only)
4. Provenance — `graphProvenance.ts` + `graph_provenance_events`
5. Safe apply/backfill scripts — evidence count fail-closed; dry-run default
6. Bounded neighbourhood — `neighbourhood.ts` + `neighbourhood.functions.ts`

**Tests:** 15 Phase B + 9 Phase A pass. **SHA:** `1e48f1a`

---

## Phase C exit (done, engineering)

- Claim locators + classification (`claimRecords.ts`)
- Conflict detection; silent non-supports approval blocked
- Scientific review queue + audit summary (`scientificReviewQueue.ts`)
- Three dimensions remain orthogonal

## Phase D partial

- Ask `GRAPH_NEIGHBOURHOOD` / `NPATH` + `EVIDENCE_CONFLICT` lines; `PROMPT_VERSION=ask-grounding-v11`
- SME gold-set / full eval metrics still open

## Phase E exit (done, engineering)

1. Melanoma investigation path — `melanomaInvestigationPath.ts` (typed relations + pilots + endpoints)
2. Additive **0018** `treatment_line` + fixture seed (`db:trial-treatment-line`); sources/assays still fixture/stub
3. Scientific brief package + curation handoff — `scientificBrief.ts` (unreviewed stays unapproved)
4. Export provenance trail — `exportProvenance.ts` (+ workbench export)
5. Collections / path sync helpers — no community→KG write

**Tests:** Phase E suite green; combined A–F **53 pass**. **SHA:** `23aabbd`.

## Phase F exit (done, focused QA)

1. Journey suite `phase-f-e2e-journey.test.ts` — OS → City → evidence → TI flag → Ask → Research → export
2. Regressions for A–E suites; honesty for missing/conflicting evidence; a11y script smoke
3. Gaps documented: Playwright auth, live Neon isolation re-check, full Vite/a11y when OOM

**Tests:** 53 pass / 0 fail across phase-a…f. **SHA:** see `docs/ISI_PHASE_F_REPORT.md`.  
Status note: `docs/ISI_PHASE_E_F_STATUS.md`.

---

## Guardrails (every phase)

| Guardrail | Enforcement |
| --- | --- |
| One KG | `kg.json` + draft `extensions.ts` only |
| No AI auto-approve | Curation server checks; Workbench `kgWrite=false` |
| Trial flag off in prod | `trialIntelligenceFlag.ts` |
| No fabricated science | Honesty validators + curator process |
| Lovable history | No force-push / rebase of published commits |

---

## Definition of done (program)

One complete **source-traceable** melanoma immunotherapy investigation path (mechanism → biomarker context → KEYNOTE-006 / CheckMate 067 → Ask abstention honesty → Research export) **without unsupported clinical conclusions**.
