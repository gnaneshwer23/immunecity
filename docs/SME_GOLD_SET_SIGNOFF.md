# SME gold-set sign-off — Immune City

**Status:** ⏳ **Awaiting SME** (cannot be completed by AI or engineering alone)  
**Scope:** Public educational beta — not clinical decision support  
**Automated starter set:** `src/test/eval/scientific-eval-set.ts` (50 cases)  
**Harness:** `bun scripts/sme-gold-set-status.ts`

---

## What this is

A fixed scientific evaluation set used to catch regressions in Ask grounding, path reasoning, clinical/omics abstentions, and citation hygiene. Engineering can run the automated checks; an immunology SME must **sign off** that expected answers and prohibitions remain scientifically acceptable for educational beta.

## What AI / engineering must not do

- Do not mark this checklist complete without a named human SME.
- Do not invent PubMed IDs, DOIs, or “approved” claim assessments to pass Gate C.
- Do not claim clinical CDS readiness even after sign-off.

## Automated vs human

| Item | Owner | Status |
|------|-------|--------|
| Run `bun scripts/smoke-prd-a2.ts` (50 eval cases) | Engineering | Runnable locally |
| Expand toward PRD 100+ expert items | SME + eng | Open |
| Confirm path/endpoint expectations are graph-true | SME | ☐ Awaiting SME |
| Confirm refusal/abstention wording is appropriate | SME | ☐ Awaiting SME |
| Confirm no unsupported therapeutic conclusions | SME | ☐ Awaiting SME |
| Sign below | SME | ☐ Awaiting SME |

## Review checklist (SME)

1. Spot-check at least **10 path cases** (TNF–RA, checkpoint, IFN–SLE, BAFF, neutrophil) against the live graph.
2. Confirm **clinical-refusal** and **omics-abstention** cases refuse before any model call.
3. Confirm **citation-validation** cases reject invented PMIDs / fake concept links.
4. Confirm unsupported / gibberish cases do not invent atlas content.
5. Note any case whose expected path is educational-but-misleading; file a defect rather than silently passing.
6. Optional: propose ≤20 additional gold questions for the next expansion toward 100+.

## Sign-off

| Field | Value |
|-------|--------|
| SME name | _awaiting_ |
| Affiliation / role | _awaiting_ |
| Date (UTC) | _awaiting_ |
| Starter set version | 50 cases in `scientific-eval-set.ts` |
| Smoke result attached | ☐ |
| Decision | ☐ Accept for educational beta · ☐ Accept with defects · ☐ Reject |
| Defect IDs (if any) | |
| Signature / confirmation | _awaiting SME_ |

---

## Engineering command

```bash
bun scripts/sme-gold-set-status.ts
bun scripts/smoke-prd-a2.ts
```

Until the table above is filled by a human SME, Gate E remains **CONDITIONAL** and this document must stay **Awaiting SME**.
