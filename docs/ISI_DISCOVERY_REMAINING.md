# ISI Discovery Intelligence — remaining backlog

**Date:** 2026-10-30  
**Shipped baseline:** Discovery Phase 0 docs + Phase 1 profiles + Phase 2 detection/scaffolding on `main` (see commit after this note).  
**Related:** `ISI_REMAINING_AFTER_FIXPASS.md`, `ISI_DISCOVERY_INTEL_AUDIT.md`.

## Shipped (engineering)

| Item | Notes |
| --- | --- |
| Phase 0 docs (audit, matrix, PRD, data model, orchestration) | `docs/ISI_DISCOVERY_*.md` |
| `research_profiles` migration 0019 + server CRUD | Ownership-scoped; entitlement stub |
| Gap suite migration 0020 + types/status taxonomy | Includes `coverage_insufficient` |
| Deterministic Detect (Pilots A/B) | Matrix + evidenceGap; never `reviewed_gap` |
| Gap review decision fn | Reviewer-gated; version + audit events |
| Routes `/discovery*` + Investigate I7 | Radar, onboarding, profile, gaps, dossier |
| Unit tests | Isolation, transitions, coverage, entitlements |
| Adapter stubs | Literature/trial interfaces; no live ingest |
| Neon apply 0019/0020 on ep-blue-salad | See `docs/ISI_NEON_0019_0020_APPLY.md`; schema-only, evidence=46 unchanged |

## Intentionally deferred / SME-blocked

| Item | Why |
| --- | --- |
| Live PubMed / CT.gov continuous ingestion | Designed adapters only |
| Email alerts | Subscriptions table + channel stub only |
| Stripe / researcher_pro billing | Server entitlement stub; **no payment activation** |
| Mass ontology fill / assay cut-offs | Fabrication-forbidden / prior backlog |
| Gate C / KEYNOTE rematch / gold-set SME scores | Human scientific review |
| Bulk gap approve | Explicitly refused |
| TI prod flag / Vercel deploy | Out of scope |
| Live multi-account Playwright green | Needs `E2E_USER_*`; skips ≠ passes |

## Next engineering (when unblocked)

1. Curator UI panel for gap review (reuse ScientificReviewQueue patterns).  
2. Wire dossier “Ask prefill” from gap subject/object ids.  
3. Empty eval harness for future SME gold-set scoring (no invented scores).  
4. Optional thin live PubMed adapter behind rate-limit gate + coverage rows.
