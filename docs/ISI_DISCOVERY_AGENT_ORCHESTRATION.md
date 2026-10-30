# ISI Discovery Intelligence — agent orchestration

**Principle:** Deterministic detection owns truth claims. LLMs assist wording and ranking explanations only. Nothing becomes `reviewed_gap` without a human reviewer.

## Pipeline (Detect → … → Monitor)

```text
Detect → Normalise → CoverageCheck → CandidateEmit → (optional) ExplainDraft
      → HumanReview → Version → Subscribe/Feedback → Monitor
```

| Stage | Owner | Inputs | Outputs | LLM? |
| --- | --- | --- | --- | --- |
| **Detect** | Deterministic services | Graph edges/status, `evidenceGap`, melanoma matrix, conflict counts, trial linkage (fixtures/Neon) | Raw findings with provenance | No |
| **Normalise** | Deterministic | Findings | Stable `gap_key`, title seed, ids | No |
| **CoverageCheck** | Deterministic | Gate C counts, search coverage state | `candidate` vs `coverage_insufficient` | No |
| **CandidateEmit** | Server fn / job stub | Normalised + coverage | Upsert `research_gaps` at candidate statuses only | No |
| **ExplainDraft** | Optional Ask/brief helper | Gap + profile interests | Suggested “why it matters” / next question **draft** | Yes (draft, unreviewed) |
| **HumanReview** | Reviewer/admin | Gap + evidence links | Status change + `research_gap_reviews` + version snapshot | No (human) |
| **Subscribe / Feedback** | Member | gap_id | Subscription/feedback rows; feedback influences ranking only | No |
| **Monitor** | Cron / server fn | Followed gaps + profile interests + adapters | Change events, versions, in-app alerts (email deferred) | No |

## Deterministic detectors (v1)

### Pilot A — Melanoma matrix / path

- Source: `ISI_MELANOMA_PILOT_VALIDATION_MATRIX` + `melanomaInvestigationPath`.  
- Emit when flags include `S_P_O_MISMATCH`, `DRAFT_ESTABLISHED`, `NO_LOCATOR`, `GATE_C_PROXY`, `REJECTED_PMID`, or verdict `DEFECT` / `Unverified risk`.  
- Status: always `candidate` (or `coverage_insufficient` if Neon Gate C counts unavailable).  
- Scope note: “Melanoma pilot validation matrix / ISI curated graph — not exhaustive PubMed.”

### Pilot B — Evidence-gap / conflict

- Source: `classifyEvidenceGap` + incident edge statuses.  
- Map labels:  
  - `insufficient_coverage` → gap status `coverage_insufficient`  
  - `no_mapped_evidence` / `awaiting_curation` / `conflicting` / `emerging` / `no_direct_evidence_after_search` → `candidate` with `coverage_label` set  
- Never coerce unknown search hits to zero.

### Honesty demotions / conflict edges

- Read existing graph `evidence_status` and claim_support signals already demoted in code/docs.  
- Do not invent new demotions as Discovery “discoveries.”

## LLM roles (strict)

| Allowed | Forbidden |
| --- | --- |
| Draft dossier narrative from cited gap fields | Invent PMIDs, NCT IDs, metrics |
| Suggest next questions tagged `unreviewed` | Auto-promote status |
| “Recommended because…” from profile interests (template + light rewrite) | Claim novelty without novelty assessment + review |
| Summarise linked ISI evidence ids already on the gap | Expand the curated KG |

Reuse Ask grounding / research brief fail-closed citation rules when any LLM path is wired.

## External adapters (Phase 6 MVP)

```ts
interface LiteratureSearchAdapter {
  search(query: string, opts: { since?: string; limit: number }): Promise<{
    attempted: true;
    hitCount: number | null; // null = unknown
    scopeNote: string;
    source: "stub" | "fixture" | "pubmed_live" | "ctgov_live" | "fail_closed";
  }>;
}

interface TrialRegistryAdapter {
  lookup(nctOrQuery: string): Promise<{ attempted: true; hitCount: number | null; scopeNote: string; source: string }>;
}
```

Implementations: stubs + fixtures + optional live PubMed/CT.gov behind `DISCOVERY_LIVE_PUBMED` / `DISCOVERY_LIVE_CTGOV` (fail closed). Rate-limit + retries. No fabricated PMIDs. Cron: `bun run discovery:monitor`.

## Review integration

- Gate with `accountPowers(...).reviewer` (same as curation).  
- Decisions: `promote_reviewed` | `reject` | `needs_context` | `demote`.  
- Always append `research_gap_reviews` + bump `research_gap_versions`.  
- Engineering refuses bulk/auto approve (mirror evidence path).

## Entitlements (stub — Phase 7)

| Plan | Server behaviour |
| --- | --- |
| `free` | Own profile; limited radar + personalised preview; 0 followed gaps; 1 monitor run/day; no export |
| `researcher_pro` | Broader filters / feed / follows / export — **flag only**, no Stripe |
| `team` | Higher quotas stub; shared profiles / collab **scaffolding only** (not activated) |
| `enterprise` | Highest quotas stub; same collab scaffolding hold |

Quotas (followed gaps, monitor runs/day, exports/day) are enforced in server functions (`assertQuotaAllows`), not by hiding UI alone. Honest copy: “Researcher Pro — billing not activated”. Orthogonal to `user_roles`. Checks live in server functions; UI may hint but never trust client.

## Observability

- Append `research_gap_change_events` on emit, review, and re-detect.  
- Do not log raw clinical PII; profiles avoid sensitive fields by design.
