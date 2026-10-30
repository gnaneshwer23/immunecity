# Ask Immune — entry points

Ask Immune is the **primary conversational intelligence gateway** and a top-level header destination. It remains **one chatbot** — not multiple embedded assistants.

## Canonical surfaces

| Surface | Path / host | Persistence | Role |
|---------|-------------|-------------|------|
| Full Ask page | `/ask` (`AskAtlas` + `persistKey=isi-ask-conversation`) | Browser localStorage | **Main chatbot** — type or voice; immune-cell speaker can read answers aloud |
| Corner assistant | Shell FAB → non-modal dialog (`AskAtlas` without persist) | Unpersisted | Same chatbot transport; opens `/ask` via “Continue in Ask Immune” |
| Header pillar | `JOURNEY_NAV` → Ask Immune → `/ask` | — | Primary destination alongside Explore / Research / Academy / Community |

Both chat hosts use `/api/ask` + `/api/ask/prepare` and guardrails / intent routing in `src/lib/askGrounding.ts`.

## Homepage

- Featured as the intelligence gateway (Ask entry in hero / early CTA)
- Still a single AskAtlas — homepage links to `/ask`; it does not embed a second chat

## Prefills (not second chatbots)

- Prefill links from Atlas / Discovery / Workbench / Reasoning may open `/ask?about=&q=`
- Do not add AskAtlas embeds on other pages

## Voice

- **Voice command** (mic + immune-cell avatar): browser Speech Recognition → fills the composer
- **Immune cell speaker** (Hear): browser Speech Synthesis reads the last answer; the mascot animates idle / listen / speak (respects `prefers-reduced-motion`)
- Audio stays in-browser; unsupported browsers show a short status note

## How users open the chatbot

1. Header **Ask Immune** pillar → `/ask`
2. Corner **Ask Immune** FAB (hidden on `/ask`)
3. Direct URL `/ask`
4. Prefill CTA → `/ask?about=<conceptId>&q=<question>`
5. Homepage Ask entry

Do not add AskAtlas embeds on other pages. Reasoning remains tools under Research — not a second chat.
