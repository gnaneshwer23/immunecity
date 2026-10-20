# Ask Immune — end-to-end audit

**Date:** 2026-10-20  
**Canonical:** https://www.immune-super-intelligence.co.uk/  
**Git SHA:** `8730326` — *Clarify Ask Immune evidence tiers and grounding UX.*  
**Production deploy:** `dpl_Ggu14ZPz8jphGaLqT9GU9T9743j4`  
**Production URL:** https://immunecity-87uftg2h7-gnaneshwerjadav-gmailcoms-projects.vercel.app  
**Aliases:** `www.immune-super-intelligence.co.uk` · `immunecity.vercel.app` → that deploy  

**Verdict: PASS** (with noted residuals)

Audit method: production HTTP/HTML + `/api/ask/prepare` + `/api/ask` stream smoke after alias. Cursor browser MCP could create tabs but navigation/lock failed repeatedly in this session — interactive click-through of the grounding panel UI is a residual, not a product failure. Targeted vitest skipped (known hang risk); bun grounding smoke used instead.

---

## UX shipped in `8730326`

| Change | Detail |
|--------|--------|
| Branding | Ask Immune + capability **Partial** chip; FAB label “Ask Immune” (icon-only &lt;640px) |
| Empty / loading / error | Starter lead copy; “Retrieving…” / “Writing from retrieved graph context…”; retry on non-429 errors |
| Evidence tiers | Grounding buckets: Reviewed (Gate C) · Provisional lit · Missing graph support — never conflated |
| Soft-fail | Prepare `provisionalError` / `provisionalSkipped` / empty provisional surfaced in panel |
| Concept routes | Inline concept → inspect + atlas + graph; chain hops link to `/atlas/$id`; atlas IDs resolve 200 |
| Honesty | capabilityStatus stays `partial`; copy keeps “not fully evidence-grounded” |
| FAB on `/ask` | `ask-launcher` absent from `/ask` SSR HTML; present on home/methods |

---

## Journey checklist

| Step | Result | Evidence |
|------|--------|----------|
| Home Ask CTA | **PASS** | `/` HTML contains “Ask Immune”, `/ask` href, honesty strings, FAB present |
| `/ask` page | **PASS** | `isi-ask-page`, Ask Immune, Partial, Gate C / provisional / not fully evidence-grounded; **no** `ask-launcher` |
| Suggestions | **PASS** | Grouped starters SSR’d on `/ask` (Foundations / Mechanisms / Disease / Research) |
| Grounded Q (TNF → RA) | **PASS** | prepare: `graph_explanation`, matched, **3** reviewed cites, provisional skipped `not_needed`; stream returns `concept:M001` / `D001` links |
| Unsupported Q | **PASS** | prepare: `unsupported`, abstained, callModel false, honest “won't invent” reply |
| Clinical refuse | **PASS** | prepare: `clinical_personal`, callModel false, clinician redirect (no model) |
| Grounding panel tiers | **PASS*** | *Server payload + shipped UI buckets; interactive panel open not browser-verified this run |
| Provisional lit labelling | **PASS** | IL-6 source_lookup: **4** provisional hits (e.g. PMID 36984554), `provisionalError` null — labelled unreviewed in UI |
| Soft-fail note | **N/A this run** | APIs returned hits or `not_needed`; soft-fail path coded when prepare/lit fails |
| Citation / concept links | **PASS** | `/atlas/D001`, `/atlas/M001`, `/atlas/TR001` → **200** |
| Mobile nav + FAB | **PASS*** | FAB cleared on `/ask`; home keeps FAB. *Viewport click/nav not browser-verified |
| Methods / Scientific AI honesty | **PASS** | `/methods` HTML: Ask Immune, Gate C, provisional, not fully evidence-grounded, Partial |

\* = HTML/API verified; interactive browser residual below.

---

## API spot checks (www)

```
TNF → RA:     graph_explanation · matched · reviewed=3 · provisionalSkipped=not_needed
Unsupported:  unsupported · abstained · no model
Clinical:     clinical_personal · refusal · no model
IL-6 evidence: source_lookup · reviewed=0 · provisional=4 · no error
/api/ask stream: OK · concept: markdown links in deltas
```

---

## Residuals

1. **Browser MCP** — tab create succeeded; navigate/lock failed (“No browser tab available”). Re-run interactive panel/FAB/mobile click audit when browser tools are healthy.
2. **Vitest** — full/targeted suite not run (hang risk); bun `prepareAsk` smoke + production APIs used instead.
3. **Provisional soft-fail** — not observed live this run (APIs healthy). Empty/unavailable path is implemented in AskAtlas + GroundingPanel.
4. **Gate C sparsity** — unchanged product reality; TNF path had 3 reviewed cites; many queries still 0 reviewed + provisional only.

---

## Overall

Ship is consistent with honesty: partial Ask Immune, tiered grounding, clinical/unsupported abstain, concept routes resolve, FAB not overlapping `/ask`. **PASS to keep on www.**
