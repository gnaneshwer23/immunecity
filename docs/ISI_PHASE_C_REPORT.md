# ISI Phase C Report — Evidence intelligence

**Date:** 2026-10-30  
**Baseline:** Phase B `1e48f1a`  
**Phase C commit:** _(after commit)_  

## Summary

Strengthens source-backed claim records, publication locators, conflict detection, orthogonal evidence dimensions, and a scientific review queue with audit summarisation — on the **existing** Neon evidence pipeline. No mass approvals. No invented PMIDs.

## Existing vs new

| Existing | New |
| --- | --- |
| `evidenceInvariants` / Gate C rules | `claimRecords.ts` — locators, classification, silent-approval guard |
| `relationshipEvidenceQueue` candidates | `scientificReviewQueue.ts` — prioritised human review queue + audit summary |
| `EvidenceDimensionsStrip` | Tests assert three axes remain orthogonal |
| Curation server `computeEvidenceUpdate` | Unchanged; tests reaffirm non-supports cannot approve |

## Files

- `src/lib/immune/claimRecords.ts`
- `src/lib/immune/scientificReviewQueue.ts`
- `src/test/phase-c-evidence-intelligence.test.ts`
- `src/lib/immune/AGENTS.md`
- This report + master plan update

**Migrations:** none (uses existing evidence / audit tables).

## Tests

```text
bun test src/test/phase-c-evidence-intelligence.test.ts --timeout 30000
```

**Result:** 9 pass / 0 fail (see combined run in Phase D report if bundled).

## Scientific claims requiring human review

All `ready_for_supports` queue items; all conflicting relationships; any ontology/evidence approve outside this engineering pass.

## Limitations

- Review queue is a view-model — curation UI wiring to `buildScientificReviewQueue` is optional follow-up.
- Passage locators only exist when curator-recorded (`passage_span`); never scraped here.

## Rollback

`git revert <PHASE_C_SHA>` — no DB DDL in this phase.
