# Melanoma Immunotherapy Evidence Explorer

The research-first vision now has an additive pilot at `/research#melanoma`.
It uses the existing single knowledge graph and melanoma trial fixtures; it does
not change HSI's RA/TNF scope or enable production Trial Intelligence.

The panel exposes typed mechanism relationships, linked atlas concepts,
KEYNOTE-006 and CheckMate 067 context, population/design/treatment-line fields,
primary publication and registry locators, biomarker limitations, and scoped
unknowns. Numeric outcome comparison remains in the existing experimental
Trial Intelligence surface; this panel does not infer cross-trial superiority.

Researchers can author a hypothesis, observable prediction, experiment/comparison
and falsification criterion, then select existing trial publications as context.
The JSON export includes the complete investigation path, graph versions,
timestamp, selected locators and limitations. Trial context is explicitly **not**
verified support for a proposed mechanism. Every export remains unreviewed and
unvalidated, with `claimSupport=not_assessed`, `kgWrite=false` and no clinical
advice. Drafts are page-memory only until downloaded; no account persistence or
database writes are implied.

## Remaining scientific work

CD8 exhaustion and immune escape need scoped retrieval, passage-linked claim
appraisal, contradictory evidence and human review before source-supported
mechanistic conclusions can be added. Biomarker assay thresholds remain
uncurated. No live search occurs in this worksheet. Source licences and
redistribution permissions require source-specific assessment.

The vision's citation accuracy (98%), grounding (90%), critical unsupported
claims (0), contradiction recall (80%), reproducibility (100%) and researcher
usefulness (80%) are proposed evaluation targets, **not measured results**.
A 50–100-question expert-reviewed benchmark, versioned gold judgements and
explicit denominators remain required. A deterministic export unit test does
not establish scientific reproducibility or these benchmark scores.

## Verification

`bun run typecheck`, `bun test src/test/melanoma-explorer.test.ts
src/test/phase-e-clinical-research.test.ts`, and `bun run build` cover the
implementation. Development-server browser smoke verification covers the visible panel, worksheet
export, real trial locators and narrow-screen layout. These checks do not
constitute independent scientific review or production approval.

The workbench on this route initializes after hydration because its existing
session factory generates time-dependent IDs. This prevents mismatched server
and browser draft identities from discarding form interactions.

The existing `vite preview` command currently looks for `dist/server/server.js`,
while this environment's default build emits a Cloudflare-module Nitro output.
It cannot be used as a production-runtime smoke check here. The generated
`.output/nitro.json` describes Wrangler preview/deploy commands; a target-specific
deployment check remains required. No deployment was performed for this increment.
