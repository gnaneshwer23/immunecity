# Close the atlas gaps

The analysis found gaps in four areas: citations, missing topics, model realism, and planned-but-unbuilt features. They are built in phases so each one can be checked before the next starts.

## Phase 1 — Citations reach the atlas
- Approved citations from Citation curation show on the matching graph links, cascades, therapy details and trial pages. They replace "citation pending curation".
- Each link shows its evidence level (established, evidence-supported, emerging) and a badge when its only source is a hand-written reference.
- New "Evidence coverage" panel on the Evidence page: share of links cited, by concept type, with the most-used uncited links listed first.
- A **Suggest sources** button in curation, for admins. For each of the 152 empty slots it runs a PubMed search from the concept name and its links, then lists the top candidates. Nothing is approved automatically.

## Phase 2 — Missing topics (from your roadmap)
New concepts and links, each with a short description, marked "emerging" until cited:
- **Microbiome & barrier:** commensals, short-chain fatty acids, Treg induction, barrier breach, dysbiosis in IBD.
- **Vaccines:** adjuvants, germinal centre, memory B/T cells, mRNA vaccines.
- **Transplantation:** alloreactivity, rejection types, graft-versus-host disease, calcineurin inhibitors.
- **Primary immunodeficiencies:** about 10 main conditions (SCID, CGD, XLA, CVID, complement defects), each linked to the cell or pathway that fails.
- **Frontier topics:** CAR-T in autoimmunity, EBV and MS, tissue-resident macrophage states, residual inflammatory risk, AI-discovered targets, each linked into the graph.
- One new lesson and one teaching route for each new area.

## Phase 3 — More realistic reasoning
- **Tissue per link:** where a link happens (blood, gut, skin, lymph node, tumour). The graph can filter by tissue, and what-if results can be limited to one tissue.
- **Effect strength per link:** a measured weight where a trial or study gives one, otherwise the current confidence-based value. What-if results show which links used measured values.
- **Patient modifiers:** child, older adult, pregnancy and immunosuppressed settings that change the reasoning rules on the Patient page.
- **Simulator:** add memory formation and T-cell exhaustion, so chronic infection and re-infection behave differently. Add a "compare two runs" view.

## Phase 4 — Quality checks
- A graph health report for admins: concepts with no links, links with no source, contradictory signs, and concepts no lesson uses.
- Automated tests for the propagation, path finding, citation matching and simulator.

## Needed from you
- Real effect sizes or default slider values if you have them; otherwise I use published values and mark them as my picks.
- Confirmation that new content I write (Phase 2) can be marked "draft, needs expert review".

## Technical details
- Phase 1: public read of approved `evidence_records` via a server function with the publishable client and a narrow SELECT policy for `curation = 'approved'`; merged into edges at runtime by `node_id` and edge key. Suggestion search runs in `evidenceCheck.ts` (PubMed E-utilities), results stored in `check_detail`.
- Phase 2: additions go in a separate `src/data/kg-extensions.json` merged in `engine.ts`, so the user's `kg.json` stays the source of truth. New IDs use distinct prefixes.
- Phase 3: optional `tissue` and `weight` fields on edges; `propagate()` uses `weight` when present and accepts a tissue filter. Simulator ODE gains memory and exhaustion compartments in `sim.ts`.
- Phase 4: vitest specs under `src/test/`; health report as an admin-only section in `/curation`.
