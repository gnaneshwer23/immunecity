# Hybrid retrieval benchmark (ISI-007)

**Status:** Baseline harness only — **no vector DB added**  
**Script:** `bun scripts/benchmark-retrieval-baseline.ts`  
**Architecture ref:** Layer D in `docs/ISI_INTELLIGENCE_ARCHITECTURE_V1.md`

## What this measures

Current Ask retrieval: normalised lexical/alias concept match (`relevantNodes`) + typed graph neighbourhood (`graphContext`). Outputs mean must-hit recall on eval cases that declare `mustRetrieveNodeIds`, plus latency.

## What this does not claim

- Not OpenScholar / SciNet parity
- Not a dense-retrieval bake-off (no embeddings index in-repo)
- Offline runs have Gate C counts of 0 (Neon not loaded) — that is expected

## Decision gate

Add a vector store or graph DB **only** if a measured dense/rerank experiment on the same case set beats this baseline on recall@k and cost with a written memo. Until then, keep graph + lexical (+ provisional lit adapter).

## Residual

Dense/rerank adapters remain **planned**. This harness is the measurable starting line.
