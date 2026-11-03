# SME labelling protocol v1 (RA context benchmark)

Version: `hsi-ra-context-annotation-benchmark-1`  
Guideline: `context-annotation-guideline-v1.md`  
Status: ready for SME kickoff — **no expert labels are supplied in-repo**

## Roles

| Role | Duty |
| --- | --- |
| Annotator A / B | Label assigned passages independently using the double-blind packet |
| Adjudicator | Resolve disagreements only; record final tags + rationale |
| Operator | Rights-check release, scaffold empty rows, freeze evaluation partition |

## Process

1. Confirm the rights-verified release (`parseRaEvidenceRelease`) before minting
   `evaluation_frozen` or `training_candidate` rows.
2. Scaffold empty worksheet rows (`bun run ra:scaffold-annotation`).
3. Issue double-blind packets A and B (peer labels omitted).
4. Annotators fill tags + grounding spans from the passage only.
5. On disagreement, open an adjudication record; do not silently overwrite A/B.
6. Keep guideline clarifications in a training change log; do not rewrite frozen
   evaluation rows after lock.

## Practice vs evaluation

- `practice_not_evaluation` may use the research working set for calibrating
  annotators. It **must not** enter frozen evaluation or measured accuracy.
- Proposed 200-abstract / 85% / 40% targets remain milestones, not results.

## Forbidden

- Fabricating labels, scores, or licence URIs
- Promoting practice rows into evaluation
- Gate C / KG writes from annotation outcomes
- PHI or clinical advice in worksheets
