# Ask Immune — evaluation harness

Targeted Vitest cases for Ask Immune retrieval, refusals, citation validation, and provisional-literature labelling. Prefer these over a hanging full-suite run (D-11).

## Run (fast)

```bash
# Core grounding + scientific eval set (includes Ask Immune cases)
bunx vitest run src/test/ai-grounding.test.ts src/test/mechanism-reasoning.test.ts

# Optional PRD smoke (same eval set + a few unit checks)
bun scripts/smoke-prd-a2.ts
```

Do **not** rely on live PubMed/Europe PMC in CI — provisional fetch is soft-fail and rate-limited. Unit tests use `attachProvisionalLiterature` fixtures only.

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

## Honesty constraints (do not regress)

- Status stays **partial** in `capabilityStatus` — never claim fully evidence-grounded.
- Provisional hits are **unreviewed literature** only; never auto-upgrade to Gate C `approved` / `supports`.
- Humans unlock “evidence-backed” via curator Gate C on P0 edges — see `docs/CURATOR_EVIDENCE_QUEUE.md`.
