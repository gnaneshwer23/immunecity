# ISI Discovery Intelligence — architecture reuse audit

**Date:** 2026-10-30  
**Baseline tip:** `e5526d6` (`origin/main`)  
**Product:** Immune Super Intelligence (ISI)  
**Mandate:** Evidence-governed personalised Research Discovery Radar — audit before structure; no second KG; no fabricated science; no mass graph expansion.

## 1. Verdict

ISI already has the building blocks for a **Research Discovery Radar** as an Investigate-journey surface that **reads** the curated graph + Neon evidence/trials + Ask grounding honesty — without inventing a parallel knowledge store.

| Layer | Reuse? | Notes |
| --- | --- | --- |
| Knowledge graph | **Reuse only** | `src/data/kg.json` + draft `extensions.ts` via `engine.ts`. Do **not** expand nodes for Discovery. |
| Evidence / Gate C | **Reuse** | `evidence_records`, audit trail, claim candidates, `evidence.functions.ts` |
| Evidence-gap honesty | **Reuse + extend** | Browser-safe `evidenceGap.ts` labels + coverage taxonomy |
| Scientific review | **Reuse pattern** | `listScientificReviewQueue` / `recordScientificReviewDecision` → gap reviews |
| Ask Immune | **Link / explain** | Grounding in `askGrounding.ts`; dossier CTAs to `/ask` with concept prefill |
| Trial Intelligence | **Read signals only** | Flag stays **off** in prod; fixtures + Neon rows when present |
| Melanoma pilot | **Pilot A source** | Matrix + honesty demotions → candidate gaps only |
| Auth / roles | **Reuse** | Neon Auth + `user_roles` (`user` / `moderator` / `reviewer` / `admin`) |
| Collections / Workbench | **Link** | Own collections; Workbench drafts stay localStorage |
| Community / Academy / OS | **Preserve** | No Discovery writes into community or Academy progress |

## 2. Route & IA map (current)

### Journeys (`JOURNEY_NAV` in `src/data/marketingNav.ts`)

- **Learn:** Ask, Atlas, Overview, Cell atlas, Academy, Mechanisms  
- **Explore:** Graph, Dynamics, Disease, Therapy  
- **Investigate:** Simulator, Reasoning, Research library, Evidence, Patient, Pipeline  
- **Trust:** Methods (+ hashes)

**Discovery placement (proposed):** single Investigate item **I7 — Research Radar** → `/discovery` (submenu children for onboarding/profile/gaps stay off the primary header to avoid clutter). Profile/onboarding reachable from Radar chrome, not new header primaries.

### Authenticated shell

- `src/routes/_authenticated/route.tsx` — Neon Auth gate; redirect to `/auth?redirect=…`  
- Curation UI: `_authenticated/curation.tsx`  
- Member workspace: `/workspace` (account menu, not journey header)

### Key public/product routes to preserve

`/ask`, `/atlas/$id`, `/graph`, `/research`, `/evidence`, `/reasoning`, `/methods`, `/simulator`, community/*, Academy, Trial Intelligence panels (flagged).

## 3. Schema & migrations (Neon / Drizzle)

**Canonical schema:** `src/lib/db/schema.server.ts`  
**Additive SQL:** `drizzle/migrations/0000`…`0018` (latest: ontology/provenance + `treatment_line`).

| Table / area | Role for Discovery |
| --- | --- |
| `user_roles` | Reviewer/admin for gap review decisions |
| `evidence_records` + `evidence_audit_events` | Coverage signals; never invent PMIDs |
| `claim_candidates` | Literature candidates ≠ reviewed claims |
| `evidence_collections` | Member-scoped research sets (pattern for profile isolation) |
| `clinical_trials` / `trial_arms` / `endpoint_results` | Pilot trial linkage signals |
| `ontology_mappings` | Empty-by-design; do not fabricate crosswalks |
| `graph_provenance_events` | Optional change_event linkage later |
| `community_*` | **Out of scope** for gap truth |

**Next migrations (planned):** `0019_research_profiles.sql`, `0020_research_discovery_gaps.sql` — additive only. See `ISI_DISCOVERY_DATA_MODEL.md`.

## 4. Evidence & coverage honesty (must preserve)

From `src/lib/research/AGENTS.md` + `evidenceGap.ts`:

- Missing ISI evidence ≠ worldwide absence.  
- `searchAttempted` without numeric hits → **unknown**, never coerced to zero.  
- Missing Gate C counts → `insufficient_coverage` / Discovery status `coverage_insufficient`.  
- Copy must cite **ISI curated coverage / search date-scope**.

## 5. Ask / retrieval

- Browser-safe guardrails: `askGrounding.ts` (unit-tested).  
- Server Ask: `ask.server.ts` + rate limits.  
- Discovery **must not** claim novelty from Ask answers alone; LLM may draft *question wording* after deterministic detection — never auto-promote to `reviewed_gap`.

## 6. Scientific review reuse

| Existing | Discovery analogue |
| --- | --- |
| Claim queue snapshot | Gap review queue (reviewer/admin) |
| `recordScientificReviewDecision` + audit | Gap status transition + `research_gap_reviews` / versions |
| No auto-approve | Gaps stay `candidate` / `coverage_insufficient` until human review |
| Melanoma checklist UI | Surfaces matrix flags as candidates only |

## 7. Auth & entitlement stubs

- Account isolation pattern: `collections.functions.ts` (`requireNeonAuth` + `requireMember` + `user_id` filter; no casual admin list-all).  
- Roles: `src/lib/access/roles.ts` — Discovery entitlements are **orthogonal** stubs (`free` vs `researcher_pro` JSON/flag on profile), **server-checked**, **no Stripe / payment activation**.  
- Signup must not grant write/moderation or pro entitlement.

## 8. Melanoma / pilot signals (honest candidates only)

Documented in `ISI_MELANOMA_PILOT_VALIDATION_MATRIX` (+ TS export):

- Honesty demotions / draft ESTABLISHED / S-P-O mismatch / missing locators / Gate C proxy.  
- Detection may emit **`candidate`** or **`coverage_insufficient`** rows with documented search scope — **zero fabricated gaps**; never `reviewed_gap` without human review.

## 9. Explicit non-reuse / defer

- No second KG or vector DB.  
- No continuous PubMed/CT.gov ingestion at scale (adapter interfaces + rate-limit hooks only).  
- No email alerts, Stripe, mass ontology fill, assay cut-offs, SME gold-set auto-scoring.  
- No prod deploy; TI prod flag stays off unless already gated.  
- No bulk Gate C / gap approve.

## 10. Risk register

| Risk | Mitigation |
| --- | --- |
| Overclaiming “unknown biology” | Coverage taxonomy + status `coverage_insufficient` |
| Graph expansion under Discovery | Detection reads existing ids only; AGENTS forbid mass nodes |
| Cross-account profile/gap leakage | Same ownership pattern as collections |
| Auto-promotion via LLM | Deterministic emit → candidate; review mandatory |
| Entitlement bypass | Server-side stub checks only |

## 11. Deliverable mapping (prompt items 1–12)

| # | Item | Doc / code home |
| --- | --- | --- |
| 1 | Architecture audit | This file |
| 2 | Capability matrix | `ISI_DISCOVERY_CAPABILITY_MATRIX.md` |
| 3 | PRD | `ISI_DISCOVERY_INTELLIGENCE_PRD.md` |
| 4 | Data model | `ISI_DISCOVERY_DATA_MODEL.md` |
| 5 | Agent orchestration | `ISI_DISCOVERY_AGENT_ORCHESTRATION.md` |
| 6 | Research profiles | Phase 1 code + `0019` |
| 7 | Gap schema + detection | Phase 2 code + `0020` |
| 8 | Review integration | Gap review fns + queue patterns |
| 9 | Radar / dossier UI | Phase 3–4 (stretch) |
| 10 | Entitlement stubs | Server checks, no billing |
| 11 | Tests + Playwright honesty | Unit + e2e skip≠pass |
| 12 | Backlog update | `ISI_DISCOVERY_REMAINING.md` + remaining after fix-pass |
