# ISI Autonomous Scientific Evidence Intelligence 4.0 — architecture

**Baseline tip:** `a6de865` (Discovery 3.0 + five appraisal dossiers)  
**Version:** `4.0.0` (`INTEL4_VERSION`)

## Principle

Enhance Discovery 3.0. Do **not** rebuild Radar, KG, Ask, SME, Neon `evidence_records`, or working retrieval. Engineering screens stay labelled; humans own Gate C / `reviewed_opportunity`.

```text
Scout → Retrieve(reuse) → ClaimVerifier → CrossExam(A/B/C/D) → VerifiedGapEmit → ReviewRoute → ISI hooks
                              ↑ abstain
                     title-only / keyword-only / missing facets
```

## Modules (new)

| Module | Path | Role |
| --- | --- | --- |
| Literature Scout | `src/lib/discovery/scout.ts` | Reproducible strategies, synonym expansion, dedupe, budgets, idempotency, licensing notes, monitor/citation-chaining hooks |
| Claim Verifier | `src/lib/discovery/claimVerifier.ts` | Proposition ↔ passage; design/pop/intervention/outcome; support\|contradict\|background\|insufficient; abstain |
| Cross-examination | `src/lib/discovery/crossExamine.ts` | A Advocate / B Skeptic / C Methodology / D Adjudicator — no consensus-as-truth |
| Verified gaps | `src/lib/discovery/verifiedGaps.ts` | Opportunities only from documented uncertainty + testable questions |
| Review routing | `src/lib/discovery/reviewRouting.ts` | low / moderate / high → workbench / dossier / `/sme` |
| Orchestration | `src/lib/discovery/intel4.ts` | Budgets, decision records, ISI integration hooks, five-dossier runner |

## Reused (unchanged contracts)

- `retrieve.ts` / `adapters.ts` — PubMed, Europe PMC, CT.gov, rate limits, retries  
- `appraise.ts` — prior 3.0 screen; verifier may demote `support`  
- `pipeline.ts`, `opportunities.ts`, `persistRetrieval.ts`, `radar.ts`, `dossier.ts`, SME `/sme`  
- Ask grounding — prefill only; no fabricated cites  

## Guardrails

| Rule | Enforcement |
| --- | --- |
| No fabricated PMIDs/scores | Validators + fixture/live adapters only return API IDs |
| No auto Gate C / reviewed_opportunity | Policy consts + route `autoApprove: false` + migration CHECK |
| Title-only ≠ support | Verifier abstains |
| Keyword hit ≠ support | Require ≥3 facets for support; 2 → abstain |
| High confidence ≠ override | Routing escalates when evidence missing |
| No silent KG write | `integration.kg.silentWrite: false` |
| TI flag-off | `trialIntelligence.enabled: false` |
| Bounded runs | Scout + Intel4 budgets; scout idempotency keys |
| Additive Neon | Migration `0026_evidence_intel_4.sql` |

## Data (0026)

- `research_intel4_decisions` — versioned audit; `auto_approve` CHECK false  
- `research_intel4_scout_runs` — scout provenance / idempotency  
- Nullable claim columns on `research_gap_evidence_links`  

## Surfaces

- Dossier section **Evidence Intel 4.0** (`discovery.gaps.$gapId`)  
- SME deep links for high-risk routes  
- Scripts: `bun run discovery:intel4-validate`, `bun run db:evidence-intel-4`  

## Tests

`src/test/evidence-intel-4.test.ts` — abstention, routing, no auto-approve, scout idempotency, cross-exam independence.
