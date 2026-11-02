# M1 Biomedical Discovery Brief (Workflow B)

Scientific Intelligence MVP path on Immune Super Intelligence.

## Try it

1. Open `/ask`.
2. Ask a scientific mechanism question (e.g. “How does PD-1 blockade relate to melanoma?”).
3. After a graph-matched answer, click **Generate investigation brief**.
4. Optionally export JSON / Markdown.

Label: **Available research capability** — not HSI Clinical, not HSI Trials, not medical advice.

## Structure (`m1-2`)

- Question  
- Entities (resolved KG concepts + Atlas links)  
- Mechanisms (retrieved relationships)  
- Supporting evidence (reviewed PMIDs when present; never invented)  
- Contradictions and gaps (honest empty when none)  
- Limitations  
- Claim categories: Observed **N/A** (research-only); Established / Association / Inference / Hypothesis (**unvalidated**)  
- Cap 6 human-evidence comparison · Cap 10 unresolved contradictions · Cap 11 gap register (search-scope honesty)

## Code

- `src/lib/research/investigationBrief.ts` — build + validate + export  
- `src/components/immune/InvestigationBriefView.tsx` — UI  
- `src/components/immune/AskAtlas.tsx` — single chatbot action  
- Tests: `bun test src/test/m1-investigation-brief.test.ts`

## Golden eval (G-Ask / G-Mech v0.1)

- `src/lib/research/m1GoldenEval.ts` — frozen mechanism + refuse cases; automated baselines  
- `bun test src/test/m1-golden-eval.test.ts`  
- `expertReviewStatus=founder_sme_interim` · `targetsConfirmedBy=founder-authorized 2026-11-02` — protocol acceptance only; see `docs/M1_GOLDEN_EVAL_SME_SIGNOFF.md`  
- `baselinesOnly=true` — no invented Likert/κ/accuracy marketing; not clinical validation  
- Cap 6 / Cap 10 / Cap 11 companions required on mechanism pass cases  

Phase 4 workbench draft (`researchBrief.ts` / `/research#brief`) remains for manual concept-picker exports; M1 prefers Ask retrieval.
