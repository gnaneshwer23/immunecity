# Landings post-evidence audit

**Date (UTC):** 2026-10-21  
**Canonical:** https://www.immune-super-intelligence.co.uk/  
**Pre-ship HEAD baseline:** `0893f6d`  
**Shipped SHA:** `76ab645` (`76ab645a9988ce5006eb38d66c8b326262ec04b9`)  
**Vercel prod:** `dpl_9K1G8CfJbHsZup42g3kcFsjAFwET` → READY; aliased https://www.immune-super-intelligence.co.uk  
**Scope:** Educational beta production readiness after evidence-first landings copy refresh (Home, Overview, Reasoning/Scientific AI, Methods, Academy light, About, Research stale-copy fix).  
**Skipped:** Full vitest/tsc (hang risk); ai-gateway skill (Ask providers untouched). ReadLints clean on edited files.

---

## Verdict

**GO — educational beta** with explicit honesty that Ask is **partial / not fully evidence-grounded** and Gate C remains **~9/549 (~1.6%)**.

**NO-GO — evidence-grounded product / clinical / dense citation claims.** Do not market Ask as fully Gate-C-grounded AI, CDS, or finished Academy/curriculum coverage.

---

## What landings now claim (honest)

| Capability | Landing posture | Matches shipped behaviour? |
|------------|-----------------|----------------------------|
| Ask Immune | Graph + Gate C when present + provisional PubMed/Europe PMC labelled + fail-closed citation checks | Yes (`askGrounding` / Ask UI) |
| Counterevidence / skeptic path | Separate bucket; empty when Neon has none | Yes — Neon `contradicts = 0` |
| Live coverage dashboard | Methods (+ Evidence); Home glance wires same query | Yes (`getEvidenceCoverageStats`) |
| Neon Ask rate limit | Live preferred; in-memory fallback if Neon down | Yes (`ask_rate_buckets` present) |
| Claim ledger / workbench spine | Partial / candidates only; no KG write-back | Yes |
| Draft pathway teasers | Microbiome / vaccines / HLA labelled Draft | Yes |
| Exemplar maturity TNF / PD-1 / IFN | Strip + Methods limits; uneven maturity | Mostly — see UX gap below |
| Gate C density | Sparse; educational beta framing | Yes — 9 distinct / 549 runtime |

---

## Neon production (MCP, 2026-10-21)

Project `immunecity` (`autumn-snow-67879321`), branch `production` (`br-super-sea-b5pre85r`):

| Metric | Count |
|--------|------:|
| `evidence_records` total | 46 |
| approved+supports rows | 9 |
| Distinct Gate C `relationship_id` | 9 |
| `contradicts` | 0 |
| `partial` | 3 |
| `unreviewed` | 34 |
| Runtime relationships (snapshot) | 549 |
| `ask_rate_buckets` | present |
| `claim_candidates` | present |

---

## Browser spot-check (pre-deploy www)

| Surface | Observation |
|---------|-------------|
| Home | Hero Ask CTA; honesty chips present; draft teasers present. Pre-refresh: Research card still “read papers”; trust CTA set thinner than post-refresh. Live hop maturity sometimes stuck on “Loading…” / TNF hops shown Unreviewed while Methods copy says TNF on-path approved — UX inconsistency. |
| Methods | Live coverage panel present; at snapshot time still “Fetching live Neon coverage…” (slow/fail path risk). Rate-limit Neon copy already honest. |
| Ask | Partial / not fully evidence-grounded; counterevidence empty-state language present. |
| Research | Pre-refresh still had stale “database configuration pending” — **fixed in this ship**. |

Post-deploy: re-check Home trust CTAs (`/ask`, Methods `#live-ev-heading`, `/research` workbench, `/curation`), Overview enter→Ask, Methods hero CTAs, Research library lede without “until migrated / DB pending”.

---

## Gap list

### Science
1. **Gate C ~9/549** — must stay educational beta; densify PD-1 / IFN exemplars via curator (no invented PMIDs).
2. **`contradicts = 0`** — skeptic path wired; do not fake counterevidence rows.
3. **SME gold-set unsigned** — eval scaffold ≠ expert sign-off.
4. **Passage entailment still partial** — fail-closed heuristics ≠ full claim–passage ledger.

### Ops
5. **Live coverage / approved-cite fetches can hang or stay “Loading…” on www** — treat as reliability gap; fail-closed error copy exists, but slow path hurts trust UX.
6. **Home TNF hop badges vs Methods “TNF approved” narrative** — possible REL-ID mismatch or cite-query lag; investigate so maturity strip and hop badges agree.
7. **Vitest full suite hang risk** — smoke preferred for ship gates.
8. **Admin curation** at `/curation` — correctly gated; public CTAs must keep “(admin)” label.

### UX / product honesty
9. **Workbench / claim ledger partial** — landings now say partial; keep “planned” stages labelled in UI.
10. **Academy finishing ≠ Gate C** — now stated; keep Intermediate/Advanced as scaffolds.
11. **Omics adapters planned** — unchanged; never claim live predictors.
12. **Nature Portfolio library ≠ only literature path** — Ask provisional PubMed/Europe PMC is separate; Research Library propose still does not auto-write Neon.

---

## Ship checklist (this pass)

- [x] Update Home / Overview / Methods / Reasoning / Academy / About / Research copy + CTAs  
- [x] Remove Research “database configuration pending”  
- [x] Reflect live coverage where server fn exists  
- [x] Keep Gate C sparse / educational beta framing  
- [x] Push `main` + `vercel --prod` + www alias (`76ab645` / `dpl_9K1G8CfJbHsZup42g3kcFsjAFwET`)  
- [x] Post-deploy browser: new Home CTAs/copy live on www; live Gate C glance still often “Loading…” (ops gap)  

---

## GO / NO-GO summary

| Question | Answer |
|----------|--------|
| Production-ready for **educational beta**? | **GO** |
| Production-ready as **evidence-grounded AI / CDS**? | **NO-GO** |
| Blockers for educational beta ship? | None hard-blocking; ops items 5–6 are follow-ups, not copy blockers |

---

*End of audit.*
