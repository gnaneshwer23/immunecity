# Working synthetic project and real-data handover

> Access update: the case demos and draft workbenches have moved to administrator-only `/internal-research`. Earlier public walkthrough URLs below describe the previous testing setup and no longer expose these tools. See [Internal research access](INTERNAL_RESEARCH_ACCESS.md).

The functional research sandbox is at `/research#melanoma`, above the separate
published-trial reference context. It demonstrates a translational-team
investigation into PD-1 nonresponse. It contains no patient records and no real
trial outcomes. All fixture sources, quoted passages, findings and cohort counts
are invented and marked synthetic. Nothing from the sandbox enters the KG,
the curation database, Ask retrieval, public citations or scientific metrics.

## Try the full workflow

1. Open the melanoma section and choose **Load worked example**. This populates
   an editable hypothesis and retains both an exploratory and opposing finding.
2. Search/filter the six findings. Select records, inspect their source passage,
   context and limitation, and record a disposition with a rationale. These are
   analyst decisions in a simulation, not scientific approval.
3. Expand the two conflicting claim groups and inspect both sides. Compare the
   three fictional cohorts, including denominators, assay context and missingness.
4. Edit the hypothesis, prediction, experiment and falsification criterion.
5. Save locally, reload and restore. Saves belong to this browser and origin;
   they are not account storage. Pending analysis-note edits must be recorded
   before saving or exporting. Other project edits need **Save project locally**
   or an exported backup to survive navigation.
6. Export the JSON or Markdown brief. Both retain synthetic labels, source
   passages, decisions, version, limitations and the full conflict register.
   An unselected opposing finding is not silently removed from the register.
7. Export a project backup, reset, then restore the backup file. Download the
   dataset template, edit a copy, and import it to test another synthetic scenario.

File imports are strict JSON, at most 500 KB, with bounded record counts. They
reject real-mode labels, extra fields, duplicate IDs, missing sources, unknown
project references and impossible cohort counts. Invalid imports leave the
current project intact. The demo adapter deliberately accepts synthetic data
only; changing a label is not a route to production.

## Exactly what you need to supply

Start with a bounded melanoma/PD-1 corpus. You can supply public publication
metadata and licensed passages; a research evidence launch does not require
patient-level data. The CSVs in [launch-data](launch-data/README.md) are empty
collection templates, not an automatic production import format.

| Demo field / record | Supply for the real project | Validation before use |
| --- | --- | --- |
| `sources` / `SYN-SOURCE-*` | PMID or DOI where available, canonical source URL, title, authors, publication date, version/retrieval time, licence and permitted use | Resolve identifiers, deduplicate, record rights; metadata does not verify a claim |
| `evidence[].assertion`, `passage`, `locator` | Exact scoped assertion and legally usable supporting or opposing passage, page/table/figure/section, source ID | Human appraisal against that exact claim and study context; title-only records remain candidates |
| `claimId` / fixed scenario claim enum | Existing graph concept and exact `REL-subject-relation-object` relationship ID, or an explicit unmapped candidate | Verify graph IDs; unmapped claims do not contribute to relationship coverage; no new graph from this fixture |
| `direction` | Human assessment: supports, partial, contradicts, unrelated or unassessed, plus rationale | Separate from curation status, evidence quality and organism/design cues |
| `studyContext`, `limitation` | Disease setting, organism/model, design, sample size, treatment line/prior exposure, timing, caveats | Preserve differences that could explain disagreement; no automatic consensus |
| `cohorts` | Optional lawful aggregate research/trial data: cohort/arm ID, source locator, denominator, response definition/count, analysis set, follow-up, uncertainty, missingness | Reconcile source table and endpoint definition; never attach synthetic counts to real drug/trial names |
| `assay` / biomarker availability | Assay/platform/version, specimen and collection time, measured denominator, missing count, documented threshold if valid for intended use | No invented cut-offs; cross-assay comparability requires explicit justification |
| Demo `decisions` | Real reviewer identity/role, claim-specific assessment, rationale, timestamp, evidence/source version and audit history | Authenticated server-side reviewer/admin authorization; corrections invalidate stale approvals |
| Hypothesis/proposal | Researcher-authored explanation, prediction, comparison/controls, readouts, confounders and falsification criterion | Keep unvalidated; human scientific and experiment-specific review |
| Demo fixture coverage | Search terms, source/index, search date, inclusion/exclusion scope and retrieval outcome | Failed retrieval is not zero evidence; missing corpus coverage is not worldwide absence |

Do not replace the real KEYNOTE-006 or CheckMate 067 reference locators with
synthetic values. The existing reference section and synthetic scenario are
separate. Do not submit identifiable patient data in these files or to the
browser-only sandbox.

## Production wiring still required after data delivery

Data replacement is necessary but **not sufficient** to launch a real service.
The sandbox is functional locally; its save and decision controls do not stand
in for a multi-user backend or scientific sign-off.

- Import actual literature through the existing `literature_candidate_export`
  manifest and authenticated `/curation` server function. Claims begin
  unreviewed. `literatureWorkflow.ts` validates graph mappings; no synthetic
  exporter produces a production manifest. A mapping/import adapter for the
  handover CSVs still needs implementation and validation against the supplied data.
- Keep public relationship citations behind existing approved + supports + exact
  relationship matching. Human reviewers, not demo dispositions, decide this.
- Connect real project persistence to ownership-scoped server storage and test
  cross-account isolation, role enforcement, audit history, deletion, backup and
  recovery. Current sandbox persistence is localStorage only.
- Put licensed source ingestion and external retrieval on the server with
  bounded queries, credential handling, timeouts and failure states. This demo
  performs no live literature search and makes no LLM calls.
- If aggregate cohorts become part of the initial product, implement a separate
  validated real-data contract/source adapter. Do not relax the synthetic schema
  or switch on experimental Trial Intelligence solely to display real counts.
- Run the versioned 50–100-question expert benchmark. The vision's percentages
  remain targets; synthetic tests do not establish scientific accuracy or utility.
- Verify target-specific production runtime, canonical per-product database,
  authenticated writes and network access. HSI credentials must not be reused in
  ISI or Aksh. The previously recorded Neon/network and authenticated-DB gates
  are not resolved by this increment.

For a first real release, scope the product to publication-based research,
source-traceable investigation and reviewer-governed claims. If aggregate cohorts
are unavailable, omit that module rather than populate it with proxy numbers.
Do not advertise clinical decision support, trial matching or patient prediction
on the basis of this sandbox.

## Code and verification

- Fixture: `src/data/syntheticMelanomaProject.json`.
- Validation, conflict register, decisions and export: `src/lib/research/syntheticProject.ts`.
- UI: `src/components/immune/SyntheticMelanomaProject.tsx`.
- Unit tests: `src/test/synthetic-project.test.ts`.
- Browser journey: `e2e/synthetic-project.spec.ts` (desktop/mobile, using an existing local server).

Example checks:

```sh
bun run typecheck
bun test src/test/synthetic-project.test.ts src/test/melanoma-explorer.test.ts src/test/phase-e-clinical-research.test.ts
bun run build
# In another terminal: bun run dev --host 127.0.0.1 --port 4184
E2E_BASE_URL=http://127.0.0.1:4184 bun run test:e2e e2e/synthetic-project.spec.ts --project=desktop --project=mobile --workers=1
```

Use each product's own credentials only. Clear HSI database variables from ISI
commands in this shared environment. The existing default `vite preview` output
mismatch remains documented in `MELANOMA_EXPLORER.md`; development-server browser
checks and successful builds do not constitute production deployment verification.

Verified on 2026-11-03: TypeScript and production build passed; 21 targeted
tests passed across the synthetic project, melanoma explorer and Phase E suites;
the committed browser journey passed on desktop and mobile. It covers analysis
notes, brief downloads, reload/restore, backup import, invalid-import preservation
and recalculation after a changed synthetic dataset. This is engineering workflow
evidence only; no live data, database writes or production deployment were tested.
