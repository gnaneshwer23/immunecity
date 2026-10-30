# Ask Immune — entry points

Ask Immune is **one primary chatbot**, not a family of embedded chat widgets.

## Canonical surfaces

| Surface | Path / host | Persistence | Role |
|---------|-------------|-------------|------|
| Full Ask page | `/ask` (`AskAtlas` + `persistKey=isi-ask-conversation`) | Browser localStorage | **Main chatbot** — concept match → grounded answer → handoff links to Atlas / Discovery / Workbench / path tracer |
| Corner assistant | Shell FAB → non-modal dialog (`AskAtlas` without persist) | Unpersisted | Lightweight lookup; “Continue in Ask Immune” opens `/ask` |

Both use the same transport (`/api/ask`, `/api/ask/prepare`) and guardrails in `src/lib/askGrounding.ts` (Gate C honesty, provisional lit labelling, GraphRAG retrieval).

## Prefill / CTA only (no second chat UI)

These surfaces **must not** embed `AskAtlas`. They deep-link or CTA into `/ask`:

- Discovery Radar (`/discovery`) — “Continue in Ask Immune”
- Gap dossier — “Continue in Ask Immune” with `?about=` / `?q=` prefill
- Atlas concept pages / `EntityActions` — Ask about concept → `/ask?about=&q=`
- Scientific reasoning (`/reasoning`) — CTA only; pathways, retrieval demo, tracer stay here
- Research Workbench — “Continue in Ask Immune” (seed IDs remain local workbench helpers)
- Marketing / Methods / Academy / Overview — nav or copy links to `/ask`

## How users open the chatbot

1. **Learn → Ask Immune** in the journey menu → `/ask`
2. Corner **Ask Immune** FAB (hidden on `/ask`) → same AskAtlas; expand via “Continue in Ask Immune”
3. Any prefill CTA → `/ask?about=<conceptId>&q=<question>`

Do not add further in-page AskAtlas embeds. Prefer a clear “Continue in Ask Immune” link.
