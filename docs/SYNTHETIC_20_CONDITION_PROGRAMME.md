# Interactive 20-condition research programme

Open `/research#synthetic-programme`. This is a functional synthetic research
workbench, isolated from the single knowledge graph, real evidence curation,
Ask retrieval and clinical systems. It is not a live clinical application.

## Dataset

The seeded generator produces 20 condition contexts, 120 fictional cases (six per
condition), 360 visits at days 0/30/90, 1,440 lab observations, longitudinal
lifestyle/immune measurements, background medication exposures and two fictional
screening protocols per condition (40 in total). It records generator version,
seed, fixed creation date, intended use and explicit `data_class: synthetic` on
the dataset and nested record objects. String cell tags are descriptive context,
not separate KG entities. The dataset is not epidemiologically calibrated.

| Domain | Condition contexts |
| --- | --- |
| Immunology | Rheumatoid arthritis; systemic lupus erythematosus; psoriasis; Sjögren’s syndrome; systemic sclerosis |
| Gut | Crohn’s disease; ulcerative colitis; coeliac disease; irritable bowel syndrome |
| Brain | Multiple sclerosis; autoimmune encephalitis; Alzheimer’s disease; Parkinson’s disease; major depressive disorder |
| Metabolic/endocrine | Type 1 diabetes; type 2 diabetes; Hashimoto’s thyroiditis; Graves’ disease |
| Allergy/barrier | Asthma; atopic dermatitis |

Not all of these are autoimmune diseases. Real condition, medication and immune
cell names are used to make navigation recognisable. The tags and combinations
are scenario context, not reviewed mechanisms, disease taxonomy, recommended
regimens or biological evidence. Values are random test measurements with units;
no clinical reference ranges, validated disease scores or efficacy conclusions
are supplied. No doses are recommended.

## Interactive workflow

1. Filter the catalogue by domain, condition, tissue or cell. Select a condition
   and one of its six case variants. Filtering alone does not change the selected case.
2. Inspect labs and symptoms across visits, including specimen timing, units,
   source IDs and planted missing/conflicting/stale results. Inspect lifestyle,
   comorbidities, family/exposure notes, adherence and immune measurements.
3. Run the discovery-planning demo. It records the engine/version/seed/input case,
   reports unusable observations and generates a structured research question,
   hypothesis, prediction, experiment, controls, confounders and falsification
   criterion. This is deterministic scenario planning: `aiInferencePerformed=false`,
   no model/provider, and no live literature retrieval. It is not a new chatbot.
4. Screen two fictional protocols. View criterion-level states and missing
   attributes, not a match score or eligibility claim.
5. Open the what-if editor. Change the latest marker value/quality or sleep
   observation and provide an edit rationale. Applying the edit validates the
   entire dataset, records before/after state and clears previous planning and
   screening output. Rerun the actions to inspect changed assessments.
6. Export a case dossier with the longitudinal record, notes, generator
   provenance, scenario edits, discovery plan and screening output. Dossier
   analysis is recomputed at export. Alternatively download the whole programme,
   edit a synthetic copy and reimport it (strict schema, maximum 5 MB).

Example: choose **Type 1 diabetes → SYN-P-T1D-002**. The latest marker is missing,
so its fictional criterion is unknown. Apply a valid synthetic marker value of
15 and rerun screening: that specific criterion becomes satisfied. Infection
screening and investigator judgement remain separate unresolved checks. The
case is never labelled eligible, and the edit does not imply any biological
prediction. A sleep edit changes the recorded context; no causal sleep model is run.

Data and notes are held in page memory. Download before leaving the page.
This programme does not imply authenticated storage, multi-user collaboration,
clinical monitoring or real-world trial matching. The existing melanoma demo's
separate local save/restore continues to work independently.

## Trial screening implementation

The browser-safe `trialsCriteriaMvp.ts` and its boundary dependency are vendored
**unmodified** from the pinned hsi-core commit recorded in
`src/lib/hsi/vendor/trials/provenance.json`. Tests check SHA-256 for both files.
These are shared substrate rules, not a second independently designed matcher.
Keep the vendor snapshot synchronized deliberately when updating the HSI engine.

The five states are `satisfied`, `not_satisfied`, `unknown`, `ambiguous` and
`requires_investigator_review`. Missing and stale marker values are withheld;
conflicting numeric results stay ambiguous. Narrative judgement is never
resolved by a numeric rule. Every report retains `confirmedEligible=false`,
`patientEligible=false`, no PHI and Planned product maturity.

The 40 protocol IDs start with `SYN-TRIAL-`, have no NCT IDs and are not registered
or recruiting studies. Thresholds are arbitrary workflow fixtures, not clinical
criteria. No real patient is screened, no trial site contacted and no enrolment
action taken. A real service requires complete, versioned protocol interpretation,
temporal criteria, safety/exclusion review, consent/site constraints, and an
investigator decision.

## Real-data replacement

Use the [handover guide](SYNTHETIC_PROJECT_AND_LAUNCH_DATA.md) and
[collection templates](launch-data/README.md) for source/claim/cohort/assay/search
data. For this broader programme, also supply:

| Layer | Real input required |
| --- | --- |
| Longitudinal research records | Lawfully usable research identifiers, consent/use constraints, diagnoses and onset dates, visits, units, specimen/report times, provenance and QC |
| Labs and immune assays | Assay/platform versions, validated reference/interpretation context where applicable, parent gating definitions, missingness and conflicting-source resolution |
| Lifestyle and exposures | Instrument definitions, collection dates, uncertainty and missingness; no causal claims from associations |
| Medication history | Actual exposure start/end, dose/route if within scope, adherence provenance, adverse events and confounders; no prescribing output |
| Mechanisms and discovery | Source-linked passages and exact graph mappings, expert appraisals, model/data versions, independent validation and realistic negative controls |
| Trials | Real registry IDs and refresh times, full protocol/version and eligibility criteria, recruitment/site status and investigator review |

Real clinical/patient records must not be uploaded into this synthetic adapter or
sent to research LLMs. Clinical storage, lawful research extracts and access
controls need separate approved integration paths; HSI remains a research
substrate, not a PHI store. The existing synthetic contract intentionally rejects
real-mode labels and extra patient-identification fields. A real adapter needs
source validation and authorization; changing a JSON label is not a migration.

Genomics, microbiome sequencing, pathology images, calibrated predictive models,
live registry ingestion, authenticated case storage and longitudinal clinical
care are not implemented by this increment. Public scientific benchmarks and
cross-account security tests cannot be replaced with these synthetic cases.

## Verification commands

```sh
bun run typecheck
bun test src/test/synthetic-programme.test.ts src/test/synthetic-project.test.ts src/test/melanoma-explorer.test.ts
bun run build
# With a local development server already running:
E2E_BASE_URL=http://127.0.0.1:4185 bun run test:e2e e2e/synthetic-programme.spec.ts e2e/synthetic-project.spec.ts --project=desktop --project=mobile --workers=1
```

Use ISI's own configuration. Clear inherited HSI database variables in this
shared environment. These tests require no database and do not exercise live
authenticated writes. The previously documented default preview/runtime mismatch
and production access gates remain separate from development-server browser checks.

Verified on 2026-11-03: 19 targeted tests passed across the programme, synthetic
melanoma project and melanoma explorer suites; TypeScript and production build
passed. The new programme browser journey passed on desktop and mobile, including
audited edits, changed criteria, plan invalidation and dossier download. The
existing synthetic melanoma browser journey also passed on both viewports.
These results establish synthetic workflow behaviour only, not clinical validity,
AI discovery performance, authenticated isolation or production deployment.
