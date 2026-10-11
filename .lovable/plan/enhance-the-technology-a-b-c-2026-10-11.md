# Enhance the technology: A + B + C

Three enhancements, each shippable on its own, in this order so each can be checked before the next starts.

## A — Biomarker inputs on the Patient page
- Add a biomarker panel to Layer 10 (Patient): PD-L1 %, tumour mutational burden, and lymphocyte count as sliders/inputs alongside the existing checkboxes.
- New rules in the rule set translate biomarker values into therapy effects (e.g. high PD-L1 strengthens checkpoint-inhibitor support), shown rule-by-rule like today.
- Values stay explainable: every score change names the biomarker and threshold that caused it.

## B — Export from Graph and Simulator
- Layer 04 (Graph): export the current view as Cytoscape JSON, GraphML, and a CSV of nodes/links (respecting the active tissue/type filters).
- Layer 05 (Simulator): export the run as CSV (all compartments per day) and a JSON summary (parameters, treatments, outcome).
- Downloads happen in the browser; no server work needed.

## C — Live metadata on Therapy and Cell cards
- A server function queries ClinicalTrials.gov and UniProt for live data.
- Therapy cards (Layer 08) show live trial phase and status for their linked trials; cell atlas entries show gene/protein metadata from UniProt.
- Results are cached and the pages still work if the external services are unreachable (they fall back to the curated data).

## Checks
- Tests extended for the biomarker rules and export shapes; typecheck and build stay clean; browser check of Patient, Graph, Simulator and Therapy pages.

## Technical details
- A: new flags/rules in `src/data/extensions.ts` (draft-tagged), slider state in `src/routes/patient.tsx`; thresholds are my picks from published literature and marked as such until you send real cut-offs.
- B: serializers in `src/lib/immune/export.ts` (nodes/links → Cytoscape JSON, GraphML XML, CSV); download via Blob URLs in `GraphView` and `InfectionSim` toolbars.
- C: `src/lib/liveData.functions.ts` (public read-only server function) calling ClinicalTrials.gov v2 API and UniProt REST; responses trimmed to plain DTOs, cached in-memory server-side, graceful fallback on failure.
