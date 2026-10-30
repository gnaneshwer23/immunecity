# Discovery Intelligence rules
- Research Discovery Radar reuses one KG (`kg.json` + draft `extensions.ts`) — never a second graph and never mass node expansion for Discovery.
- Gap detection is deterministic from real ISI signals (melanoma matrix, evidenceGap, conflicts, trial linkage). LLM drafts explanations only; never invent PMIDs, papers, metrics, or auto-promote to `reviewed_gap`.
- Missing ISI evidence ≠ worldwide literature absence. Prefer status `coverage_insufficient` when Gate C / search signals are incomplete; never coerce unknown hit counts to zero.
- `research_profiles` are ownership-scoped like evidence collections — no casual admin list-all; no required sensitive PII.
- Entitlements `free` | `researcher_pro` are server-checked stubs only — no Stripe / payment activation in this surface.
- Gap reviews require scientific reviewer/admin power (same gate as evidence curation). Human review is mandatory before `reviewed_gap`.
- Phase 5 ranking is deterministic weighted factors (topic, mechanism, uncertainty, coverage, feedback, recency). Scores are navigation aids — never novelty or scientific importance claims. Feedback lives in `research_gap_feedback`.
- Phase 6 monitor adapters fail closed without live env flags; in-app alerts first (`/discovery/alerts`); email deferred. Monitor never implies automatic scientific review.
