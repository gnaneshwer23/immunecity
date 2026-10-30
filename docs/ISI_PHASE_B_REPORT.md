# ISI Phase B Report — Scientific graph model

**Date:** 2026-10-30  
**Product:** Immune Super Intelligence (educational — not CDS)  
**Baseline:** Phase A `40d9bbc`  
**Phase B commit:** `1e48f1a`  

---

## Summary

Phase B formalises the **single** curated knowledge graph (kg.json + draft extensions) with inventory, typed directional relations, empty-but-ready ontology mapping persistence, versioned provenance helpers, additive Neon tables (0017), a fail-closed backfill scaffold, and bounded neighbourhood retrieval. No second KG. No fabricated ontology accessions or approvals.

---

## Existing vs new functionality

| Area | Existing | New |
| --- | --- | --- |
| Graph SOT | `kg.json` + `extensions.ts` via `engine.ts` | `graphInventory.ts` documents persistence layers |
| Relation signs | `relation_semantics` in kg.json | `typedRelations.ts` — direction, polarity, context |
| Ontology | None | Empty seed + Neon `ontology_mappings` (curator-only backfill) |
| Provenance | Edge panel stubs in `graphPhase2.ts` | `graphProvenance.ts` + `graph_provenance_events` table |
| Neighbourhood | Ad-hoc `out`/`inn` / Ask grounding | Bounded `getGraphNeighbourhood` + server fn |
| Migrations | Through 0016 | **0017** additive ontology + provenance events |

---

## Files changed and migrations added

| Path | Role |
| --- | --- |
| `src/lib/immune/graphInventory.ts` | Canonical inventory |
| `src/lib/immune/typedRelations.ts` | Typed relations |
| `src/lib/immune/graphProvenance.ts` | Versioned provenance helpers |
| `src/lib/immune/neighbourhood.ts` | Bounded BFS neighbourhood |
| `src/lib/immune/neighbourhood.functions.ts` | Server/API wrapper |
| `src/data/ontologyMappings.ts` | Browser seed (empty) |
| `src/lib/db/schema.server.ts` | Drizzle tables for 0017 |
| `drizzle/migrations/0017_graph_ontology_and_provenance.sql` | DDL |
| `scripts/apply-graph-ontology-migration.ts` | Apply (ep-blue-salad, evidence count fail-closed) |
| `scripts/backfill-ontology-mappings.ts` | Dry-run by default; `--file` + `--apply` |
| `src/test/phase-b-scientific-graph.test.ts` | Regressions |
| `package.json` | `db:graph-ontology`, `db:ontology-backfill` |
| `src/lib/immune/AGENTS.md` | One-KG Phase B rule |
| `docs/ISI_PHASE_B_REPORT.md` | This report |
| `docs/ISI_EVIDENCE_GOVERNED_KG_BUILD.md` | Status update |

**Migration 0017:** `ontology_mappings`, `graph_provenance_events` — additive; does not touch `evidence_records` approvals.

---

## Tests executed and results

```text
bun test src/test/phase-b-scientific-graph.test.ts \
  src/test/phase-a-evidence-governed.test.ts --timeout 30000
```

**Result:** 24 pass / 0 fail (15 Phase B + 9 Phase A).

Not run here: live `bun run db:graph-ontology` (requires Neon ep-blue-salad + operator).

---

## Scientific claims requiring human review

- **All ontology crosswalks** — seed is empty; any future `--file` rows need curator verification before `review_status=approved`.
- Graph scientific content itself unchanged (no new nodes/edges/PMIDs in this phase).

---

## Known limitations / unresolved risks

1. Ontology table may be unapplied on Neon until `bun run db:graph-ontology` on ep-blue-salad.
2. Neighbourhood API does not yet stream evidence cites (Ask still uses `askGrounding`); Phase D wires GraphRAG denser.
3. `treatment_line` still fixture-overlay (Phase A limitation) — Phase E candidate.
4. Provenance reviewer fields remain “Not recorded” until evidence cites are passed in.

---

## Commit SHA and rollback

| Item | Value |
| --- | --- |
| Phase A | `40d9bbc` |
| Phase B HEAD | `1e48f1a` |

**Rollback:**

```bash
git revert <PHASE_B_SHA>
# DB (only if 0017 applied):
# DROP TABLE IF EXISTS public.graph_provenance_events;
# DROP TABLE IF EXISTS public.ontology_mappings;
```

Do not force-push published main (Lovable-connected).
