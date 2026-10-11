# Port the Immunology Atlas

The upload contains the same 10 page files as before. The files those pages depend on are still missing.

## Still needed from you
- `data/content` (CONTENT: lessons, routes, tissues, metabolism, hypersensitivity, cancerCycle, trialLessons, flags, rules, cases)
- `data/legacy` (LEGACY: cells, tcrSteps, tcrPerturbations)
- `lib/immune/engine` (KG graph, TYPES, SEM, byId, propagate, shortestPath, etc.)
- `components/immune/*` (ui, nav, InlineDetail, EdgeReference, graph/GraphNodeDetail, patient/TherapyDetail, evidence/ManifestImport, CurationStats, CurationTable)
- `lib/evidenceCheck`
- The stylesheet (classes like `page`, `card`, `lane`, `chip`, `hero`, `spine`)

If any can't be found, I'll recreate it with sample data and note it.

## Pages (one address each)
```text
/                Overview
/learn           Cell atlas
/mechanism/$id   Cascades
/graph           Knowledge graph (D3)
/dynamics        Tissue, metabolism, genetics
/disease         Hypersensitivity, cancer cycle
/evidence        Trials timeline
/curation        Citation curation (needs login + saved records)
/patient         Precision immunology
/reasoning       Case reasoning + path tracer
```
Shared top navigation, each page with its own title and description.

## Technical details
- Swap react-router-dom for TanStack Router (`Link`, `useNavigate`, `validateSearch` for `focus`, `sim`, `mode`, `from`, `cell`).
- Convert to TypeScript; keep the original CSS as a global stylesheet, mapped to theme tokens.
- D3 graph runs only in the browser (load after hydration). Add `d3`.
- Curation: replace Base44 with Lovable Cloud — an `evidence_records` table, sign-in, admin role check, and a server function that queries PubMed/Crossref.
- Build order: data + engine + shared UI, then static pages, then Graph, then Curation.
