# HSI → ISI bridge

Consumes private **`hsi-core`** (`~/Projects/hsi-core`, GitHub `gnaneshwer23/hsi-core`).

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
bun install   # resolves file: hsi-core (or restore symlink to ~/Projects/hsi-core)
bun run hsi:check
bun run hsi:sync-export   # refresh src/data/hsi-isi-export.json
```
