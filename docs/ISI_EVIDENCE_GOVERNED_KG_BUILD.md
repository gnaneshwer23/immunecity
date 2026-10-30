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
| **B** | Scientific graph model | **Complete (engineering)** | `docs/ISI_PHASE_B_REPORT.md` |
| **C** | Evidence intelligence | In progress / next | Claim records, conflict, review queue; quality ≠ status ≠ curation |
| **D** | Ask Immune GraphRAG | Partial baseline exists (`askGrounding.ts`) | Entity resolve, bounded paths, abstain, evals |
| **E** | Clinical / research workflows | Partial (Trial Intelligence P0–P2, Workbench MVP) | Biomarkers, mechanism↔trial links, brief handoff |
| **F** | End-to-end QA | Not started | Full journey + a11y + isolation |

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

**Tests:** 15 Phase B + 9 Phase A pass. **SHA:** see Phase B report after commit.

---

## Phase C–F (deferred detail)

- **C:** Claim locators, conflict ledger, review audit; keep quality / evidence_status / curation separate (`EvidenceDimensionsStrip`).
- **D:** GraphRAG on one Ask path; abstain on insufficient/ambiguous; eval harness (`ask:quality`, SME gold set).
- **E:** Persist `treatment_line` if needed; biomarker models without invented assays; brief → human review handoff.
- **F:** Journey smoke Immunology OS → Immune City → evidence → Trial Intelligence → Ask → Workbench → export.

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
