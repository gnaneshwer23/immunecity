# Context annotation guideline v1 (RA / anti-TNF evidence review)

Version: `hsi-ra-context-annotation-guideline-1`  
Protocol: `ra-anti-tnf-response` / protocol version `1`  
Status: worksheet template for a future expert benchmark — **no expert labels are supplied here**

## Purpose

Prepare independent labelling and adjudication of biological context for retrieved
abstract passages. This guideline does not approve scientific claims, invent
passage text, grant licences, or write to any knowledge graph. Workflow acceptance
in product investigation UIs is not Gate C approval.

## Scope boundary

- Question under review: RF/anti-CCP serostatus evidence in rheumatoid arthritis
  anti-TNF response research.
- Existing ISI relationships `REL-I032-treats-D001`, `REL-I032-targets-M001` and
  `REL-M001-contributes_to-D001` are **related context only**. They are not exact
  serology-response support and must not be auto-voted as contradictions or
  approvals against serology passages.
- A null biomarker–response association is **not** evidence against anti-TNF
  efficacy in RA. Keep those frames separate.

## Required tags (each grounded in a source passage)

Annotate every selected passage for:

| Tag | Allowed values | Notes |
| --- | --- | --- |
| species | `human` / `mouse` / `other` / `missing` / `mixed` | Use `mixed` only when the same paragraph asserts more than one without separation. |
| tissue_or_sample | free text or `missing` / `mixed` | Synovium, serum, plasma, PBMC, etc.; quote the grounding span in the worksheet. |
| setting_or_model | `clinical_observational` / `clinical_trial` / `meta_analysis` / `in_vitro` / `in_vivo` / `in_silico` / `missing` / `mixed` / `other` | Do not infer study design beyond the passage. |
| intervention | free text or `missing` / `mixed` | Agent class or named anti-TNF when stated; do not expand beyond the text. |
| outcome | free text or `missing` / `mixed` | Response definition, DAS28, ACR, etc., only if stated. |
| timepoint | free text or `missing` / `mixed` | Follow-up duration when stated. |

Missing or mixed context must remain explicit. Do not back-fill from titles,
reference lists, prior knowledge or KG neighbourhood text.

## Independent labelling and adjudication

1. Two annotators label each passage independently using
   `context-annotation-worksheet-v1.json`.
2. Disagreements go to a third adjudicator who records a final tag and rationale.
3. Training corrections (guideline clarifications) stay in a separate change log;
   frozen evaluation rows are not silently rewritten.
4. Do not fabricate expert labels, inter-annotator scores, or accuracy claims.
   The proposed 200-abstract set and 85%/40% targets remain **proposed milestones**,
   not validated results.

## Rights and provenance before labelling

Only passages from a release that passes `parseRaEvidenceRelease` may enter a
frozen evaluation set. Pending releases (`awaiting_verified_source_import`) are
out of scope for labelling. Preserve PMID/PMCID/DOI, licence URI, authors, title,
locator, paragraph hash and source version on every worksheet row.
