# Immune engine rules
- Links are identified as `REL-subject-relation-object` (`relId`) and evidence supports a link only via `evidence_records.relationship_id` + `claim_support`; status logic lives in `src/lib/immune/evidenceStatus.ts`; why: concept-level citations must never inflate link coverage.
- One global Scientific Inspector drawer (`src/lib/immune/inspector.ts` store, mounted in Shell) is opened via `inspect()` from any layer; why: one consistent, deep detail view.
