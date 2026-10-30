# Melanoma PD-1 pilot — scientific validation matrix

**Baseline:** `main` @ `3e815db` (+ post-audit commits noted in audit doc)  
**Scope:** Edges among `MELANOMA_INVESTIGATION_SEEDS` via `melanomaInvestigationPath` / typed relations  
**Stance:** Educational product — not CDS. No bulk approval performed.

## Legend

| Field | Meaning |
| --- | --- |
| Graph status | `evidence_status` on KG edge |
| Review | `relationshipProvenance.reviewStatus` (draft / unreviewed / …) |
| Neon Gate C | approved + supports + mapped `relationship_id` |
| Causal? | Whether predicate/mechanism language is legitimate as **causal** given evidence |

## Relationship matrix

| # | Subject → Predicate → Object | Polarity / context | Graph status / draft | Locators (KG) | Neon evidence | Causal legitimate? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | R011 PD-1 → `drives_immune_exhaustion_in` → D012 Melanoma | + / TME | ESTABLISHED / core | source_refs: `Dong 2002 Nat Med`; **no PMID on edge** | 1 row: PMID `12091876` DOI `10.1038/nm730`, curation=**unreviewed**, claim_support=**partial**, notes: Dong 2002 is B7-H1/PD-L1→apoptosis, **not** PD-1-as-subject driving exhaustion | **No** — subject/predicate mismatch vs cited paper; “drives” overclaims | **DEFECT** — ESTABLISHED + causal predicate without Gate C; Neon partial contradicts S-P-O |
| 2 | I008 Pembrolizumab → `treats` → D012 | − / clinical | ESTABLISHED / **draft** | no PMID | 0 rows | Clinical association well-known externally; graph lacks Gate C locator | **Unverified risk** — draft edge labelled ESTABLISHED |
| 3 | I009 Nivolumab → `treats` → D012 | − / clinical | ESTABLISHED / **draft** | no PMID | 0 rows | Same | **Unverified risk** |
| 4 | I025 Ipilimumab → `treats` → D012 | − / clinical | ESTABLISHED / **draft** | no PMID | 0 rows | Same | **Unverified risk** |
| 5 | TR003 KEYNOTE-006 → `has_clinical_context` → D012 | 0 / trial | ESTABLISHED / **draft** | no PMID | 0 rows | Associative OK if framed as trial context | **Incomplete** — draft; fixture PMID `25891173` not on edge |
| 6 | TR020 CheckMate 067 → `has_clinical_context` → D012 | 0 / trial | ESTABLISHED / **draft** | no PMID | 0 rows | Associative OK | **Incomplete** — draft; fixture PMID `26027431` not on edge |
| 7 | I008 → `blocks` → R011 PD-1 | − / TME | ESTABLISHED / core | source_refs: Ribas 2016; `KEYnote-006 NEJM 2019` (**year wrong** for primary) | Gate C: PMID `25891173` DOI `10.1056/NEJMoa1503093` approved+supports; + unreviewed unassessed candidate | Mechanism “blocks PD-1” is ligand-binding; KEYNOTE-006 is clinical efficacy — **support is clinical proxy, not molecular proof** | **Partial** — Gate C exists; mechanism prose stronger than locator; typo year in source_refs |
| 8 | I009 → `blocks` → R011 | − / none | ESTABLISHED / core | **`TO_BE_CURATED`** | 0 rows | Plausible class effect; **no durable id** | **DEFECT** — ESTABLISHED + TO_BE_CURATED |
| 9 | B011 PD-L1 expression → `measures` → R012 PD-L1 | 0 | ESTABLISHED / core | **`TO_BE_CURATED`** | 0 rows | Definitional; assay cut-offs explicitly stubbed | **DEFECT** — ESTABLISHED without locator; assay honesty OK elsewhere |
| 10 | I008 → `demonstrates_in` → TR003 | 0 / trial | ESTABLISHED / core | `Robert 2019 NEJM` (follow-up era; primary is 2015) | **rejected** PMID `31166680` (wrong paper — dabrafenib+trametinib) | Trial membership is non-causal | **DEFECT** — wrong PMID previously mapped; no approved Gate C after reject |
| 11 | TR003 → `evaluates` → I008 | 0 / TME | ESTABLISHED / core | **`TO_BE_CURATED`** | 0 rows | Inverse of #10; redundant | **DEFECT** — TO_BE_CURATED + ESTABLISHED |
| 12 | B011 → `predicts_response_to` → I008 | 0 | ESTABLISHED / medium conf | **`TO_BE_CURATED`** | 0 rows | Predictive language is **not** causal; still needs qualifier (enrichment ≠ decision rule); no assay cut-off | **DEFECT** — ESTABLISHED without evidence; predictive overclaim risk |
| 13 | I009 → `evaluates_in` → TR020 | 0 | ESTABLISHED / core | **`TO_BE_CURATED`** | 0 rows | Non-causal trial link | **DEFECT** |
| 14 | TR020 → `evaluates` → I009 | 0 | ESTABLISHED / core | **`TO_BE_CURATED`** | 0 rows | Non-causal | **DEFECT** |
| 15 | TR020 → `evaluates` → I025 | 0 | ESTABLISHED / core | **`TO_BE_CURATED`** | 0 rows | Non-causal (combo arm) | **DEFECT** |

## Pilot trials (fixture — educational)

| Trial | NCT | treatment_line (fixture) | Primary PMID / DOI | Endpoint honesty |
| --- | --- | --- | --- | --- |
| TR003 KEYNOTE-006 | NCT01866319 | Prior systemic ≤1; ipilimumab-naive | `25891173` / `10.1056/NEJMoa1503093` | ORR/PFS/OS rates verified; OS24 uses `28822576` |
| TR020 CheckMate 067 | NCT01844505 | Previously untreated / first-line | `26027431` / `10.1056/NEJMoa1504030` | PFS/OS5 verified; **ORR left null / unverified** (honest) |

**Neon DB:** `clinical_trials` present for TR003/TR020; **`treatment_line` column not applied (0018 missing)** — fixture overlay only at read time.

## Contradictory / qualifying notes

1. **REL-R011-drives_immune_exhaustion_in-D012:** Neon partial + curator note explicitly qualifies Dong 2002 against the graph S-P-O. Graph still shows ESTABLISHED.
2. **REL-I008-demonstrates_in-TR003:** Rejected wrong PMID; relationship remains ESTABLISHED without replacement Gate C.
3. **Biomarker B011:** Product correctly refuses invented assay cut-offs (`biomarkerAssayStance`); predictive edge still over-labelled ESTABLISHED.
4. **No bulk approval** was performed during this audit.

## Scientifically unreviewed (must stay unapproved)

- All draft `treats` / `has_clinical_context` melanoma edges (#2–#6).
- All `TO_BE_CURATED` edges (#8–#9, #11–#15).
- REL-R011…D012 pending SME rewrite of predicate/subject or claim_support.
- REL-I008-demonstrates_in-TR003 pending correct KEYNOTE-006 locator re-map (human only).
- Ask / brief outputs that cite these edges as Gate C.
