# Case-to-graph investigation

The programme at `/research#synthetic-programme` embeds an interactive view of
the existing single KG. It does not add case records, invented disease links or
another graph database.

Select a condition/case, then use **Connected knowledge graph**. Click a visual
node or a concept button to explore its bounded two-hop neighbourhood. Filter by
cell, molecule, receptor, pathway, biomarker, intervention or trial (and other
existing graph categories). Direction and predicate remain visible in the
relationship table; visual lines show connectivity only, not causal direction.
Previous concept returns through exploration history. Return to condition anchor
resets the view; Return to case scrolls to the selection without discarding data.

Inspect current concept or Inspect relationship evidence opens the existing
Scientific Inspector. Full Atlas opens in another tab so the investigation stays
intact. The export includes the selected graph anchor, bounded concept/edge
snapshot and graph versions beside the separate fictional case dossier.
`approvedReviewIncluded=false` means the export is not a certified review snapshot.

Exact condition anchors currently exist for RA, SLE, psoriasis, MS, type 1
diabetes, asthma, atopic dermatitis and coeliac disease. Crohn's and UC navigate
to broader IBD context, explicitly not subtype-specific evidence. Other programme
conditions show unmapped coverage; users can search any existing graph concept
as an exploration anchor, which does not create a disease association.

The explorer is capped at 60 concepts and 100 relationships. Missing categories
describe bounded KG coverage, not worldwide absence. Traversal is undirected
navigation, not a mechanistic/causal proof. Graph evidence labels remain separate
from approved support counts. Approved support requires the existing exact
relationship + approved + supports rule. If the evidence service is unavailable,
support remains unknown; it is not displayed as zero or approved. The approved
source query is not a complete counterevidence search; inspect and review each
relationship before drawing scientific conclusions.

No graph relationship establishes the biology of the selected individual. Real
clinical trial nodes in the graph remain separate from fictional protocol
screening. This increment does not grant eligibility or enable live CDS.

Verification: `bun test src/test/case-graph.test.ts`, `bun run typecheck`,
`bun run build`, plus `e2e/synthetic-programme.spec.ts` on desktop/mobile. The
browser journey starts at Home and opens/closes the shared graph inspector before
continuing the case what-if, screening and dossier-export workflow.
