# Real-data collection templates

These header-only CSVs describe the data to gather. They are **not** production
imports and contain no invented real records. Leave unavailable optional fields
empty; do not invent IDs, passages, sample counts, thresholds or approvals.
Use UTF-8 and quote fields containing commas, quotes or newlines.

- `sources.csv`: one row per source/version. Record use rights before sharing passages.
- `claims.csv`: one row per claim-source assessment; opposing findings get their own rows.
- `cohorts.csv`: optional aggregate observations with a source and endpoint definition.
- `assays.csv`: optional assay definitions and missingness context.
- `searches.csv`: search scope and outcomes; distinguish failure from zero hits.

Use stable local handover IDs for joining files. PMID, DOI and registry IDs must
be real and verified. Graph IDs must already exist or remain unmapped candidates.
Do not include names, emails, dates of birth, medical record numbers or raw
patient samples. Reviewer identities/roles are provisioned and checked in the
authenticated application, not imported as a claimed approval from a spreadsheet.

See [the handover guide](../SYNTHETIC_PROJECT_AND_LAUNCH_DATA.md) for field mappings,
required backend work and launch gates. When these files are supplied, build and
verify a server-side conversion to existing candidate/curation contracts; never
feed them into the synthetic browser adapter or overwrite the single KG.
