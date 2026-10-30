# Discovery 3.0 — appraisal sprint report

**Date:** 2026-10-30T18:02:42.430Z
**Baseline tip:** e626370
**Adapter mode:** live

## Verdict

- scientific_evidence_gap created: **1**
- research_opportunity created: **4**
- Neon persistence: **applied**
- evidence_records count unchanged: **46**
- E2E auth: **SKIP (not a pass): E2E_USER_A_* / E2E_USER_B_* missing — auth E2E unproven**

## Candidate register (≤5)

### GAP-OPP-A-MHC-PD1-RESIST

- Class: `scientific_evidence_gap` / opportunity_status=`none`
- Pilot: melanoma_a
- SME: /sme?gapKey=GAP-OPP-A-MHC-PD1-RESIST
- Dossier: /discovery/gaps/GAP-OPP-A-MHC-PD1-RESIST
- identifierValidated=14; scientificallyAppraised=14
- support=13; contradict=0; background=1

### GAP-OPP-A-LAG3-TIM3-EXHAUST

- Class: `research_opportunity` / opportunity_status=`assessed`
- Pilot: melanoma_a
- SME: /sme?gapKey=GAP-OPP-A-LAG3-TIM3-EXHAUST
- Dossier: /discovery/gaps/GAP-OPP-A-LAG3-TIM3-EXHAUST
- identifierValidated=16; scientificallyAppraised=16
- support=14; contradict=0; background=2

### GAP-OPP-A-AGPRES-UPSTREAM

- Class: `research_opportunity` / opportunity_status=`assessed`
- Pilot: melanoma_a
- SME: /sme?gapKey=GAP-OPP-A-AGPRES-UPSTREAM
- Dossier: /discovery/gaps/GAP-OPP-A-AGPRES-UPSTREAM
- identifierValidated=13; scientificallyAppraised=13
- support=12; contradict=0; background=1

### GAP-OPP-B-CD28NULL-RA-AGE

- Class: `research_opportunity` / opportunity_status=`assessed`
- Pilot: coverage_b
- SME: /sme?gapKey=GAP-OPP-B-CD28NULL-RA-AGE
- Dossier: /discovery/gaps/GAP-OPP-B-CD28NULL-RA-AGE
- identifierValidated=16; scientificallyAppraised=16
- support=12; contradict=0; background=4

### GAP-OPP-B-CD28NULL-SSC

- Class: `research_opportunity` / opportunity_status=`assessed`
- Pilot: coverage_b
- SME: /sme?gapKey=GAP-OPP-B-CD28NULL-SSC
- Dossier: /discovery/gaps/GAP-OPP-B-CD28NULL-SSC
- identifierValidated=13; scientificallyAppraised=13
- support=13; contradict=0; background=0

## Disqualified / not forced


## Dossier sections

### GAP-OPP-A-MHC-PD1-RESIST

In metastatic melanoma, does loss of MHC class I or antigen-presentation machinery causally mediate anti-PD-1 resistance, or is the association primarily correlative without causal evidence in human disease?

Why it matters: If antigen-presentation loss is causal, biomarker and combination strategies differ from exhaustion-only models of checkpoint failure.

Coverage: {"retrieved":14,"identifierValidated":14,"scientificallyAppraised":14,"support":13,"contradict":0,"background":1,"insufficientContext":0,"excludedInvalidId":0}

| PMID | Relation | Screening | Passage |
| --- | --- | --- | --- |
| 42958414 | support | include_for_sme | Melanoma remains one of the most aggressive malignancies, with limited response to immune checkpoint inhibitors (ICIs) d |
| 42947736 | support | include_for_sme | <h4>Introduction</h4>Patients with metastatic melanoma who progress on standard of care therapy have limited treatment o |
| 42945905 | support | include_for_sme | In human melanoma sentinel lymph nodes, the LAN-associated CD8<sup>+</sup> T cell trajectory exhibited strong directiona |
| 42908204 | support | include_for_sme | Resistance to anti-PD1 therapy remains a major challenge in metastatic melanoma, despite long-term benefit in some patie |
| 42738348 | support | include_for_sme | <b>Background/Objectives</b>: Immune checkpoint inhibitors have revolutionized the treatment of advanced melanoma, yet p |
| 42442347 | support | include_for_sme | Rare melanoma subtypes, including acral, mucosal, and uveal melanomas, exhibit limited responses to immune checkpoint in |
| 42427150 | support | include_for_sme | Conventional mRNA cancer vaccines are designed to maximize antigen potency but often overlook vaccination-induced immune |
| 42230631 | support | include_for_sme | Here, we show that inhibition of sphingosine kinase-2 (SphK2), the enzyme generating S1P in MDSCs, reduces the suppressi |

Honesty: identifierValidated counts structural IDs only. scientificallyAppraised is per-question engineering screen. Shared PMID across gaps does not imply multi-support.

### GAP-OPP-A-LAG3-TIM3-EXHAUST

In PD-1-refractory metastatic melanoma, does dual LAG-3 and/or TIM-3 blockade reverse T-cell exhaustion beyond PD-1 monotherapy in antigen-experienced TILs, or are benefits confined to biomarker-selected subsets?

Why it matters: Clarifies whether exhaustion co-inhibitory receptors are obligatory resistance nodes or redundant with PD-1 in melanoma.

Coverage: {"retrieved":16,"identifierValidated":16,"scientificallyAppraised":16,"support":14,"contradict":0,"background":2,"insufficientContext":0,"excludedInvalidId":0}

| PMID | Relation | Screening | Passage |
| --- | --- | --- | --- |
| 42900960 | support | include_for_sme | CD8+ T cells are involved in natural tumor immune surveillance and are known to play a critical role in mediating respon |
| 42840951 | support | include_for_sme | FDA approval for metastatic renal cell carcinoma and melanoma, IL-2 has represented a landmark in cancer immunotherapy. |
| 42780128 | support | include_for_sme | Blockade of inhibitory PD-1 signaling on T cells is a cornerstone of cancer immunotherapy, with current strategies targe |
| 42763729 | support | include_for_sme | Background Anti-programmed cell death protein-1 (anti-PD-1) immunotherapy has transformed the treatment of advanced mela |
| 42710546 | support | include_for_sme | In dogs, the immune checkpoint programmed cell death protein 1 (PD-1) axis is a primary focus due to conserved structura |
| 42661498 | support | include_for_sme | Systemically infused PADVs demonstrated dual-targeting priority towards lymph node and deep tumour tissues, reversing im |
| 42567561 | support | include_for_sme | <h4>Background</h4>Nearly half of patients with melanoma do not respond to immune checkpoint inhibitors (CPIs) and many  |
| 42534945 | support | include_for_sme | Immune checkpoint inhibitors (ICIs) have significantly improved outcomes in patients with regional and distant melanoma  |

Honesty: identifierValidated counts structural IDs only. scientificallyAppraised is per-question engineering screen. Shared PMID across gaps does not imply multi-support.

### GAP-OPP-A-AGPRES-UPSTREAM

Is impaired antigen presentation upstream of T-cell exhaustion phenotypes in melanoma (causing dysfunction via weak TCR signal), or a parallel resistance axis that can coexist with classical exhaustion markers?

Why it matters: Distinguishes ordering of resistance mechanisms for combination trial design and ISI graph edge semantics.

Coverage: {"retrieved":13,"identifierValidated":13,"scientificallyAppraised":13,"support":12,"contradict":0,"background":1,"insufficientContext":0,"excludedInvalidId":0}

| PMID | Relation | Screening | Passage |
| --- | --- | --- | --- |
| 42780435 | support | include_for_sme | Melanoma is an informative but understudied example because its progression and response to immune checkpoint inhibitors |
| 42774267 | support | include_for_sme | <h4>Introduction</h4>Synthetic T cell receptor (TCR) engagers are cancer therapeutics that activate T cells through reco |
| 42769533 | support | include_for_sme | Mitophagy serves as a pivotal metabolic-immune hub that drives immune evasion in major skin cancer subtypes including me |
| 42726782 | support | include_for_sme | Adoptive cell therapy using tumor-infiltrating lymphocytes (TIL) is effective for treating advanced melanoma but require |
| 42427150 | support | include_for_sme | SCORV simultaneously suppresses PD-L1-mediated immune resistance during antigen presentation and enhances T cell priming |
| 42316257 | support | include_for_sme | Therapy-resistant melanoma remains a major clinical challenge despite advances with immune checkpoint inhibitors and tar |
| 42196460 | support | include_for_sme | Targeted inhibition of the MAPK pathway with BRAF and MEK inhibitors (BRAFi/MEKi) produces rapid tumor regressions in BR |
| 41903669 | support | include_for_sme | Here, we developed a circRNA-based vaccine encoding multiple melanoma neoantigens (circRNA<sup>MNA</sup>). |

Honesty: identifierValidated counts structural IDs only. scientificallyAppraised is per-question engineering screen. Shared PMID across gaps does not imply multi-support.

### GAP-OPP-B-CD28NULL-RA-AGE

Do CD28-null (CD28−) CD8+ T cells drive rheumatoid arthritis synovial inflammation independently of chronological ageing, or are expanded CD28-null populations primarily an ageing-associated epiphenomenon without disease-specific pathogenicity?

Why it matters: Separating ageing confound from RA-specific CD28-null pathogenicity changes whether CD28-null cells are therapeutic targets or biomarkers of immunosenescence.

Coverage: {"retrieved":16,"identifierValidated":16,"scientificallyAppraised":16,"support":12,"contradict":0,"background":4,"insufficientContext":0,"excludedInvalidId":0}

| PMID | Relation | Screening | Passage |
| --- | --- | --- | --- |
| 42632933 | support | include_for_sme | <h4>Background</h4>The TNF/TNFR superfamily and B7/CD28 costimulatory molecules are critical regulators of immune respon |
| 42273681 | support | include_for_sme | <h4>Introduction</h4>Aging impairs immunity, sustains chronic inflammation, and enhances autoimmunity-a process termed " |
| 41678165 | support | include_for_sme | <h4>Objectives</h4>Rheumatoid arthritis (RA) is attributed to inflammation and infiltration of immune cells into the inf |
| 41613114 | support | include_for_sme | <h4>Background</h4>Rheumatoid arthritis (RA) is a chronic autoimmune arthritis that predominantly affects adults, wherea |
| 41235706 | support | include_for_sme | Using cytomegalovirus (CMV) and rheumatoid arthritis (RA) as models of chronic immune activation, we performed high-dime |
| 41213086 | support | include_for_sme | Late-onset rheumatoid arthritis (LORA) refers to rheumatoid arthritis (RA) with initial symptoms and signs appearing aft |
| 40925204 | support | include_for_sme | Rheumatoid arthritis (RA) is a chronic inflammatory condition primarily affecting the peripheral joints while also causi |
| 40751895 | support | include_for_sme | <h4>Objectives</h4>Rheumatoid arthritis (RA) is a chronic systemic autoimmune disease whose pathogenesis involves the pa |

Honesty: identifierValidated counts structural IDs only. scientificallyAppraised is per-question engineering screen. Shared PMID across gaps does not imply multi-support.

### GAP-OPP-B-CD28NULL-SSC

In systemic sclerosis (SSc), does CD28-null T-cell expansion associate with progressive fibrosis beyond immunosenescence markers shared with healthy ageing, and is the association reproducible across cutaneous vs visceral disease subsets?

Why it matters: If CD28-null cells track SSc fibrosis independently of age, they become a candidate mechanistic node for ISI coverage beyond melanoma pilots.

Coverage: {"retrieved":13,"identifierValidated":13,"scientificallyAppraised":13,"support":13,"contradict":0,"background":0,"insufficientContext":0,"excludedInvalidId":0}

| PMID | Relation | Screening | Passage |
| --- | --- | --- | --- |
| 42926811 | support | include_for_sme | Systemic sclerosis (SSc) is a heterogeneous autoimmune disease characterised by marked clinical variability and a substa |
| 42575882 | support | include_for_sme | We discuss these approaches across infections, including human immunodeficiency virus (HIV) and Epstein-Barr virus (EBV) |
| 41521382 | support | include_for_sme | <h4>Objective</h4>Diffuse cutaneous systemic sclerosis (dcSSc) is characterized by skin and internal organ fibrosis. |
| 41335323 | support | include_for_sme | <h4>Background</h4>Systemic sclerosis (SSc) is an autoimmune disease characterized by vasculopathy, fibrosis, and dysreg |
| 40344312 | support | include_for_sme | <h4>Aim</h4>To investigate the effect of abatacept in the hypochlorous acid (HCLO)-induced fibrosis model and to analyze |
| 39941028 | support | include_for_sme | Localized scleroderma (LS) is an autoimmune, fibrotic skin disease that is thought to be triggered by environmental fact |
| 36355434 | support | include_for_sme | Here, the efficacy of abatacept in patients with early diffuse systemic sclerosis (dcSSc) was analyzed to test the hypot |
| 35979691 | support | include_for_sme | <h4>Purpose of review</h4>Systemic sclerosis (SSc) is a chronic rheumatic disease that is characterized by immune activa |

Honesty: identifierValidated counts structural IDs only. scientificallyAppraised is per-question engineering screen. Shared PMID across gaps does not imply multi-support.

## Policy

- No invented PMIDs
- No auto reviewed_opportunity / Gate C
- Same PMID re-appraised per question
- Max deep slots: 5
