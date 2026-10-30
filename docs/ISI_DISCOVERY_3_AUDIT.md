# ISI Discovery Intelligence 3.0 — audit

**Audited tip:** `479531a` (`479531afa1a6c7c7bf7daadc522a4e6dd760e693`)  
**Date:** 2026-10-30  
**Scope:** Discovery Radar, profiles, gaps, adapters, ranking, `/sme`, dossiers, monitor/alerts, entitlements, Neon 0019–0023, tests.  
**Rules respected:** no rebuild of working Phase 0–8 features; TI flag off; no fabricated identifiers; no auto Gate C / bulk approve.

---

## Executive finding

Discovery 0–8 is a coherent engineering scaffold on `main`: deterministic Pilots A/B detection, Neon persistence, Radar/dossier/alerts UI, entitlements stubs, monitor fail-closed adapters, SME workspace for melanoma/KEYNOTE/R011. **Discovery 3.0 P0 is not closed:** there is **no three-way gap-class taxonomy**, **retrieval is not wired into gap assessment**, **`research_gap_evidence_links` / `research_gap_candidates` are unused**, and **SME does not queue Neon Discovery gaps**. Live PubMed/CT.gov adapters exist but default fail-closed and only touch monitor coverage rows.

---

## 1. Discovery Radar

| Item | State |
| --- | --- |
| Routes `/discovery`, filters, Ask/Workbench deep links | **Working** |
| `shapeRadarFeed` / `mergeDetectionWithPersisted` / `recommendGapsForProfile` | **Working** (scores = navigation aids only) |
| Client seed via `detectDiscoveryCandidates()` | **Working** for Pilot A |
| Pilot B Neon Gate C signals | **Incomplete** — `signalsById` rarely passed; empty signals → graph-only labels |
| `trial_signal` detectionSource | **Disconnected** — typed + filterable, never emitted |
| Neon-only gaps without detection key | **Invisible** in merge |
| Persist-on-radar | **Manual** member action (by design) |

**Risks:** Emerging/contradiction sections sparse; free users see unpersonalised preview; “recommended because” can be misread as novelty.

**Paths:** `src/routes/discovery.index.tsx`, `src/lib/discovery/radar.ts`, `recommend.ts`, `detect.ts`, `gaps.functions.ts`.

---

## 2. Research profiles

| Item | State |
| --- | --- |
| Migration 0019 + CRUD `getMyResearchProfile` / `upsertMyResearchProfile` | **Working** |
| Onboarding + profile routes | **Working** |
| Entitlement field | **Stub** — inserts `free`; no server provision for Pro/Team |
| Team shared profiles | **Scaffolding only** (`team.ts` always refuses activation) |

**Risks:** Quotas/gates are unit-tested but production UX stays on `free` unless Neon is patched by ops.

---

## 3. Gaps — status vs class (P0 hole)

**Present statuses:** `candidate` | `coverage_insufficient` | `needs_context` | `rejected` | `reviewed_gap` | `superseded`.  
**Human-only:** `reviewed_gap` via `applyGapReviewDecision` / `recordGapReviewDecision`.  
**Auto-emit guard:** `assertDetectionEmitStatus` — never `reviewed_gap`.

**Missing for 3.0:**

| Class | Meaning | Code today |
| --- | --- | --- |
| `isi_curation_gap` | Missing cites, ontology, unreviewed relationships, internal ISI inconsistencies → `/sme` or `/curation` | **Absent** (matrix rows lumped as generic candidates) |
| `scientific_evidence_gap` | Limited/inconsistent evidence **within documented search scope** | **Absent** as class (status `coverage_insufficient` overlaps honesty, not class) |
| `research_opportunity` | Testable question after evidence assessment + rationale/novelty/feasibility; human review before “reviewed opportunity” | **Absent** |

No `gap_class` column, types, UI labels, or reclassification preserving provenance. Misclassification regression tests do not exist.

**Paths:** `types.ts`, `gapStatus.ts`, `detect.ts`, migration `0020_research_discovery_gaps.sql`.

---

## 4. Adapters & scientific retrieval

| Adapter | Code | Runtime default | Persist PMIDs/NCT |
| --- | --- | --- | --- |
| PubMed live (`createLivePubmedAdapter`) | E-utilities esearch | Fail-closed unless `DISCOVERY_LIVE_PUBMED=1` | **No** — IDs not written to evidence links |
| CT.gov live (`createLiveCtgovAdapter`) | API v2 | Fail-closed unless `DISCOVERY_LIVE_CTGOV=1` | Hit count only |
| Europe PMC | — | **Missing** | — |
| Stub / fixture | Present | Default monitor mode | Honest null hit counts |

`evidenceCheck.ts` already does PubMed summary/search + Crossref for curation — **not imported by Discovery**.  
`verifyGapCandidate` / `verifyPersistedGap` are **graph provenance only**; coverage drafts keep `hitCount: null`.

**Risks:** Failed queries must stay null (already policy); enabling live without SME review can be misread as “gap closed.” Bounded pilots A/B retrieval **not run/stored** as a Discovery 3.0 deliverable yet.

---

## 5. Gap assessment pipeline

**Today:** detect → (optional persist) → graph verify → human review; monitor optionally appends adapter coverage.

**Missing chain:** retrieve → extract → context compare → classify (3 classes) → novelty (scoped) → feasibility → expert review → personalise — as **one** workflow with deterministic ID/provenance/coverage/status checks. LLM is correctly constrained to labelled draft elsewhere; novelty search limitations are not documented on dossier.

---

## 6. Dossiers

| Item | State |
| --- | --- |
| `buildGapDossier`, badges, Ask prefill, deep links | **Working** |
| Coverage rows + reviews on detail route | **Working** when persisted |
| Retrieved citation panel / evidence links | **Missing** (table unused) |
| Gap-class badges / opportunity rationale | **Missing** |
| SME queue deep-link for same gap | **Weak** |

**Path:** `dossier.ts`, `discovery.gaps.$gapId.tsx`.

---

## 7. Monitor / alerts

| Item | State |
| --- | --- |
| `planMonitorRun`, in-app alerts, migration 0021 | **Working** |
| `bun run discovery:monitor` | **Working** (stub by default) |
| Email | **Deferred** (`email_deferred`) |
| Prod schedule / cron | **Not approved** — intentionally off |
| Export daily quota | **In-memory** map (resets on cold start) — reliability defect |

---

## 8. Entitlements

Server-checked stubs `free` | `researcher_pro` | `team` | `enterprise`; quotas in `assertQuotaAllows`. Stripe **not** activated. Team features refuse. No admin entitlement mutator. Orthogonal to `user_roles` (correct).

---

## 9. Neon 0019–0023

| Migration | Applied (ep-blue-salad docs) | App write path |
| --- | --- | --- |
| 0019 profiles | Yes | Yes |
| 0020 gaps suite | Yes | Gaps/reviews/coverage/feedback/subs — **candidates + evidence_links unused** |
| 0021 monitor | Yes | Yes |
| 0022 entitlements CHECK | Yes | Column only |
| 0023 SME gold/events | Yes | Yes |

---

## 10. SME `/sme`

| Item | State |
| --- | --- |
| Melanoma matrix queue, KEYNOTE + R011 priority IDs | **Present** |
| Rematch validation (PMID+DOI+locator), gold labels null until SME | **Present** (engineering) |
| `discovery_gap` kind | **Typed, never instantiated** from Neon gaps |
| Eval slots genuine/false/resolved/contradiction/incomplete-retrieval | **Partial** harness; honest denominators |
| Approve/reject/request-more for Discovery gaps | Via dossier review fn — **not unified SME UX** |
| Agent as SME | **Forbidden** — correctly no auto decisions |

---

## 11. Tests

- Unit: `src/test/discovery-intelligence.test.ts`, SME/eval harnesses — strong for Phase 1–8 policy.
- Playwright Discovery: public smoke; auth **skip≠pass** without `E2E_USER_*`.
- **Missing:** gap-class misclassification regressions; live retrieval pilot assertions; two-account entitlement E2E.

---

## Incomplete / unused / disconnected (checklist)

1. **`gap_class` taxonomy** — incomplete (P0).
2. **`research_gap_evidence_links`**, **`research_gap_candidates`** — unused schema.
3. **Europe PMC** — missing.
4. **Retrieval → verify/dossier** — disconnected.
5. **Pilot B `signalsById` from Neon** — incomplete.
6. **`trial_signal` detector** — disconnected.
7. **SME `discovery_gap` work items** — unused kind.
8. **Entitlement provisioning API** — missing (ops SQL only).
9. **Export quota persistence** — reliability defect.
10. **Live multi-account Playwright** — blocked on creds.

---

## Risks (honesty)

- Collapsing curation debt into “scientific gap” or “opportunity” without class separation **misleads researchers**.
- Null hit counts coerced to zero would fabricate absence — current adapters avoid this; must keep.
- Reviewed decisions must never be auto-overwritten by re-detect/reclassify.
- Insufficient documented coverage must **block** confident `scientific_evidence_gap` claims.
- TI remains off; no prod deploy / Stripe without approval.
