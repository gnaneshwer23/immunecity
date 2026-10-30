# ISI UX language audit — scientific intelligence, not developer chrome

**Date:** 2026-10-30 (updated after simplification finish pass)  
**Scope:** Public + authenticated researcher / SME / Discovery / collections / curation primary UI  
**Rule:** If a string helps only engineers, hide it behind Technical details / expert panel.

## North star

Researchers see scientific questions, mechanisms, evidence, uncertainty, and next actions.  
Agents, pipeline stages, DB IDs, and infra names stay background (expert panel).

## Inventory (route → offending → replacement)

| Route / surface | Offending (primary) | Replacement |
| --- | --- | --- |
| `/sme` | SME review workspace, Gate C chrome, `pending_sme`, Neon reuse | Scientific review workspace; awaiting review; evidence curation / Discovery |
| `/sme` workspace | `gapKey`, autoApprove/autoRematch/TI in Facts, raw `SME-…` titles | Focused candidate; safeguards in Technical details; SPO / human titles |
| `/sme` actions | Evidence UUID / Neon queue counts as primary | Select evidence record; UUID in Technical details |
| `/discovery` | Persist detection to Neon; detection only; melanoma_matrix; stub billing notes | Save research candidates; New research candidates; `detectionSourceLabel`; `sanitizeDiscoveryFeedNote` |
| `/discovery/gaps` | Neon statuses merged; Detection-only; raw `gapKey · detectionSource` | Saved statuses included; New candidates; `detectionSourceLabel`; id under Technical details |
| `/discovery/gaps/$gapId` | Persisted in Neon; snake_case verify ids; Intel 4 primary | Saved to research workspace; `verificationProvenanceLabel`; Evidence intelligence details (collapsed) |
| `/discovery/onboarding` | Hardcoded `D012` / `checkpoint` / `pd1` placeholders | Empty + concept search; optional domain/modality keywords |
| `/discovery/alerts` | engineering signals; targets/signals/alertsInserted; reviewed_gap | Change notices; “Checked N questions…”; reviewed research gap |
| `/discovery/profile` | Billing stub as primary Fact | Availability copy; billing string in Technical details |
| Evidence collections | `R001, P001, TR003` typing; Neon / evidence_id / localStorage / kgWrite=false | Concept search picker; eng honesty in Technical details |
| Curation queue | Neon-backed lede; mono `evidence_id` in primary cell | Scientific review lede; evidence_id under Record id fold (`expert-panel`) |
| `/research` hub | Tool dump; PHASE E / WORKBENCH STEPS; Neon/localStorage ledes | Discover ladder → Evidence → library spine → contextual tools; sync/device language |
| Workbench | E2E spine; kgWrite/autoPromote primary | Guided path; provenance in ExpertDetails |
| Research brief | Neon evidence_id placeholders; kgWrite primary | ConceptIdPicker; evidence ids + kgWrite in ExpertDetails |
| `/evidence` | live-neon TOC; Open citation curation as primary | Live coverage; Methods link for readers |
| Ask progress | Pipeline-ish “Retrieving graph context…” | Intent-aware `askProgressLabel` (“Gathering related concepts…”) |
| Contextual Research routes | `Investigate ·` kickers | `Research ·` kickers |
| Academy / Community | Navigable/Unfinished; database empty; raw moderation URL | Available now / In development; deployment empty; Moderation link text |

## Interaction rules applied

1. One primary action per major section (dossier: Save **or** Verify; collections: Save collection; Research: Open Research Radar).
2. Raw graph ID entry replaced with searchable concept labels where users previously typed ids.
3. Provenance / Intel 4 / billing stubs / kgWrite live under `data-testid="expert-panel"` (or surface-specific expert testids).
4. Design tokens: `isi.css` expert + concept-picker + `.isi-loading` / `.isi-empty` patterns; no new purple AI-slop theme.

## Tests

- `src/test/ux-language.test.ts` — primary SME / dossier / collections / Research / workbench / brief sources must not reintroduce eng leaks (expert panels allowed).
- `src/test/ask-gateway-intent.test.ts` — progress copy + bounded follow-ups.
- Existing Discovery / SME / auth-member / hardening tests updated for new copy.

## Remaining debt

- Gold-set case notes still often include relationship ids in prose.
- Melanoma pilot matrix table remains dense / engineering-adjacent (expert surfaces only).
- Full dossier visual redesign (typography / evidence narrative layout) beyond copy+IA.
- Server entitlement error strings may still say “billing not activated” (API honesty); primary UI uses `sanitizeDiscoveryFeedNote` / availability copy.
- Some admin import/manifest strings still mention engineering workflows (acceptable on curator-only surfaces).
