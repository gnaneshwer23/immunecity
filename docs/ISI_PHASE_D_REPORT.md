# ISI Phase D Report — Ask Immune GraphRAG (partial)

**Date:** 2026-10-30  
**Status:** Partial engineering complete — full eval/SME gold-set still open  

## Summary

Ask grounding (`askGrounding.ts`) now retrieves **bounded graph neighbourhood paths** (`GRAPH_NEIGHBOURHOOD` / `NPATH`) from the top matched concept via Phase B `getGraphNeighbourhood`, surfaces `EVIDENCE_CONFLICT` when Gate C supports and counterevidence coexist, and bumps `PROMPT_VERSION` to `ask-grounding-v11`. Still one Ask path. Still abstains on clinical-personal. Still rejects invented concept ids.

## Existing vs new

| Existing | New |
| --- | --- |
| Concept match + causal chains + Gate C cite lines | Bounded neighbourhood NPATH lines |
| Conflict via review status on edges | Explicit `EVIDENCE_CONFLICT` when both polarities present in cites |
| `ask:quality` harness / SME gold set | Unchanged process — SME sign-off still required |

## Files

- `src/lib/askGrounding.ts` (v11 + neighbourhood + conflict lines)
- `src/test/phase-d-ask-graphrag.test.ts`
- `src/test/ask-quality-loop.test.ts` (version bump)
- This report

## Tests

```text
bun test src/test/phase-d-ask-graphrag.test.ts src/test/ask-quality-loop.test.ts --timeout 30000
```

## Scientific claims requiring human review

Ask gold-set (`docs/SME_GOLD_SET_SIGNOFF.md`). Do not claim fully evidence-grounded AI.

## Limitations / risks

- Neighbourhood is depth-1 / max 12 from top seed — not full multi-hop GraphRAG ranking.
- Eval metrics (citation precision, unsupported-claim rates) still via existing harness; not expanded numerical dashboard in this pass.
- Full `bun run ask:quality` optional follow-up if OOM on build.

## Rollback

`git revert <SHA>`; Ask falls back to prior prompt version behaviour.
