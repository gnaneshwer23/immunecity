# Cap 6 / 10 / 11 audit note (2026-11-02)

## SHIPPED

| Slice | Status | Module | Tests |
|-------|--------|--------|-------|
| **M1** Biomedical Discovery Brief | SHIPPED (audited) | `investigationBrief.ts` `m1-2` | `m1-investigation-brief.test.ts` |
| **Cap 6** Human evidence prioritisation | SHIPPED | `humanEvidencePrioritisation.ts` | `cap6-human-evidence.test.ts` |
| **Cap 10** Scientific contradictions | SHIPPED (depth) · confirmed green 2026-11-02 | `contradictionReport.ts` `cap10-2` + `contradictionGoldPairs.ts` | `cap10-contradictions.test.ts` (9/9) |
| **Cap 11** Research gaps + scope honesty | SHIPPED (depth `cap11-2`) | `researchGapRegister.ts` | `cap11-research-gaps.test.ts` |

## Audit checks

- No invented PMIDs; citation fail-closed retained on M1 sections; gold pairs use `TO_BE_CURATED` or real edge refs only.
- Cap 6: no species field invent; Gate C ≠ organism cue; no human>preclinical auto-rank.
- Cap 10: `majorityVote=false`, `silentMerge=false`, `firstClassContradictsRelation=true`; Finding `CONTRADICTS` Finding gold pairs retain both sides + tissue/method/population when recorded; honest empty allowed.
- Cap 11: mandatory search-scope note; `notWorldwideAbsence=true` on every entry; `cap11-2` priority bands + Cap 10 cross-links + suggested next steps + atlas paths.
- Ask stays single chatbot; companions render inside `InvestigationBriefView` (Cap 10 shows Side A / Side B).
- Neon isolation untouched; no kg.json graph replace (relation_semantics +`CONTRADICTS` only); no MoU invention.

## Try

1. Open ISI `/ask`.
2. Ask about IL-17A / IBD / Crohn or anti-TNF Crohn (infliximab vs etanercept).
3. **Generate investigation brief**.
4. Scroll Cap 10 — first-class CONTRADICTS items list both sides; optionally Export Markdown.
5. Scroll Cap 11 — priority bands, Cap 10 cross-links, next steps, Atlas links.

## NEXT TO BUILD

SME gold sign-off / partner MoU remain **human gates**. Engineering: deepen clinical/trials demos, or polish hsi-core `/gateway` beyond the current stub.
