# HSI → ISI bridge

Consumes published **hsi-core** pins (not a live private `file:` package — that breaks Vercel).

```ts
import { HSI_T2D_IMMUNO_SEED_EDGES, discoverySeedSummary, hsiAxesForEdge } from "@/lib/hsi";
```

| Axis | Meaning |
|------|---------|
| `curationReview` | Gate C lifecycle |
| `hsiGrade` | Shared established / uncertain / unexplored |
| `teachingStatus` | KG teaching label — **not** the same as `hsiGrade` |

Discovery only on ISI. Never invent PMIDs. Never treat ISI as CDS.

```bash
bun install
bun run hsi:check
bun run hsi:sync-export   # requires local ~/Projects/hsi-core; refreshes export + substrate pin + Discovery vendor
```

Bridge map: `buildHsiBridgeCurationQueue()` + `/curation#hsi-bridge`. Suggestions set
`isiRelationshipId` pointers only — never Gate C approval, never invent PMIDs.

## Discovery JSON consume (product + diagnostics)

- Client: `src/lib/hsi/discoveryConsume.ts` (honesty asserts + load order)
- View helpers: `src/lib/hsi/discoveryLoopView.ts`
- Product UI: **`/hsi/discovery`** — ASK → MAP → REVIEW (+ optional VALIDATE / TRANSLATE)
- Diagnostics: **`/hsi-consume`** — load order, honesty banners, licensing counts
- Vendor pin: `public/hsi-discovery/*.json` (copied from hsi-core Discovery; refresh after `bun run outputs` there)
- Remote default: `HSI_ARTIFACT_BASE_URL` → GitHub raw `hsi-core` `site/public/discovery`
- Do **not** add an absolute `file:` hsi-core dependency (breaks Vercel) — pin JSON only
- `ALLOW_HYPOTHETICAL_PARTNER=1` only when accepting fixture `partnerSigned` outside the strict hypothetical flags

```bash
bun test src/test/hsi-discovery-consume.test.ts
bun test src/test/hsi-discovery-loop.test.ts
```
