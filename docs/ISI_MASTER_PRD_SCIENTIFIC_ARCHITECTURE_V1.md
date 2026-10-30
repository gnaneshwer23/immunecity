# ISI Master PRD — scientific architecture (requirements summary)

**Source document (local):** `~/Downloads/ISI_Master_PRD_Scientific_Architecture_v1.docx`  
**Version summarised:** 1.0 · 29 October 2026  
**This file:** faithful requirements / architecture summary for the repo — not a verbatim copy of the Word document.

Canonical product site: https://www.immune-super-intelligence.co.uk/

## Decision

One evidence-governed immunology platform with progressive depth:

1. **Immunology OS** — learning journeys (retain).
2. **Immune City** — central causal / typed graph (retain).
3. **Trial Intelligence** — embedded graph capability (not a standalone product).
4. **Research Workbench** — only after provenance, review and trial data are validated.

North-star (pilot): In metastatic melanoma, which immune-escape mechanisms associate with PD-1 inhibitor response or resistance, which biomarkers and trials support those relationships, and what is unknown?

## Explicit non-goals (pilot)

- Comprehensive trial database or cross-trial **superiority** conclusions.
- Clinical decision support / autonomous trial design / predictive efficacy claims.
- Auto-approval of AI drafts into the curated graph.
- Community content → knowledge graph.
- Wholesale `/api/v1` rewrite when extending the existing TanStack Start stack is enough.

## Canonical entities (target)

Relational identity + provenance; graph projections for exploration.

Relevant to this increment: **ClinicalTrial → TrialArm → EndpointResult** (plus population / biomarker / endpoint definitions as later depth). Endpoints need arm, subgroup, follow-up, definition, analysis set, publication and uncertainty. Trial-to-trial displays are **contextual**, never causal comparative efficacy.

## Melanoma pilot path

Unresectable/metastatic melanoma → TME / immune escape / CD8 dysfunction → PD-1/PD-L1 & CTLA-4 → pembrolizumab, nivolumab, ipilimumab → **KEYNOTE-006** / **CheckMate 067** → arm-level outcomes, safety, biomarker context, evidence quality.

Initial endpoints: ORR, PFS, OS, response duration, CR, grade 3–5 AEs.

## P0 functional requirements (this foundation)

| ID | Requirement |
| --- | --- |
| P0-F03 | Trial arm, population, endpoint and result schemas — two audited source-backed trials |
| P0-F06 | Trial comparison warnings before outcome interpretation |
| P0-F07 | Feature-flagged rollout / rollback without breaking the graph |

Related backlog tickets: ISI-007 / ISI-008 (import verified KEYNOTE-006 & CheckMate 067), ISI-011 (trial detail), ISI-012 (contextual comparison), ISI-014 (flags).

## Evidence honesty

- Educational / research positioning — **not CDS**.
- No invented NCT / PMID / DOI / endpoint numerics.
- Unverified values stay null and labelled.
- Association ≠ causation; cross-trial compare is contextual.

## Implementation note (repo)

P0 Trial Intelligence foundation ships as:

- Additive Neon/drizzle tables `clinical_trials`, `trial_arms`, `endpoint_results` (`drizzle/migrations/0015_clinical_trial_intelligence.sql`).
- Browser-safe loaders in `src/data/trialIntelligence.ts` linked to graph nodes `TR003` / `TR020`.
- Feature flag `VITE_TRIAL_INTELLIGENCE=1` (`src/lib/trialIntelligenceFlag.ts`).
- Atlas trial panel + Methods honesty (`TrialIntelligence` component).

**Registry correction:** KEYNOTE-006 is **NCT01866319**. NCT02263508 is MASTERKEY-265, not KEYNOTE-006.
