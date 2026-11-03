# RA / anti-TNF research corpus

**Status:** `available_working_set` · `corpusKind=research_working_set` · `notForScientificClaim=true`

Bounded research working set for authenticated investigation workflows
(start → passage review → save → reload → export) while the rights-verified RA
evidence release remains `awaiting_verified_source_import`.

## Honesty

- Source labels: `RS-0001`, `RS-0002` (contract IDs: `SYN-RA-SRC-*`).
- Passage text is authored working-set content (CC0), not a quotation from any paper.
- Does **not** clear or invent Creative Commons URIs for real PMIDs 18375541 / 24586782.
- Does **not** invent SME labels, Gate C approval, MoU/legalBinding, or live CDS/PHI.
- Graph nodes are `SYN-*` mirrors of ISI `D001` / `I032` / `M001` for investigation workflows only.
- Scientific claim support remains unreviewed; workflow acceptance is not Gate C approval.

## Real pending path

See `../ra-anti-tnf/release.json` (`awaiting_verified_source_import`). Product loaders must
reject start against that release with `evidence_not_ready`.

## Scientific validation

Deferred to human licence/SME verification.
