# Ask Immune — evaluation harness

Targeted Vitest cases for Ask Immune retrieval, refusals, citation validation, and provisional-literature labelling. Prefer these over a hanging full-suite run (D-11).

## Run (fast)

Prefer the PRD smoke harness (avoids hanging full Vitest / D-11):

```bash
# Ask quality harness (gold-set + retrieval + prompt contract + fabricated PMID refusal; fails if broken)
bun run ask:quality

# Scientific eval set + Ask unit checks (preferred smoke)
bun scripts/smoke-prd-a2.ts

# SME sign-off status (unsigned until a human SME signs)
bun run sme:status

# Hybrid retrieval baseline (no vector DB)
bun run benchmark:retrieval

# Optional targeted Vitest (may hang in some environments — skip if stuck)
# bunx vitest run src/test/ask-quality-loop.test.ts src/test/ai-grounding.test.ts
```

Do **not** rely on live PubMed/Europe PMC in CI — provisional fetch is soft-fail and rate-limited. Unit tests use `attachProvisionalLiterature` fixtures only.

**SME / Gate C (human process — not automated in these phases):**

- `docs/SME_GOLD_SET_SIGNOFF.md` remains awaiting a named human expert. Engineering expansion of graph-true cases does **not** constitute sign-off.
- Gate C claim approvals stay curator-only (`docs/CURATOR_EVIDENCE_QUEUE.md`). Do not mass-approve or invent PMIDs.
- Admin Ask quality dashboard on Methods shows redacted gate outcome rates by `PROMPT_VERSION` only — never personal-health question text.

## What the suite covers

| Kind | Intent |
|------|--------|
| `path` / `multi-concept` | Graph retrieval (synonyms, multi-concept, chains/links) |
| `unsupported` | Honest abstention when no graph match |
| `clinical-refusal` | Personal clinical / dosing refused without model |
| `omics-abstention` | Omics adapters not wired |
| `classification` | Query classes (source_lookup, comparison, perturbation, …) |
| `citation-validation` | Invented PMIDs/IDs rejected; provisional PMIDs allowed only when attached |
| `provisional-labelling` | Source-lookup / empty-reviewed path triggers provisional policy + SYSTEM honesty |
| Academy neighbourhoods (Phase 3) | TLR4↔NF-κB, IL-6↔tocilizumab, NLRP3↔IL-1β, PD-1↔pembrolizumab — existing graph ids only |

## Honesty constraints (do not regress)

- Status stays **partial** in `capabilityStatus` — never claim fully evidence-grounded.
- Provisional hits are **unreviewed literature** only; never auto-upgrade to Gate C `approved` / `supports`.
- Humans unlock “evidence-backed” via curator Gate C on P0 edges — see `docs/CURATOR_EVIDENCE_QUEUE.md`.
- SME gold-set sign-off remains **awaiting human** (`docs/SME_GOLD_SET_SIGNOFF.md`) — engineering must not forge acceptance.
- Expand toward PRD 100+ only with graph-true `mustRetrieveNodeIds` / refusal expectations — never invent PMIDs or therapeutic claims to pad the set.
- Hybrid retrieval baseline: `bun scripts/benchmark-retrieval-baseline.ts` (no vector DB until measured need).
