# ISI Audit Baseline — 30 Oct 2026

Phase 0 inventory for **ISI — GitHub Audit Report and Enhancement Plan v1.0**.
Principle: Audit → Stabilise → Enhance → Validate → Release.

Repo: `https://github.com/gnaneshwer23/immunecity` · Live: `https://www.immune-super-intelligence.co.uk/`  
Baseline HEAD at start of this pass: `e5e4996` (Trial Intelligence P0).

---

## 1. Key routes (TanStack Start)

| Area | Paths |
| --- | --- |
| Home / marketing | `/`, `/overview`, `/platform`, `/vision`, `/about`, `/collaborate`, `/insights` |
| Learn / Explore | `/learn`, `/atlas`, `/atlas/$id`, `/graph`, `/disease`, `/therapy`, `/patient`, `/mechanism`, `/mechanism/$id`, `/dynamics`, `/simulator`, `/pipeline`, `/pipeline/$disease` |
| Investigate | `/ask`, `/reasoning`, `/scientific-ai`, `/evidence`, `/methods`, `/evidence-methods`, `/research`, `/research-workbench`, `/workspace` |
| Academy | `/academy` |
| Community | `/community`, `/community/new`, `/community/topic/$slug`, `/community/post/$postId`, `/community/journal-clubs`, `/community/moderation`, `/community/saved`, `/community/notifications`, `/community/profile`, `/community/profile/$userId` |
| Auth / trust | `/auth`, `/_authenticated/curation`, `/privacy`, `/terms`, `/disclaimer`, `/accessibility` |
| API | `/api/ask`, `/api/ask/prepare`, `/sitemap.xml` |

Journey IA: `JOURNEY_NAV` in `src/data/marketingNav.ts` (Learn / Explore / Investigate).

**Trial Intelligence UI surface (flag-gated):** `/atlas/$id` for `TRIAL` nodes via `TrialIntelligencePanel`; Methods honesty always on `/methods` (`TrialIntelligenceMethodsNote`).

---

## 2. Packages / stack (selected)

- Runtime: TanStack Start + React Router, Vite, Bun scripts, Vitest, Playwright.
- Data: Neon Postgres + Drizzle (`src/lib/db.server.ts`, `src/lib/db/schema.server.ts`).
- Auth: Neon Managed Better Auth (`src/integrations/neon/*`).
- AI: Vercel AI SDK (`ai`, `@ai-sdk/openai`) for Ask.
- Graph: browser-safe `src/data/kg.json` + `src/lib/immune/engine.ts`.

---

## 3. Schemas (public)

Migrations `drizzle/migrations/0000`–`0016`. Notable tables:

- Curation: `evidence_records`, `evidence_audit_events`, `claim_candidates`, `user_roles`
- Community / academy / workspace: profiles, posts, comments, saves, appeals, notifications, journal clubs, `academy_member_progress`, `concept_saves`, `ai_evaluation_runs`
- **Trial Intelligence (0015):** `clinical_trials`, `trial_arms`, `endpoint_results`
- **Research Workbench (0016):** `evidence_collections` (member-named concept id sets + optional evidence_id refs; never KG write)

Publication bibliography for pilots lives in fixtures (`src/data/trialIntelligence.ts`); not a separate DB table in 0015.

---

## 4. Feature flags

| Flag | Default | Purpose | Rollback |
| --- | --- | --- | --- |
| `VITE_TRIAL_INTELLIGENCE` (or `TRIAL_INTELLIGENCE`) | **OFF** | Gates Atlas Trial Intelligence panel | Unset / set `0` in Vercel Production → redeploy. No route removal. |

Implementation: `src/lib/trialIntelligenceFlag.ts`. Panel early-returns when off.

**Production status (2026-10-30):** `VITE_TRIAL_INTELLIGENCE` / `TRIAL_INTELLIGENCE` **absent** from Vercel Production, Preview, and Development env lists for project `immunecity` → Trial Intelligence UI **OFF** in live production. Do not enable for general production until A01–A05 checks pass.

---

## 5. Migration 0015 verify (ep-blue-salad)

| Table | Count | Fixture expected |
| --- | --- | --- |
| `clinical_trials` | 2 | 2 |
| `trial_arms` | 6 | 6 |
| `endpoint_results` | 24 | 24 |
| `evidence_records` | 46 | unchanged (not touched by 0015) |
| `user_roles` | 36 | unchanged |

Field-level fixture ↔ DB: **consistent** (`bun run db:trial-intelligence:check`).

Seed / import SOT: `src/data/trialIntelligence.ts`. Apply: `bun run db:trial-intelligence`.

### Migration backup & rollback (0015 / 0016)

**Never print `DATABASE_URL`.** Prefer Neon console / CLI snapshots before apply.

| Action | Guidance |
| --- | --- |
| Backup | Neon project branch snapshot or PITR before running `db:trial-intelligence` / `db:evidence-collections`. Confirm `evidence_records` count before/after (scripts refuse if count changes). |
| Apply fail-safe | Apply scripts wrap DDL (+ 0015 seed) in `sql.begin` — mid-script failure aborts the transaction from the script path. Re-run is idempotent (`IF NOT EXISTS` / `ON CONFLICT`). |
| Verify | `bun run db:hardening:verify` and/or `bun run db:trial-intelligence:check` on **ep-blue-salad** only. |
| Rollback 0016 | `DROP TABLE IF EXISTS public.evidence_collections;` (additive member data only; does not touch curation). |
| Rollback 0015 | Drop `endpoint_results`, `trial_arms`, `clinical_trials` in FK-safe order **only** after confirming no production dependency and restoring from snapshot if seed diverged. Prefer snapshot restore over manual DROP when unsure. |
| Feature rollback | Unset `VITE_TRIAL_INTELLIGENCE` / set `0` in Vercel Production → redeploy (UI off; tables may remain). |

Hardening sprint notes: `docs/ISI_HARDENING_SPRINT_2026-10-30.md`.

---

## 6. Numerics spot-check (A02)

Independent PubMed efetch (2026-10-30):

| Trial | NCT | Key verified figures | Unverified |
| --- | --- | --- | --- |
| KEYNOTE-006 | NCT01866319 | ORR 33.7 / 32.9 / 11.9%; 6-mo PFS 47.3 / 46.4 / 26.5%; grade 3–5 TRAE 13.3 / 10.1 / 19.9% (PMID 25891173); 24-mo OS 55 / 55 / 43%; n=279/277/278 (PMID 28822576) | — |
| CheckMate 067 | NCT01844505 | Median PFS 11.5 (8.9–16.7) / 6.9 (4.3–9.5) / 2.9 (2.8–3.4) mo; grade 3–4 TRAE 55.0 / 16.3 / 27.3% (PMID 26027431); 5-yr OS 52 / 44 / 26% (PMID 31562797) | ORR left **null** (absent from verified abstracts) |

Note: PMID 28889792 reports different grade 3–4 rates (59 / 21 / 28%); fixtures correctly retain primary abstract values with a note. No fabricated PMIDs or NCT IDs.

---

## 7. Postgres read path (A03)

- Server: `src/lib/trialIntelligence.functions.ts` — `getTrialIntelligenceByGraphNode` / `resolveTrialIntelligence`.
- When DB available and honesty-validated → `source: "postgres"`.
- On outage / incomplete → fixture fallback (`source: "fixture"`, optional `unavailable`).
- Consistency: `bun run db:trial-intelligence:check`.

---

## 8. Out of this pass

AI agents expansion, new diseases, full review workflow UI (A04 beyond existing curation), biomarker schemas (A07), Ask eval overhaul (A10), Workbench A12–A14 beyond MVP, commercial validation recruiting, enabling Trial Intelligence for general production.

---

## 9. Next audit phase

Phase 1–4 engineering checklists are below. **Audit roadmap engineering complete through Phase 4.** Production Trial Intelligence flag stays off until SME sign-off.

---

## 10. Phase 1 — Scientific evidence foundation (exit checklist)

**Status:** Engineering exit criteria met in code; **human SME sign-off still required** before enabling `VITE_TRIAL_INTELLIGENCE` in production.

**Exit gate:** Every published pilot endpoint is traceable to an approved source.

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| P1-1 | Melanoma pilot endpoints honesty (no invented numerics) | Met | `endpointPassesHonesty` / `melanomaPilotExitGateReport` · `bun test src/test/phase1-evidence-foundation.test.ts` |
| P1-2 | Published numerics cite PMID (+ DOI) + analysis set | Met | Endpoint provenance column in `TrialIntelligence.tsx`; fixtures + Postgres seed |
| P1-3 | Unverified gaps stay null + labelled | Met | CheckMate 067 ORR null / unverified |
| P1-4 | Postgres authoritative when seeded; fixture fallback on outage | Met | `resolveTrialIntelligence` · `bun run db:trial-intelligence:check` |
| P1-5 | Three dimensions visible (curation ≠ evidence_status ≠ quality) | Met | `EvidenceDimensionsStrip` on inspector, edge refs, trial endpoint fold |
| P1-6 | ISI-A04: supports-only page approve; no AI auto-approve; no mass Gate C | Met | `isReadyForSupportsApproval`; curation callouts; server `computeEvidenceUpdate` |
| P1-7 | ISI-A10 light: Ask fails closed; no “fully evidence-grounded” claim | Met | Existing `validateAnswerCitations` + SYSTEM contract; Phase 1 test asserts honesty copy |
| P1-8 | Docs + focused tests | Met | This checklist · Phase 1 bun tests |
| P1-9 | Production flag remains OFF | Required | Do **not** set `VITE_TRIAL_INTELLIGENCE` in Vercel Production until SME review |

### Still needs human SME

- Independent re-check of KEYNOTE-006 / CheckMate 067 abstracts vs stored numerics (A02 spot-check done in eng; SME confirmation open).
- Gate C claim density on melanoma mechanism edges (curator work — not mass-approved here).
- Sign-off before any production Trial Intelligence flag flip.

### Explicitly out of Phase 1

- Trial comparison engine (A08), biomarker schemas (A07), Workbench MVP, new disease areas, full Ask eval overhaul.

**Next:** Phase 2 — Trial Intelligence experience (UI/comparability/navigation; flag still off until SME).

---

## 11. Phase 2 — Trial Intelligence experience (exit checklist)

**Status:** Engineering exit criteria met in code; **human SME sign-off still required** before enabling `VITE_TRIAL_INTELLIGENCE` in production.

**Exit gate:** Researchers can navigate from a melanoma mechanism to a trial and inspect source-backed outcomes.

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| P2-1 | Trial detail UI: arm tables, provenance, analysis set/follow-up, verification labels | Met | `TrialIntelligencePanel` / `TrialCard` on `/atlas/TR003` · `/atlas/TR020` |
| P2-2 | Methods honesty fold (optional detail) | Met | `TrialIntelligenceMethodsNote` details fold on `/methods#trial-intelligence` |
| P2-3 | ISI-A08 light comparability: stage/line, endpoint, follow-up, analysis population; never superiority | Met | `src/lib/immune/trialComparability.ts` · peer fold on trial panel |
| P2-4 | Strengthened non-causal / non-CDS warnings | Met | `NON_CAUSAL_TRIAL_WARNING` + `ti-no-superiority` |
| P2-5 | Biomarker context light — stubs empty; graph biomarkers without invented assays | Met | `biomarkerContext: []` · `graphBiomarkersForTrial` (e.g. B011 on TR003) |
| P2-6 | Graph → trial navigation (melanoma / PD-1 → TR003/TR020 `#trial-intelligence`) | Met | `TrialIntelligenceConceptNav` · `trialIntelligenceNavFromConcept` · TranslationalPath deep links when flag on |
| P2-7 | Accessibility: captions, keyboard scroll region, empty/unavailable states | Met | `sr-only` captions · `tabIndex={0}` table wrap · `ti-unavailable` / `ti-biomarker-empty` |
| P2-8 | Docs + focused tests | Met | This checklist · `bun test src/test/phase2-trial-intelligence.test.ts` |
| P2-9 | Production flag remains OFF | Required | Do **not** set `VITE_TRIAL_INTELLIGENCE` in Vercel Production until SME review |

### Still needs human SME (before prod flag flip)

- Independent re-check of KEYNOTE-006 / CheckMate 067 abstracts vs stored numerics (eng A02 done; SME confirmation open).
- Confirm comparability facet wording (stage/line labels) matches how reviewers describe the two populations.
- Confirm empty biomarker-assay stance is acceptable until curated assay rows exist.
- Sign-off before any production Trial Intelligence flag flip.

### Explicitly out of Phase 2

- Full comparison engine / superiority analytics, biomarker assay DB tables (beyond stubs), Research Workbench MVP (Phase 4), Phase 3 education↔research integration, new disease areas, mass Gate C.

**Next:** Phase 3 — Integrated education and research (OS ↔ graph, Ask evals, saved paths; flag still off until SME).

---

## 12. Phase 3 — Integrated education and research (exit checklist)

**Status:** Engineering exit criteria met in code; **human SME sign-off still required** before enabling `VITE_TRIAL_INTELLIGENCE` in production or claiming Ask is fully evidence-grounded.

**Exit gate:** Learning and research journeys share scientific data without duplication.

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| P3-1 | Academy / Immunology OS concepts link to existing Immune City graph nodes only | Met | `knownGraphIdsForLesson` · `academyCurriculum.graphIds` filtered by `byId` · never invents biology |
| P3-2 | Lesson → graph (Atlas) deep links and return to lesson with progress preserved | Met | `NodeChip` + `fromLesson` → `/atlas/$id` · `LessonReturn` → `/mechanism/$id` · Academy localStorage/server progress untouched |
| P3-3 | Graph evidence exploration UX: empty filters + panel continuity | Met | `GraphTable` / `GraphView` empty-filter copy · concept+edge detail slot continuity |
| P3-4 | Saved research paths reuse workspace / concept ids — no second science store | Met | `src/lib/research/savedPaths.ts` (ordered existing ids in localStorage) · My Workspace deep links to Atlas/graph/lesson |
| P3-5 | Ask retrieval eval light: gold-set Academy neighbourhoods + dashboard fail-closed clarity | Met | `scientific-eval-set` academy-* cases · `ask:quality` harness · Ask quality dashboard note — status remains **not fully evidence-grounded** |
| P3-6 | Docs + focused tests | Met | This checklist · `bun test src/test/phase3-education-research.test.ts` |
| P3-7 | Production Trial Intelligence flag remains OFF | Required | Do **not** set `VITE_TRIAL_INTELLIGENCE` in Vercel Production until SME review |

### Explicitly out of Phase 3

- Research Workbench MVP (Phase 4), prod trial flag on, inventing lessons/science, community→KG writes, CDS claims, mass Gate C.

**Next:** Phase 4 — Research Workbench MVP (flag still off until SME).

---

## 13. Phase 4 — Research Workbench MVP (exit checklist)

**Status:** Engineering exit criteria met in code; **human SME sign-off still required** before enabling `VITE_TRIAL_INTELLIGENCE` in production or claiming clinical/CDS use.

**Exit gate:** Research outputs are reproducible, reviewable and source-traceable.

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| P4-1 | Evidence collections — signed-in member saves named graph concept ids + optional evidence refs | Met | Neon `evidence_collections` (0016) · `collections.ts` / `collections.functions.ts` · `/research#collections` · `kgWrite=false` |
| P4-2 | Evidence-gap classifications (5 UI labels; real coverage/status only) | Met | `src/lib/research/evidenceGap.ts` · labels on collections + brief panel · never invents Gate C density |
| P4-3 | Research brief generator — AI/draft, structured, cite retrieved ids only, fail closed | Met | `src/lib/research/researchBrief.ts` · `/research#brief` · no clinical recommendations |
| P4-4 | Human review — drafts unreviewed; versioned JSON/Markdown export; cannot approve into KG | Met | `reviewStatus: unreviewed` · `canApproveIntoKg: false` · export buttons · workbench handoff remains stub |
| P4-5 | Docs + focused tests | Met | This checklist · `bun test src/test/phase4-research-workbench.test.ts` |
| P4-6 | Production Trial Intelligence flag remains OFF | Required | Do **not** set `VITE_TRIAL_INTELLIGENCE` in Vercel Production until SME review |
| P4-7 | No KG writes from research surfaces | Met | Collections / brief / workbench exports declare `kgWrite=false`; no `evidence_records` mutation from collection APIs |

### Still needs human SME

- Independent re-check of KEYNOTE-006 / CheckMate 067 abstracts vs stored numerics (eng A02 done; SME confirmation open).
- Researcher pilot feedback on brief export usefulness.
- Sign-off before any production Trial Intelligence flag flip.

### Explicitly out of Phase 4

- Prod trial flag on, inventing PMIDs, auto-publish to graph, diagnosis/treatment advice, patient prediction, CDS claims, mass Gate C, full Workbench A12–A14 beyond this MVP.

**Audit roadmap note:** Phase 0 inventory + Phases 1–4 engineering checklists are complete in this baseline. Remaining work is SME validation, Gate C curation, and controlled Trial Intelligence enablement — not a further numbered audit engineering phase in this document.
