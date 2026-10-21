# Market and gap analysis: from basic concepts to clinical trials

**Date:** 2026-10-21 · **Branch:** `feat/mechanism-to-trial`
**Complements:** `ISI_EVIDENCE_FIRST_DEEP_RESEARCH.md`, which covers literature AI (OpenScholar, Elicit, Consensus and scite) and evidence maturity. This doc covers the rest of the **learn → mechanism → target → therapy → patient selection → trial** journey.

## 1. Bottom line

No player connects the whole journey for immunology. Each segment is either owned by a well-funded specialist or is free but disconnected:

| Journey stage | Who owns it today | Business model | What ISI has | Gap |
|---|---|---|---|---|
| **Learn the basics** | Lecturio, Osmosis (Elsevier); Immunopaedia (free, IUIS, case-based) | Subscription video plus question banks; free case studies | Atlas (260 core concepts), Academy Foundation track, YouTube | No case-based learning; Academy beyond Foundation is unbuilt |
| **Understand mechanisms** | Reactome, KEGG, textbooks | Open databases | Typed causal graph, mechanism walks, Ask Immune | **ISI's differentiator.** No one else teaches immunology as a navigable causal graph with review status per link |
| **Evidence for claims** | scite, Elicit, Consensus, OpenEvidence (clinician Q&A, $12bn valuation Jan 2026, ad-funded) | SaaS / pharma ads | Gate C claim review; 9 of 549 links reviewed | Claim density (covered in the existing research doc) |
| **Target → disease** | Open Targets (open, 5 releases a year), Causaly (enterprise knowledge graph plus agents; Microsoft partnership June 2026) | Open / enterprise | Graph edges therapy → targets → disease | No genetic-association or tractability evidence; no external IDs (the earlier `feat/concept-xrefs` branch starts on this) |
| **Therapy and patient selection** | Owkin (AI biomarker discovery; Boehringer licence Sept 2026), Immunai (single-cell immune atlas; AstraZeneca and Teva deals) | Pharma partnerships | Biomarker → response, eligibility and enrichment edges (16 biomarkers) | **Not shown to users until this branch** |
| **Trials** | ClinicalTrials.gov (registry), Citeline/Trialtrove (paid), TrialGPT (NIH research: 87.3% criterion-level accuracy on synthetic patients), Unlearn (digital-twin control arms, EMA-qualified PROCOVA) | Open / enterprise / pharma | 26 landmark trials as graph nodes plus a live ClinicalTrials.gov lookup | **The live lookup was wrong for 8 of the 9 trials checked** (free-text search). Fixed here. No view of the active pipeline per disease until this branch |

**Positioning:** pharma-grade tools (Causaly, Owkin, Immunai, Citeline) sell to R&D teams for six figures. Learner tools stop at the textbook. ISI's open lane is **the transparent mechanism → clinic map for immunology**. It is for students, early-career researchers, clinicians in training and biotech generalists. It shows how a concept becomes a therapy and a trial, with the review status always visible.

## 2. Strategic boundary (the challenge)

"Future clinical trial use including treatments" can drift into **clinical decision support**. The moment the platform recommends a treatment, or matches a *specific patient* to a trial, it becomes a candidate medical device under MHRA SaMD rules, plausibly class IIa. That would break the "educational resource" stance used on every page. The line I've held in the build:

- ✅ Population-level, educational: which mechanisms, therapies, biomarkers and trials connect, and what is recruiting for a condition.
- ❌ Individual-level: no "is this patient eligible", no "which drug should this person get", no ranking of trials for a person.

TrialGPT-style patient matching is the obvious "futuristic" feature. It is also the one that needs a regulatory pathway, clinical-safety work (DCB0129/0160) and processing under GDPR Article 9. Treat it as a separate product decision, not a feature.

## 3. Shipped on this branch

1. **Trial registry integrity (P0 bug).** `getLiveTrials` searched ClinicalTrials.gov by trial *name* and took the first hit. Examples: ATTRACT → a Guatemalan child-nutrition study; CANTOS → an icosapent-ethyl study; RECOVERY → a Raynaud's study. All of these were shown on `/therapy` as the landmark trial's live status. → `src/data/trialRegistry.ts` maps every curated trial to verified NCT IDs (22 trials, 23 IDs, each checked via the v2 API for acronym, intervention and condition). 4 pre-registry trials are labelled explicitly. Live status is now fetched only by exact NCT ID, and the server rejects a response for a different study.
2. **"From mechanism to clinic" on concept pages** (diseases, therapies, targets): mechanism → therapy (including drug-class members, e.g. infliximab via TNF blockade) → biomarker-based patient selection → landmark trials with verified NCT links. Failed or harmful therapies are kept as teaching cases. Everything comes from the curated graph.
3. **"Active in the registry now"**: a live, clearly *uncurated* count and list of active phase 2–4 interventional trials. It uses an exact match on the registry's Condition or InterventionName field, because free-text search pulled in Sjögren's and fibrosis studies for RA. Results are cached for 6 hours server-side.
4. Tests: `src/test/translational-path.test.ts` (registry coverage and format, class expansion, ordering, biomarker presence, query safety).

## 4. Roadmap: what would make it the platform

Ordered by leverage. Blockers come first.

**Blockers / dependencies**
- Claim review density (9 of 549) still limits every "evidence" claim. The trial layer doesn't fix that.
- Any patient-level feature needs a scoped regulatory call first (see §2).

**Next 30 days**
1. **Disease pipeline pages** (`/pipeline/$disease`) — *shipped on `feat/disease-pipeline`: 16 diseases. Active registry studies map to mechanisms by exact drug name or brand only. Mechanisms in active testing that aren't linked to the disease in the graph are flagged as curation gaps (e.g. CD20, CD19 and IL-6R in RA).* Original plan: mechanism-ordered landscape that combines approved therapies (graph) with active trials grouped by target (registry `InterventionName` mapped to graph targets via the identifiers on `feat/concept-xrefs`). This is the "where is this field going" view nobody offers for free.
2. **Merge identifiers + trials.** ChEMBL IDs on therapies enable mechanism-of-action and target lookups from ChEMBL. MONDO IDs on diseases enable Open Targets association scores. Both are free APIs; show them as *external evidence, not curated*.
3. **Case-based learning** (Immunopaedia's proven format): 5 cases, each following one patient journey through the graph (presentation → mechanism → biomarker → therapy → trial), linking existing Atlas and mechanism pages.

**60–90 days**
4. **Trial results layer**: for the 22 registered landmark trials, pull posted results (primary endpoint, N) from ClinicalTrials.gov `resultsSection` and show them next to the curated lesson, labelled as registry-reported.
5. **Failed-trial atlas**: ISI already curates instructive failures (lenercept in MS, secukinumab in Crohn's, ATTACH, TGN1412). A dedicated view of why mechanisms that look right fail in the clinic is differentiated teaching content.
6. **Emerging-modality coverage**: CAR-T in autoimmunity, bispecifics, tolerogenic and antigen-specific therapies. The live registry shows them (e.g. CD19 CAR-T in SLE). Graph coverage should follow as draft extensions with expert review.

**Deliberately not now**
- Patient-trial matching, treatment recommendation, digital twins (regulated or pharma-grade).
- Proprietary single-cell atlases (Immunai's moat, unrealistic to replicate).

## Sources

- Immunai: [AstraZeneca partnership expansion](https://www.cxodigitalpulse.com/astrazeneca-expands-ai-biotech-partnership-with-immunai-through-2027/), [Teva collaboration](https://www.biopharmatrend.com/news/immunai-and-teva-collaborate-to-advance-clinical-trials-in-oncology-and-immunology-1024/)
- Unlearn: [EMA qualification](https://www.businesswire.com/news/home/20220216005466/en), [profile](https://yespress.io/unlearn-ai.md)
- Open Targets: [NAR 2025 paper](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11701534/)
- OpenEvidence: [HLTH, Jan 2026](https://hlth.com/insights/news/openevidence-doubles-valuation-to-12bn-as-physician-adoption-accelerates-2026-01-22), [Sacra](https://sacra.com/c/openevidence/)
- TrialGPT: [NIH release](https://www.nih.gov/news-events/news-releases/nih-developed-ai-algorithm-matches-potential-volunteers-clinical-trials), [Nature Communications](https://pmc.ncbi.nlm.nih.gov/articles/PMC11574183)
- Causaly: [Microsoft collaboration](https://www.causaly.com/news/causaly-and-microsoft-target-one-of-drug-discoverys-most-expensive-decisions-which-target-to-pursue), [AI Agent Index](https://theaiagentindex.com/agents/causaly)
- Owkin: [Boehringer licence](https://www.1stoncology.com/blog/?p=113277), [OKN4395 pipeline](https://www.silicon.co.uk/press-release/owkin-unveils-ai-driven-oncology-and-immunology-pipeline-in-licenses-best-in-class-asset-okn4395)
- Learning: [Immunopaedia/IUIS](https://iuis.org/immunopaedia-advancing-global-immunology-education), [Lecturio immunology](https://www.lecturio.com/immunology/), [Osmosis](https://bcm.edu/education/academic-faculty-affairs/faculty-resources/faculty-ed-tech/clinical-learning-applications/osmosis)
- Registry: ClinicalTrials.gov API v2 (queried directly, 2026-10-21); PubMed 22595313 (secukinumab in Crohn's registration).

Several company figures come from secondary or vendor sources (noted in the research), so treat them as indicative.
