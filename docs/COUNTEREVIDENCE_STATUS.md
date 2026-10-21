# Counterevidence status (contradicts / partial)

**Date (UTC):** 2026-10-21  
**Neon production:** `immunecity` / branch `production`

## Live counts

| Metric | Count |
|--------|------:|
| `claim_support = contradicts` | **0** |
| `claim_support = partial` | **3** (incl. Chemnitz PMID 15240681 on `REL-R012-suppresses-C015`) |
| Gate C `approved` + `supports` | **9** distinct rels |

## Ask surface

- Curator sets `claim_support` to `partial` or `contradicts` on `/curation` (clearly labelled as counterevidence path).
- Ask loads these via `loadCounterEvidenceForRels` → `attachCounterEvidence` → `GroundingPanel` counterevidence bucket.
- Empty contradicts is an **honest empty set**, not a claim that literature agrees.

## Why we did not insert a fabricated `contradicts` row

A single “well-known debated edge” (e.g. PD-L1 IHC predicting pembrolizumab response) is **nuanced** in the literature: incomplete prediction and cutoff debates are usually **partial / context-limited**, not a clean polarity flip of the atlas edge. Without an SME reading that a specific paper **contradicts** a specific `relationship_id`, inventing or force-mapping a contradicts cite would fake scientific polarity.

**Decision:** leave `contradicts = 0`. Keep Chemnitz as `partial` (already in Neon). Curators may set contradicts only after reading a source that genuinely opposes the directional claim.

## Prove locally

Unit: `attachCounterEvidence` raises `coverage.counterEvidenceCount` and GroundingPanel label helper shows `N contradicts/partial` when count &gt; 0 (`src/test/ai-grounding.test.ts`).
