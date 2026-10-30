# Ask Immune — entry points

Ask Immune is **only the chatbot** — not a Learn menu item or homepage marketing section.

## Canonical surfaces

| Surface | Path / host | Persistence | Role |
|---------|-------------|-------------|------|
| Full Ask page | `/ask` (`AskAtlas` + `persistKey=isi-ask-conversation`) | Browser localStorage | **Main chatbot** — type or voice; immune-cell speaker can read answers aloud |
| Corner assistant | Shell FAB → non-modal dialog (`AskAtlas` without persist) | Unpersisted | Same chatbot transport; opens `/ask` via “Continue in Ask Immune” |

Both use `/api/ask` + `/api/ask/prepare` and guardrails in `src/lib/askGrounding.ts`.

## Not in journeys / homepage

- **Not** listed under Learn / Explore / Investigate / Trust
- **Not** featured in homepage hero, “three ways in”, trust strip, or final CTA
- Prefill links from Atlas / Discovery / Workbench / Reasoning may still open `/ask` (they open the chatbot, they do not embed a second chat)

## Voice

- **Voice command** (mic + immune-cell avatar): browser Speech Recognition → fills the composer
- **Immune cell speaker** (Hear): browser Speech Synthesis reads the last answer
- Audio stays in-browser; unsupported browsers show a short status note

## How users open the chatbot

1. Corner **Ask Immune** FAB (hidden on `/ask`)
2. Direct URL `/ask`
3. Prefill CTA → `/ask?about=<conceptId>&q=<question>`

Do not add AskAtlas embeds on other pages. Do not re-add Ask Immune to `JOURNEY_NAV` or homepage marketing blocks.
