# ISI Discovery Intelligence — Phase 3–4 report

**Date:** 2026-10-30  
**Baseline tip before this slice:** `24d241b`  
**Surfaces:** `/discovery`, `/discovery/gaps`, `/discovery/gaps/$gapId`, `/discovery/profile`, `/discovery/onboarding`

## Audit (what was in-memory)

| Surface | Before | After |
| --- | --- | --- |
| `research_profiles` | Already Neon CRUD (0019), ownership-scoped | Unchanged — still owner-only |
| Radar / gap **list** | Deterministic detection only (`persistent: false`) | Neon merge when rows exist; detection fills keys; `persistent` flag honest |
| Gap **persist** | Server fn existed; reviewer-gated; UI did not call it | Signed-in member may persist; idempotent upsert by `gap_key`; never overwrites `reviewed_gap` / `rejected` |
| Dossier | Detection + light Neon status peek | Full dossier VM: verification, coverage rows, review trail, Ask prefill, deep links |
| Verification | Absent | Deterministic `verify.ts` + `verifyPersistedGap` writes `research_search_coverage` + change events |
| Subscriptions | Schema only | `toggleGapSubscription` (in_app; `researcher_pro` stub; email deferred) |

## Phase 3 — Scientific verification (engineering)

- Coverage taxonomy enforced via existing `gapStatus` + `assertDetectionEmitStatus`.
- Never auto `reviewed_gap` (detection, persist, verification, review transition guards).
- Provenance checks: documented search scope, graph id resolution, no fabricated PMIDs in `detectionDetail`.
- Conflict context from detection labels / graph `evidence_status`.
- Search coverage drafts keep `hitCount: null` when unknown.
- Optional AI draft path is labelled `{ labelled: true, role: "draft_only" }` and never changes status.
- Human decisions still go through `recordGapReviewDecision` → `research_gap_reviews` + versions + change events (reviewer/admin only).

## Phase 4 — Research Radar UI

- Radar feed: status filters, badges, why-it-matters snippets, review/persist labels.
- Emerging / contradiction sections driven only by real candidate labels (empty when none).
- Dossier sections: why, scope, verification, coverage, review trail, continue links (Ask/Atlas/Evidence/Workbench/Pipeline/Therapy — no duplicate UIs).
- Persist + verify + follow controls on dossier (auth-gated; entitlement stub for follow).
- Premium styling via `isi.css` Discovery tokens (badges, library list, verify list).

## Tests

- `bun test src/test/discovery-intelligence.test.ts` — isolation, transitions, coverage, entitlements, verification, dossier/radar merge.
- Playwright Discovery journey extended (public structure + optional dossier smoke); authenticated paths remain **skip ≠ pass** without `E2E_USER_*`.

## Non-goals held

No Stripe activation, no Vercel deploy, no graph mass-expansion, TI flag off, no fabricated papers/PMIDs, no live PubMed/CT.gov ingest.

## Remaining (see also `ISI_DISCOVERY_REMAINING.md`)

- Curator panel reuse of ScientificReviewQueue for gap queue (dossier has inline review actions).
- Live PubMed adapter behind rate-limit + real hit counts.
- Email alerts; billing activation; SME gold-set scoring.
- Live multi-account Playwright green with credentials.
