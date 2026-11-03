# Landing-page research walkthrough

> Access update: the case demos and draft workbenches have moved to administrator-only `/internal-research`. Earlier public walkthrough URLs below describe the previous testing setup and no longer expose these tools. See [Internal research access](INTERNAL_RESEARCH_ACCESS.md).

Run the app with `bun run dev` using ISI's configuration, then open the local URL
printed by Vite. Start at `/`. These changes are on the feature branch until a
deployment is explicitly completed; the public domain may show an older release.

The Home hero has **Open research workbench**. Home, Explore, Platform
(`/platform` redirects to `/overview`) and Research share a four-step journey
card. Its links lead directly to the programme or to the relevant workbench
section. The programme also has six step links for navigating the record.

## Scenario: missing observation to reviewable investigation

1. Home → **Open research workbench**.
2. Choose **Type 1 diabetes**, then **SYN-P-T1D-002**.
3. Inspect the three visits, HbA1c report, specimen quality, lifestyle and
   background medication context. Missing observations remain missing.
4. Run discovery planning, then screen fictional trial criteria. The marker
   criterion is unknown; investigator review remains separate.
5. Open the what-if editor, set a valid marker value of 15 and sleep of 8 hours,
   and apply the change with a rationale. Previous results are cleared.
6. Rerun planning and screening. The marker check changes to satisfied. This
   does not establish eligibility, clinical benefit or a causal lifestyle effect.
7. Add an analyst note and download the dossier. It includes provenance, the
   changed record, edit history and the unvalidated plan/criterion assessments.

Use the existing melanoma section for publication-context exploration and its
separate local project save/restore. Use Ask Immune for general source-grounded
questions, with review status and uncertainty retained.

The interface uses concise product navigation while retaining fictional-data,
research-only and criterion-level labels where necessary. PRD/design/architecture
documents are implementation guides; they do not establish completed security,
scientific validation, production deployment or live trial integration.
