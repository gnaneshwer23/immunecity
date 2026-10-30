# ISI external GitHub audit response — 2026-10-30

**Baseline tip verified:** `7c12b7f` (then this response commit on `main`).  
**Mandate:** Stop expanding the knowledge graph. Focus scientific validation + authenticated workflow proving. Deployment/Vercel out of scope. No fabricated science, no bulk-approve, TI prod flag stays off.

## Mapping: audit finding → status

| # | Audit priority | Status | Notes |
| --- | --- | --- | --- |
| 0 | Claim typing `literature_candidate` \| `extracted_claim` \| `reviewed_claim` | **Done** | `claimRecords.ts` + scientific brief/pilot typed as `literature_candidate`. `isSourceBackedCandidate` documented as ≠ claim-verified. No auto-promotion to `reviewed_claim`. |
| 1 | Playwright authenticated workflows | **Done (harness)** / **SME-ops for live run** | Real sign-in / collection CRUD / cross-account isolation specs; skip with explicit reason when `E2E_USER_*` missing; e2e README states skips ≠ passes. Live proof needs credentials. |
| 2 | Scientific review workflow beyond import | **Done (engineering)** | Neon-backed `listScientificReviewQueue`, `recordScientificReviewDecision`, `listEvidenceAuditTrail`; curation UI panel. `wired: true` = real `importManifest` submission path. No automatic approval. |
| 3 | Ask Immune live-answer verification | **Done** | Deterministic tests in `ask-live-answer-verification.test.ts` over `validateAnswerCitations` + fixtures (v12). |
| 4 | Melanoma curation support (engineering aids) | **Done** | `ISI_MELANOMA_PILOT_VALIDATION_MATRIX` TS export + checklist UI. No invented Gate C / KEYNOTE rematch. |
| 5 | Ontology mappings | **Done (small)** | Curator entry UI + server fns; empty seed preserved; draft/unreviewed + verification required. |
| — | Graph expansion / GraphView density | **Stopped** | Not pursued; working tree was clean at tip. |

## Still SME / ops blocked

| Item | Why |
| --- | --- |
| Gate C human approvals (incl. KEYNOTE-006 rematch of PMID `25891173` onto trial edge; S-P-O rewrite of exhaustion edge) | Requires scientific reviewer judgement — engineering intentionally refuses auto/bulk approve. |
| Live multi-account Playwright green | Needs real `E2E_USER_A_*` / `E2E_USER_B_*` in the runner env. |
| Filling ontology crosswalks with verified external IDs | Curator-supplied only; empty remains honest. |
| Biomarker assay cut-offs / TI prod enable / Vercel deploy | Explicitly out of scope or fabrication-forbidden. |

## Key paths

- Claim kinds: `src/lib/immune/claimRecords.ts`, `src/lib/research/scientificBrief.ts`
- Review queue: `src/lib/evidence.functions.ts`, `src/components/immune/ScientificReviewQueuePanel.tsx`
- Melanoma matrix: `src/data/melanomaPilotValidationMatrix.ts`, `src/components/immune/MelanomaPilotChecklist.tsx`
- Ontology entry: `src/lib/ontology.functions.ts`, `src/components/immune/OntologyMappingPanel.tsx`
- Auth E2E: `e2e/isi-journeys.spec.ts`, `e2e/auth-helpers.ts`, `e2e/README.md`
- Ask verification: `src/test/ask-live-answer-verification.test.ts`
