# Stage 1 — Full product audit (ISI master brief, Phase One)

Goal: a written review of every page on the site before any redesign, so later stages fix real problems in the right order. No visible site changes in this stage.

## What gets reviewed
Every page that actually exists (about 35), including Home, Overview, Vision, Learn/Academy, Graph, Mechanisms, Simulator, Dynamics, Disease, Therapy, Evidence, Methods, Patient, Reasoning, Research, Research Workbench, Scientific AI, Insights, Platform, Collaborate, Curation, Sign-in, and legal pages.

For each page:
- Who it is for, and what they come to do (Learn / Explore / Investigate)
- How you get there and where you go next
- What is missing or broken
- Visual inconsistencies (colours, type, spacing, controls)
- Scientific risks: unreviewed claims, missing or concept-only citations, wording that overstates what the AI does
- Problems on phone, tablet and desktop (checked with screenshots at 3 sizes)

Also checked across the whole site:
- Whether the 12 layers and the 15-step chain (LOOP shown as feedback, not a 16th step) are used consistently
- Duplicate or overlapping pages (e.g. Evidence vs Methods vs Evidence-Methods, Research vs Research Workbench, Learn vs Academy)
- Design styles, shared building blocks, and leftover/duplicate code
- Sign-in and saved data: still waiting on the Neon keys, so curation is reviewed from the code only
- Basic accessibility and loading speed

## What you get
1. An audit report saved as a downloadable document (one row per page, plus site-wide findings), ranked by impact.
2. A short ordered plan for Stages 2–5 (look and feel, homepage, science pages, accessibility and checks) based on the findings.
3. Open questions for you, e.g. which duplicate pages to merge.

## Technical details
- Route list from `src/routes`; data sources traced through `src/data/*`, `src/lib/immune/*`, `src/lib/*functions.ts`.
- Playwright screenshots at 390, 820 and 1280 px widths; console errors captured per page.
- Existing tests run as a baseline (`bunx vitest run`).
- Report written to `/mnt/documents/isi-audit.md`; the brief's milestones tracked in `roadmap.md`.
