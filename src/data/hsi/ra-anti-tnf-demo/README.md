# RA / anti-TNF DEMO fixture corpus

**Status:** `available_demo_only` · `corpusKind=demo_fixture` · `not_for_scientific_claim=true`

This corpus exists so authenticated product investigation UIs can exercise
start → passage review → save → reload → export while the real RA evidence
release remains `awaiting_verified_source_import`.

## Honesty

- Fixture labels: `DEMO-PMID-0001`, `DEMO-PMID-0002` (contract IDs: `SYN-DEMO-PMID-*`).
- Passage text is authored fixture content (CC0), not a quotation from any paper.
- Does **not** clear or invent Creative Commons URIs for real PMIDs 18375541 / 24586782.
- Does **not** invent SME labels, Gate C approval, MoU/legalBinding, or live CDS/PHI.
- Graph nodes are `SYN-*` mirrors of ISI `D001` / `I032` / `M001` for workflow tests only.

## Real pending path

See `../ra-anti-tnf/release.json` (`awaiting_verified_source_import`). Product loaders must
reject start against that release with `evidence_not_ready`.

## Scientific validation

Deferred to human licence/SME verification. Demo workflow success is engineering
readiness only.
