/* eslint-disable */
// @ts-nocheck
/* Immunology OS v0.3 curated teaching content (original). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
export interface Content {
  [k: string]: unknown;
  lessons: Row[]; routes: Row[]; tissues: Row[]; metabolism: Row[]; genetics: Row[];
  hypersensitivity: Row[]; cancerCycle: Row[]; flags: Row[]; rules: Row[]; cases: Row[];
  trialLessons: Record<string, Row>;
}
export const CONTENT: Content = (function () {
/* Immunology OS v0.3, curated teaching content (Layers 2–10) */
const CONTENT = {};

/* ---------------- LAYER 2: MECHANISM LESSONS ---------------- */
CONTENT.lessons = [
  {
    id: 'tcr', module: 'A', title: 'TCR signalling: antigen recognition to gene transcription',
    question: 'How does a T cell convert antigen recognition into activation?',
    cells: ['cd4', 'cd8', 'treg', 'dendritic'], nodes: ['R016', 'R024', 'P007', 'R019', 'P014', 'I031', 'I024'],
    legacy: true
  },
  {
    id: 'il6', module: 'C', title: 'Cytokine network: IL-6 as a complete chain',
    question: 'Why does blocking the same cytokine produce different outcomes in different diseases?',
    cells: ['macrophage', 'dendritic', 'bcell', 'cd4'], nodes: ['M003', 'R007', 'P002', 'P021', 'B001', 'I003', 'D022', 'D018'],
    steps: [
      { name: 'Source: macrophage / DC', type: 'cell', phase: 'source', desc: 'PAMP/DAMP-activated myeloid cells', fn: 'TLR → NF-κB in macrophages, DCs and stromal cells (synovial fibroblasts, endothelium) induces IL6 transcription.', absent: 'Reduced acute-phase output; weaker Th17 and plasma-cell differentiation.', clinical: 'In CAR-T CRS, monocytes/macrophages, not CAR-T cells, are the main IL-6 source.' },
      { name: 'IL-6', type: 'cytokine', phase: 'cytokine', desc: 'Pleiotropic 4-helix cytokine', fn: 'Signals as a hexameric complex: 2× IL-6, 2× IL-6R, 2× gp130.', absent: 'IL-6 deficiency in mice: impaired acute-phase response and infection control.', clinical: 'Serum IL-6 is a severity marker in sepsis, CRS and COVID-19.' },
      { name: 'IL-6R + gp130', type: 'receptor', phase: 'receptor', desc: 'Classical (membrane) vs trans (soluble IL-6R) signalling', fn: 'Membrane IL-6R is on hepatocytes and some leukocytes only (classical: largely regenerative). Soluble IL-6R lets IL-6 act on any gp130+ cell (trans: largely pro-inflammatory).', absent: 'gp130 (IL6ST) loss → hyper-IgE-like syndrome with craniosynostosis.', clinical: 'Tocilizumab/sarilumab block both modes; olamkicept (sgp130Fc) blocks only trans-signalling.' },
      { name: 'JAK1/JAK2 → STAT3', type: 'kinase', phase: 'signalling', desc: 'Receptor-bound JAKs phosphorylate STAT3', fn: 'pSTAT3 dimers enter the nucleus; SOCS3 provides negative feedback.', absent: 'STAT3 dominant-negative → hyper-IgE (Job) syndrome: no Th17, staphylococcal and Candida infections.', clinical: 'JAK inhibitors (baricitinib, tofacitinib) block IL-6 and many other cytokines.' },
      { name: 'Target cells', type: 'cell', phase: 'target', desc: 'Hepatocytes, T cells, B cells, endothelium, osteoclast precursors', fn: 'Same signal, different tissues: liver (acute phase), T cells (Th17 vs Treg balance with TGF-β), B cells (plasmablast survival), bone (RANKL).', absent: '', clinical: 'This diversity is why one drug touches RA joints, CRP, lipids and infection risk at once.' },
      { name: 'Cell state', type: 'output', phase: 'state', desc: 'Acute phase, Th17 skew, plasma-cell differentiation', fn: 'IL-6 + TGF-β → RORγt (Th17); IL-6 inhibits Foxp3 induction.', absent: '', clinical: '' },
      { name: 'Tissue effect', type: 'output', phase: 'tissue', desc: 'CRP, hepcidin (anaemia), bone erosion, fever', fn: 'Hepcidin traps iron → anaemia of inflammation. RANKL → bone erosion.', absent: '', clinical: 'Tocilizumab normalises CRP within days, which also masks CRP as an infection signal.' },
      { name: 'Clinical phenotype', type: 'output', phase: 'phenotype', desc: 'RA, Castleman disease, CRS, severe COVID-19, GCA', fn: 'Same cytokine, different diseases, because context (cell source, receptor mode, timing) differs.', absent: '', clinical: 'Anti-IL-6R works in RA, GCA, CRS and hypoxic COVID-19. In Crohn disease, IL-6 blockade raised a bowel-perforation signal, so context matters.' }
    ],
    perturbations: [
      { q: 'A patient on tocilizumab develops pneumonia. Why is CRP normal?', target: 'IL-6R blockade', chain: ['Hepatocyte CRP synthesis depends on IL-6–STAT3', 'Tocilizumab blocks IL-6R on hepatocytes', 'CRP stays low despite bacterial infection', 'Fever is also blunted', 'Clinicians lose two of their main infection alarms'], clinical: 'Rely on clinical signs, procalcitonin (partially), imaging and cultures in patients on IL-6 blockade.' },
      { q: 'Why does IL-6R blockade treat CAR-T CRS without stopping CAR-T killing?', target: 'IL-6R in CRS', chain: ['CAR-T cells recognise target → release IFN-γ, GM-CSF', 'Monocytes/macrophages respond with massive IL-6', 'IL-6 trans-signalling on endothelium → capillary leak, hypotension', 'Tocilizumab blocks IL-6R → CRS resolves', 'CAR-T cytotoxicity (perforin/granzyme, CD3ζ signalling) does not require IL-6'], clinical: 'Tocilizumab is first-line for grade ≥2 CRS; it does not cross the blood–brain barrier well, so ICANS often needs corticosteroids.' },
      { q: 'What if only trans-signalling is blocked?', target: 'sgp130Fc (olamkicept)', chain: ['Soluble gp130 binds IL-6/sIL-6R complexes only', 'Classical hepatocyte signalling is preserved', 'Acute-phase and regenerative functions continue', 'Inflammatory trans-signalling on gp130+ cells is removed'], clinical: 'Olamkicept showed signals in IBD, a mechanistic attempt to separate benefit from infection risk.' }
    ]
  },
  {
    id: 'tlr4', module: 'A', title: 'Innate sensing: TLR4 → NF-κB',
    question: 'A macrophage meets LPS. Which receptors detect it, and how does a gene get switched on within 30 minutes?',
    cells: ['macrophage', 'monocyte', 'dendritic', 'neutrophil'], nodes: ['R001', 'P001', 'M001', 'M003', 'M002', 'D011', 'I010', 'R032'],
    steps: [
      { name: 'LPS + LBP → CD14', type: 'receptor', phase: 'recognition', desc: 'Lipid A is extracted from the bacterial wall and handed to TLR4', fn: 'LPS-binding protein transfers LPS monomers to CD14, which loads them onto TLR4/MD-2.', absent: 'CD14 loss reduces sensitivity to low-dose LPS.', clinical: 'Endotoxin from Gram-negative bacteria drives septic shock.' },
      { name: 'TLR4/MD-2 dimerisation', type: 'receptor', phase: 'recognition', desc: 'Pattern-recognition receptor', fn: 'Lipid A bridges two TLR4/MD-2 complexes; TIR domains come together.', absent: 'No LPS response (C3H/HeJ mice are LPS-resistant and highly susceptible to Gram-negative infection).', clinical: 'TLR4 antagonist eritoran failed in sepsis (ACCESS trial), by the time patients present, the cytokine cascade is self-sustaining.' },
      { name: 'MyD88 → IRAK4/IRAK1', type: 'adaptor', phase: 'signalling', desc: 'Myddosome assembly at the plasma membrane', fn: 'MyD88 death domains recruit IRAK4, which phosphorylates IRAK1/2.', absent: 'MyD88 or IRAK4 deficiency → life-threatening pyogenic infections (S. pneumoniae, S. aureus) in childhood with minimal fever and CRP.', clinical: 'These patients improve with age as adaptive immunity matures, innate sensing is most critical early in life.' },
      { name: 'TRAF6 → TAK1 → IKK', type: 'kinase', phase: 'signalling', desc: 'K63-ubiquitin scaffolds activate kinases', fn: 'TAK1 phosphorylates IKKβ (with NEMO) and MAP kinases (p38, JNK → AP-1).', absent: 'NEMO (IKBKG) mutations → anhidrotic ectodermal dysplasia with immunodeficiency.', clinical: '' },
      { name: 'IκBα degradation → NF-κB (p65/p50)', type: 'transcription', phase: 'transcription', desc: 'Released NF-κB enters the nucleus', fn: 'IKK phosphorylates IκBα → proteasomal degradation; NF-κB drives TNF, IL6, pro-IL1B, NLRP3 and IκBα itself (negative feedback).', absent: '', clinical: 'Glucocorticoids transrepress NF-κB and induce IκBα; A20 (TNFAIP3) loss → haploinsufficiency of A20 (Behçet-like disease).' },
      { name: 'TRIF branch → IRF3 → IFN-β', type: 'branch', phase: 'branch', desc: 'Endosomal TLR4 signals via TRAM/TRIF', fn: 'After endocytosis, TLR4 switches to TRIF → TBK1 → IRF3, producing IFN-β and late NF-κB.', absent: 'TRIF deficiency → susceptibility to HSV encephalitis (via TLR3).', clinical: 'TLR4 is the only TLR using both MyD88 and TRIF.' },
      { name: 'Output: TNF, IL-6, pro-IL-1β, chemokines', type: 'output', phase: 'output', desc: 'Inflammatory programme', fn: 'TNF and IL-1 further activate endothelium; CXCL8 recruits neutrophils; pro-IL-1β waits for inflammasome processing (signal 2).', absent: '', clinical: 'Prolonged LPS exposure induces tolerance (reduced TNF on re-challenge), a contributor to immunoparalysis late in sepsis.' }
    ],
    perturbations: [
      { q: 'What happens if IRAK4 is absent?', target: 'IRAK4', chain: ['TLR4 and IL-1R still bind ligand', 'Myddosome cannot form', 'No NF-κB activation through MyD88', 'Little TNF/IL-6 → little fever and CRP', 'Neutrophil recruitment is delayed', 'Invasive pyogenic bacterial infection with deceptively mild inflammation'], clinical: 'IRAK4/MyD88 deficiency: prophylactic antibiotics and vaccination; risk falls after adolescence.' },
      { q: 'Why did blocking TLR4 fail in sepsis?', target: 'TLR4 antagonist', chain: ['TLR4 sensing occurs within minutes of bacteraemia', 'Patients present hours later', 'TNF, IL-1 and DAMPs (HMGB1) now sustain inflammation independently', 'Blocking the trigger no longer removes the cascade', 'Later phases may be immunosuppressive, not hyperinflammatory'], clinical: 'Timing, not mechanism, explains many failed sepsis trials (eritoran, anti-TNF).' },
      { q: 'What do glucocorticoids do to this pathway?', target: 'Glucocorticoid receptor', chain: ['Steroid binds cytosolic GR → nuclear translocation', 'GR tethers to p65 and AP-1 (transrepression)', 'GR induces IκBα, GILZ, MKP-1 and annexin A1', 'TNF, IL-1, IL-6 and chemokine transcription falls', 'Broad suppression, benefit in hyperinflammation, harm when pathogen clearance is still needed'], clinical: 'RECOVERY: dexamethasone reduced mortality in patients needing oxygen, but not (possibly harmful) in those without hypoxia.' }
    ]
  },
  {
    id: 'nlrp3', module: 'A', title: 'NLRP3 inflammasome: two signals to IL-1β',
    question: 'Why does a cell need two separate signals before releasing IL-1β?',
    cells: ['macrophage', 'monocyte', 'neutrophil'], nodes: ['R004', 'P003', 'M002', 'M036', 'M037', 'I023', 'I026', 'I030', 'D027', 'D019', 'TR002', 'TR012'],
    steps: [
      { name: 'Signal 1: priming (NF-κB)', type: 'receptor', phase: 'priming', desc: 'TLR or TNFR signalling', fn: 'NF-κB induces NLRP3 and pro-IL-1β transcription and licenses NLRP3 by post-translational modification.', absent: 'Without priming, an activating stimulus produces almost no IL-1β.', clinical: 'The two-signal requirement is a safety lock against accidental IL-1 release.' },
      { name: 'Signal 2: activation', type: 'receptor', phase: 'activation', desc: 'K⁺ efflux, ATP (P2X7), crystals, lysosomal damage', fn: 'Diverse stimuli converge on potassium efflux; urate, cholesterol and silica crystals rupture lysosomes.', absent: '', clinical: 'Urate (gout), cholesterol crystals (atherosclerosis), amyloid-β, silica and asbestos all activate NLRP3.' },
      { name: 'NLRP3 oligomerisation + NEK7', type: 'adaptor', phase: 'assembly', desc: 'Sensor polymerises on microtubule-organising centre', fn: 'Microtubule transport brings NLRP3 to the MTOC; NEK7 is required for oligomerisation.', absent: 'NLRP3-null cells cannot respond to crystals.', clinical: 'Colchicine disrupts microtubules → impairs assembly and neutrophil migration (gout, COLCOT, LoDoCo2).' },
      { name: 'ASC speck', type: 'adaptor', phase: 'assembly', desc: 'Prion-like filament amplifies the signal', fn: 'One ASC speck per cell recruits many pro-caspase-1 molecules.', absent: '', clinical: 'Extracellular ASC specks can propagate inflammation to neighbouring cells.' },
      { name: 'Caspase-1', type: 'kinase', phase: 'effector', desc: 'Protease activated by proximity', fn: 'Cleaves pro-IL-1β, pro-IL-18 and gasdermin D.', absent: '', clinical: '' },
      { name: 'Gasdermin D pores → pyroptosis', type: 'branch', phase: 'effector', desc: 'Lytic, inflammatory cell death', fn: 'GSDMD N-terminal fragments form pores that release IL-1β and may rupture the cell (via NINJ1).', absent: 'GSDMD-deficient cells retain IL-1β inside.', clinical: 'Disulfiram inhibits GSDMD pore formation (preclinical).' },
      { name: 'IL-1β / IL-18 output', type: 'output', phase: 'output', desc: 'Fever, endothelial activation, IL-6 → CRP', fn: 'IL-1β → IL-1R1 → MyD88 → NF-κB (amplification loop); IL-18 + IL-12 → IFN-γ.', absent: '', clinical: 'CANTOS: canakinumab reduced MACE 15% with no change in LDL, IL-1β → IL-6 → CRP is a causal axis in CVD.' }
    ],
    perturbations: [
      { q: 'What happens with a gain-of-function NLRP3 mutation?', target: 'NLRP3 (CAPS)', chain: ['NLRP3 assembles with minimal signal 2 (even cold exposure)', 'Constitutive caspase-1 activity', 'Excess IL-1β → fever, urticarial rash, arthralgia, meningitis', 'Chronic disease → amyloidosis, sensorineural hearing loss'], clinical: 'CAPS (FCAS → Muckle–Wells → NOMID) responds dramatically to anakinra, canakinumab or rilonacept, proof IL-1β is the effector.' },
      { q: 'Why did canakinumab reduce lung-cancer deaths in CANTOS?', target: 'IL-1β in the TME', chain: ['IL-1β promotes angiogenesis, MDSC recruitment and tumour-promoting inflammation', 'Neutralising IL-1β altered the tumour-supportive milieu', 'Lung-cancer incidence and mortality fell in a secondary analysis', 'Prospective trials (CANOPY) did not confirm benefit in established NSCLC'], clinical: 'A lesson in hypothesis generation: unexpected secondary signals need their own trials.' },
      { q: 'If IL-1β is blocked, why does infection risk rise only modestly?', target: 'IL-1β redundancy', chain: ['IL-1α, TNF, IL-6 and IFN responses remain', 'Neutrophil recruitment partly preserved via CXCL8', 'CANTOS saw more fatal infections (small absolute increase)', 'Redundancy limits but does not remove risk'], clinical: 'Screen for infection risk; avoid live vaccines on IL-1 blockade.' }
    ]
  },
  {
    id: 'sting', module: 'A', title: 'cGAS–STING and type I interferon',
    question: 'How does a cell detect DNA in the wrong place, and why does that cause lupus?',
    cells: ['dendritic', 'macrophage', 'nk'], nodes: ['P011', 'M018', 'R018', 'M027', 'P004', 'B005', 'I015', 'I020', 'D007'],
    steps: [
      { name: 'Cytosolic dsDNA', type: 'receptor', phase: 'trigger', desc: 'Viral DNA, mitochondrial DNA, micronuclei', fn: 'DNA should be in the nucleus or mitochondria; cytosolic DNA signals infection or damage.', absent: '', clinical: 'TREX1 loss lets self-DNA accumulate → Aicardi–Goutières syndrome, chilblain lupus.' },
      { name: 'cGAS → 2′3′-cGAMP', type: 'kinase', phase: 'recognition', desc: 'DNA-activated second-messenger synthase', fn: 'cGAS binds dsDNA length-dependently and synthesises cGAMP, which can pass to neighbouring cells via gap junctions.', absent: 'cGAS-null mice cannot control DNA viruses (HSV).', clinical: '' },
      { name: 'STING (ER → Golgi)', type: 'adaptor', phase: 'signalling', desc: 'ER adaptor that translocates when bound', fn: 'cGAMP-bound STING moves to the Golgi and recruits TBK1.', absent: '', clinical: 'STING gain-of-function → SAVI (vasculopathy, interstitial lung disease); JAK inhibitors help.' },
      { name: 'TBK1 → IRF3', type: 'kinase', phase: 'signalling', desc: 'Phosphorylated IRF3 dimerises', fn: 'IRF3 + NF-κB drive IFNB1 transcription.', absent: '', clinical: '' },
      { name: 'IFN-α/β → IFNAR1/2', type: 'receptor', phase: 'amplification', desc: 'Autocrine/paracrine loop', fn: 'IFNAR signals through TYK2 and JAK1 to STAT1/STAT2/IRF9 (ISGF3).', absent: 'IFNAR1/2 or STAT2 deficiency → severe live-viral-vaccine and influenza disease; neutralising autoantibodies to type I IFN are found in roughly 10–15% of critical COVID-19.', clinical: 'Anifrolumab blocks IFNAR1 in SLE; deucravacitinib blocks TYK2.' },
      { name: 'ISG signature', type: 'output', phase: 'output', desc: 'Hundreds of interferon-stimulated genes', fn: 'Antiviral state (MX1, OAS, ISG15), MHC-I upregulation, BAFF induction → B-cell survival.', absent: '', clinical: 'High ISG signature identifies SLE patients most likely to respond to IFNAR blockade.' }
    ],
    perturbations: [
      { q: 'Why does type I IFN drive autoantibody production in SLE?', target: 'IFN → BAFF', chain: ['NETs and apoptotic debris deliver nucleic acid to pDCs (TLR7/9)', 'pDCs release large amounts of IFN-α', 'IFN induces BAFF on myeloid cells', 'BAFF rescues autoreactive B cells from deletion', 'More anti-dsDNA/immune complexes → more pDC activation (feed-forward loop)'], clinical: 'Two drugs, two nodes of one loop: anifrolumab (IFNAR1) and belimumab (BAFF).' },
      { q: 'What if TYK2 is inhibited?', target: 'TYK2', chain: ['TYK2 transduces IL-12, IL-23 and type I IFN', 'Th17 maintenance (IL-23) falls', 'Th1 (IL-12) and IFN responses fall', 'IL-6 (JAK1/2) signalling largely spared'], clinical: 'Deucravacitinib (allosteric TYK2) is approved for psoriasis, human TYK2 P1104A carriers are protected from several autoimmune diseases.' }
    ]
  },
  {
    id: 'complement', module: 'A', title: 'Complement cascade: three triggers, one amplifier',
    question: 'Why does blocking C5 prevent haemolysis but expose patients to meningococcal sepsis?',
    cells: ['complement', 'neutrophil', 'macrophage'], nodes: ['P013', 'M023', 'M028', 'I027', 'X007', 'D023', 'D024', 'D007'],
    steps: [
      { name: 'Classical: C1q + antibody', type: 'receptor', phase: 'trigger', desc: 'IgG/IgM immune complexes', fn: 'C1q binds Fc regions → C1r/C1s → C4 and C2 cleavage → C3 convertase C4b2b.', absent: 'C1q deficiency → >90% develop SLE (failed clearance of apoptotic debris).', clinical: 'Low C3/C4 tracks active lupus nephritis.' },
      { name: 'Lectin: MBL/ficolins', type: 'receptor', phase: 'trigger', desc: 'Microbial carbohydrate patterns', fn: 'MASPs cleave C4 and C2 like C1s.', absent: 'MBL deficiency is common and mostly mild.', clinical: '' },
      { name: 'Alternative: C3 tick-over', type: 'receptor', phase: 'trigger', desc: 'Spontaneous C3 hydrolysis', fn: 'Factor B + factor D form C3bBb on unprotected surfaces; properdin stabilises it.', absent: 'Factor H/I defects → uncontrolled amplification (aHUS, C3 glomerulopathy).', clinical: 'The alternative pathway amplifies all three routes (~80% of C3b).' },
      { name: 'C3 convertase → C3b', type: 'kinase', phase: 'amplification', desc: 'Opsonisation hub', fn: 'C3b coats microbes for phagocytosis via CR1/CR3; C3a recruits leukocytes.', absent: 'C3 deficiency → recurrent pyogenic infections, immune-complex disease.', clinical: 'Pegcetacoplan (C3 inhibitor) treats PNH extravascular haemolysis too.' },
      { name: 'C5 convertase → C5a + C5b', type: 'kinase', phase: 'effector', desc: 'Terminal pathway entry', fn: 'C5a is the most potent anaphylatoxin (neutrophil chemotaxis, C5aR1).', absent: '', clinical: 'Avacopan (C5aR1 antagonist) enables steroid-sparing in ANCA vasculitis (ADVOCATE).' },
      { name: 'C5b-9 membrane attack complex', type: 'output', phase: 'output', desc: 'Pore in target membranes', fn: 'Lyses thin-walled Gram-negative bacteria, notably Neisseria; host cells protected by CD55/CD59.', absent: 'C5–C9 deficiency → recurrent Neisseria infection.', clinical: 'PNH: PIGA mutation removes CD55/CD59 → MAC lyses red cells.' }
    ],
    perturbations: [
      { q: 'What happens when eculizumab blocks C5?', target: 'C5', chain: ['C5 cannot be cleaved', 'No C5a, less neutrophil activation', 'No MAC, PNH red cells stop lysing', 'Neisseria meningitidis can no longer be lysed', 'Meningococcal risk rises ~1000–2000-fold'], clinical: 'Meningococcal ACWY + B vaccination (± antibiotic prophylaxis) is mandatory before C5 inhibition.' },
      { q: 'Why do C1q-deficient patients get lupus?', target: 'C1q', chain: ['C1q tags apoptotic blebs for silent clearance', 'Without C1q, apoptotic debris lingers', 'Nuclear antigens reach pDCs and B cells', 'IFN production and autoantibody formation', 'Immune complexes deposit in kidney and skin'], clinical: 'Complement is protective against autoimmunity early (clearance) and harmful late (tissue injury).' }
    ]
  },
  {
    id: 'checkpoint', module: 'E', title: 'Immunological synapse: co-stimulation and checkpoints',
    question: 'Why do anti-CTLA-4 and anti-PD-1 work in different places and cause different toxicities?',
    cells: ['cd8', 'cd4', 'treg', 'dendritic', 'mdsc'], nodes: ['R019', 'R020', 'R013', 'R011', 'R012', 'P014', 'P015', 'C027', 'I008', 'I009', 'I025', 'I024'],
    steps: [
      { name: 'Signal 1: TCR–peptide/MHC', type: 'receptor', phase: 'priming', desc: 'Specificity', fn: 'Delivers antigen specificity; alone, it induces anergy.', absent: '', clinical: '' },
      { name: 'Signal 2: CD28–CD80/86', type: 'receptor', phase: 'priming', desc: 'Licence to activate', fn: 'CD28 → PI3K/AKT/mTOR, IL-2 and survival (Bcl-xL).', absent: 'No signal 2 → anergy (peripheral tolerance).', clinical: 'Abatacept (CTLA-4-Ig) blocks signal 2 in RA; TGN1412 (CD28 superagonist) caused cytokine storm.' },
      { name: 'Signal 3: polarising cytokines', type: 'cytokine', phase: 'priming', desc: 'IL-12, IL-4, IL-6/IL-23, TGF-β', fn: 'Determines Th1, Th2, Th17, Treg or Tfh fate.', absent: '', clinical: '' },
      { name: 'CTLA-4 (lymph node, priming)', type: 'branch', phase: 'brake', desc: 'Competes with CD28 for B7', fn: 'Higher affinity for CD80/86; trans-endocytoses B7 from APCs. Constitutive on Tregs.', absent: 'CTLA4 haploinsufficiency → multi-organ lymphocytic infiltration; abatacept is therapeutic.', clinical: 'Ipilimumab: more colitis, hypophysitis, broad, early loss of tolerance.' },
      { name: 'PD-1 / PD-L1 (tissue, effector phase)', type: 'branch', phase: 'brake', desc: 'Peripheral brake in inflamed tissue', fn: 'PD-1 recruits SHP2, dephosphorylating CD28 and TCR proximal signals. Tumours and IFN-γ-exposed tissue upregulate PD-L1.', absent: 'PD-1 knockout mice develop late, organ-specific autoimmunity.', clinical: 'Anti-PD-1: thyroiditis, pneumonitis, hepatitis; lower grade 3–4 rates than anti-CTLA-4.' },
      { name: 'Chronic antigen → exhaustion (TOX)', type: 'transcription', phase: 'state', desc: 'Cell-state transition', fn: 'NFAT without AP-1 → TOX → epigenetic lock-in of PD-1, TIM-3, LAG-3; TCF1+ progenitor cells keep proliferative capacity.', absent: '', clinical: 'Terminally exhausted cells respond poorly; responses come from TCF1+ progenitor-exhausted cells.' },
      { name: 'Checkpoint blockade → reinvigoration', type: 'output', phase: 'output', desc: 'Releasing the brake', fn: 'PD-1 blockade restores CD28 signalling in progenitor-exhausted cells → proliferative burst of effector-like cells.', absent: '', clinical: 'KEYNOTE-006: ~39% 5-year survival with pembrolizumab in advanced melanoma; CheckMate 067: combination raises response and toxicity.' }
    ],
    perturbations: [
      { q: 'A tumour loses MHC class I. What happens to anti-PD-1 response?', target: 'MHC-I / B2M loss', chain: ['CD8 T cells can no longer see tumour peptides', 'PD-1 blockade reinvigorates T cells that have nothing to kill', 'Acquired resistance emerges', 'But missing-self now activates NK cells'], clinical: 'B2M mutations are a recognised mechanism of resistance; NK-directed strategies are being explored.' },
      { q: 'Why does anti-CTLA-4 cause more severe colitis than anti-PD-1?', target: 'CTLA-4 vs PD-1', chain: ['CTLA-4 acts early, in lymph nodes, on many clones', 'Treg suppression in gut depends heavily on CTLA-4', 'Blockade broadly lowers the priming threshold', 'Gut-reactive clones expand → colitis', 'PD-1 acts later, locally, on already-activated cells'], clinical: 'Grade 3–4 irAEs: ~55–60% with nivolumab + ipilimumab vs ~20% with nivolumab alone (CheckMate 067).' }
    ]
  },
  {
    id: 'gc', module: 'B', title: 'Cell-state transitions: germinal centre to plasma cell',
    question: 'Why does rituximab deplete B cells but leave tetanus antibodies intact?',
    cells: ['bcell', 'plasma', 'cd4', 'memory'], nodes: ['R015', 'C016', 'M034', 'P008', 'P018', 'C018', 'C019', 'R021', 'R023', 'I011', 'I016', 'D026'],
    steps: [
      { name: 'BCR binds native antigen', type: 'receptor', phase: 'activation', desc: 'Signal 1 for B cells', fn: 'BCR cross-linking → SYK/BTK; antigen internalised and presented on MHC-II.', absent: 'BTK loss → X-linked agammaglobulinaemia (no B cells).', clinical: 'BTK inhibitors (ibrutinib) treat CLL. In MS, tolebrutinib slowed disability in non-relapsing SPMS (HERCULES); evobrutinib failed in phase 3.' },
      { name: 'T–B border: Tfh help', type: 'cell', phase: 'activation', desc: 'Linked recognition', fn: 'Tfh cells recognise peptide on the same B cell → CD40L–CD40 + IL-21.', absent: 'CD40L deficiency → hyper-IgM syndrome; Pneumocystis infections.', clinical: 'This is why conjugate vaccines work: protein carrier recruits T help for polysaccharide-specific B cells.' },
      { name: 'Dark zone: SHM (AID)', type: 'kinase', phase: 'germinal centre', desc: 'Mutation of V genes', fn: 'Activation-induced cytidine deaminase mutates antibody genes at ~10⁻³/bp/division.', absent: 'AID deficiency → hyper-IgM type 2.', clinical: 'Off-target AID activity contributes to lymphoma translocations.' },
      { name: 'Light zone: selection on FDC', type: 'cell', phase: 'germinal centre', desc: 'Affinity competition', fn: 'B cells compete for antigen on FDCs and Tfh help; higher affinity wins survival signals.', absent: '', clinical: 'Repeated vaccine doses spaced apart improve affinity maturation.' },
      { name: 'Class switch recombination', type: 'branch', phase: 'germinal centre', desc: 'IgM → IgG / IgA / IgE', fn: 'Cytokines direct isotype: IL-4 → IgE/IgG4; IFN-γ → IgG; TGF-β → IgA.', absent: '', clinical: 'IgG4-related disease and IgE allergy are both class-switch outcomes.' },
      { name: 'Exit: plasma cell (BLIMP1) or memory B (BACH2)', type: 'transcription', phase: 'fate', desc: 'Fate decision', fn: 'Plasma cells lose CD20, gain BCMA and CD38, and home to bone-marrow niches (APRIL/IL-6) where some live for decades.', absent: '', clinical: 'Anti-CD20 spares long-lived plasma cells; anti-BCMA CAR-T and anti-CD38 target them.' }
    ],
    perturbations: [
      { q: 'Rituximab is given. Which antibodies fall?', target: 'CD20 depletion', chain: ['CD20+ naive and memory B cells are depleted', 'Long-lived CD20− plasma cells remain in bone marrow', 'Established protective titres (tetanus, measles) persist', 'Short-lived autoantibody responses fed by new B cells fall (e.g., ANCA)', 'New vaccine responses are blunted for 6–12 months'], clinical: 'Vaccinate before rituximab; screen HBV (reactivation risk). Pathogenic antibodies made by long-lived plasma cells may not fall.' },
      { q: 'What if Tfh cells cannot express CD40L?', target: 'CD40L', chain: ['B cells receive no CD40 signal', 'No germinal centres form', 'No class switching or SHM', 'High IgM, absent IgG/IgA/IgE', 'Also defective macrophage activation → Pneumocystis, Cryptosporidium'], clinical: 'X-linked hyper-IgM syndrome: IVIG, PJP prophylaxis, often HSCT.' }
    ]
  },
  {
    id: 'type2', module: 'C', title: 'Type-2 immunity: alarmins to asthma',
    question: 'Why does tezepelumab work in low-eosinophil asthma when mepolizumab does not?',
    cells: ['ilc', 'cd4', 'eosinophil', 'mast', 'basophil'], nodes: ['M022', 'M021', 'C009', 'C012', 'M007', 'M008', 'M009', 'M029', 'R014', 'I006', 'I021', 'I022', 'I028', 'B012', 'B016'],
    steps: [
      { name: 'Epithelial alarmins: TSLP, IL-33, IL-25', type: 'cytokine', phase: 'trigger', desc: 'Damaged epithelium raises the alarm', fn: 'Allergens (protease activity), viruses and pollutants trigger alarmin release.', absent: '', clinical: 'Tezepelumab (anti-TSLP) acts here, upstream of both type-2 and some non-type-2 inflammation.' },
      { name: 'ILC2 + DC activation', type: 'cell', phase: 'innate', desc: 'Rapid innate type-2 source', fn: 'ILC2s secrete IL-5 and IL-13 within hours; TSLP-primed DCs drive Th2 priming (OX40L).', absent: '', clinical: 'ILC2s can sustain steroid-resistant airway inflammation.' },
      { name: 'Th2 differentiation (GATA3)', type: 'transcription', phase: 'adaptive', desc: 'IL-4 → STAT6 → GATA3', fn: 'Th2 cells produce IL-4, IL-5, IL-13.', absent: '', clinical: '' },
      { name: 'IL-4 / IL-13 → IL-4Rα', type: 'receptor', phase: 'effector', desc: 'Shared receptor subunit', fn: 'IL-4 (type I/II receptor) and IL-13 (type II receptor) both use IL-4Rα → IgE switching, mucus, FeNO, remodelling.', absent: '', clinical: 'Dupilumab blocks IL-4Rα → both cytokines; conjunctivitis is a mechanistic prediction (goblet-cell mucin depends on IL-13).' },
      { name: 'IgE → FcεRI on mast cells/basophils', type: 'branch', phase: 'effector', desc: 'Sensitisation', fn: 'Re-exposure cross-links IgE → degranulation (histamine, tryptase, leukotrienes) within minutes.', absent: '', clinical: 'Omalizumab removes free IgE and downregulates FcεRI.' },
      { name: 'IL-5 → eosinophils', type: 'branch', phase: 'effector', desc: 'Production, survival, recruitment', fn: 'Eosinophils release MBP, ECP and EPX, damaging epithelium.', absent: '', clinical: 'Mepolizumab/reslizumab (IL-5) and benralizumab (IL-5Rα, depleting) require eosinophilic phenotype.' }
    ],
    perturbations: [
      { q: 'Which biologic fits a patient with eosinophils 80/µL and FeNO 15 ppb?', target: 'Low type-2 asthma', chain: ['Low eosinophils → little target for anti-IL-5', 'Low FeNO → little IL-13 activity → dupilumab benefit smaller', 'TSLP acts upstream on multiple pathways', 'NAVIGATOR showed exacerbation reduction even with eos <150/µL'], clinical: 'Tezepelumab is the biologic with evidence across eosinophil strata.' },
      { q: 'Why do some patients develop conjunctivitis on dupilumab?', target: 'IL-4Rα blockade', chain: ['Conjunctival goblet cells require IL-13 for mucin production', 'Dupilumab blocks IL-4Rα → IL-13 signalling falls', 'Goblet cell numbers and MUC5AC fall', 'Tear-film instability → conjunctivitis', 'More frequent in atopic dermatitis than asthma'], clinical: 'A side-effect that the mechanism predicts, explain it rather than memorise it.' }
    ]
  }
];

/* ---------------- CURRICULUM (15 modules, now mapped to live features) ---------------- */
CONTENT.modules = [
  { letter: 'A', title: 'Molecular immunology', layer: 2, status: 'active', where: 'mechanism', lessons: ['tcr', 'tlr4', 'nlrp3', 'sting', 'complement'] },
  { letter: 'B', title: 'Cellular state transitions', layer: 2, status: 'active', where: 'mechanism', lessons: ['gc', 'checkpoint'] },
  { letter: 'C', title: 'Cytokine networks', layer: 2, status: 'active', where: 'mechanism', lessons: ['il6', 'type2'] },
  { letter: 'D', title: 'Control theory', layer: 3, status: 'active', where: 'system' },
  { letter: 'E', title: 'Immunological synapses', layer: 3, status: 'active', where: 'mechanism', lessons: ['checkpoint'] },
  { letter: 'F', title: 'Tissue immunology', layer: 4, status: 'active', where: 'dynamics' },
  { letter: 'G', title: 'Immunometabolism', layer: 4, status: 'active', where: 'dynamics' },
  { letter: 'H', title: 'Immunogenetics & epigenetics', layer: 4, status: 'active', where: 'dynamics' },
  { letter: 'I', title: 'Immunopathology', layer: 5, status: 'active', where: 'disease' },
  { letter: 'J', title: 'Cancer immunology', layer: 5, status: 'active', where: 'disease' },
  { letter: 'K', title: 'Therapeutic immunology', layer: 6, status: 'active', where: 'therapy' },
  { letter: 'L', title: 'Clinical immunology', layer: 7, status: 'active', where: 'evidence' },
  { letter: 'M', title: 'Clinical trials as experiments', layer: 7, status: 'active', where: 'evidence' },
  { letter: 'N', title: 'Precision immunology', layer: 8, status: 'active', where: 'patient' },
  { letter: 'O', title: 'AI for immunology', layer: 9, status: 'active', where: 'ai' }
];

/* ---------------- TEACHING ROUTES (corrected) ---------------- */
CONTENT.routes = [
  { title: 'TNF → RA → anti-TNF', chain: ['C003', 'M001', 'P001', 'D001', 'I001', 'TR001'], cells: ['macrophage'], desc: 'Macrophage TNF → NF-κB → synovitis → infliximab → ATTRACT slowed radiographic progression.' },
  { title: 'IL-6 → CRS / COVID-19 → tocilizumab', chain: ['C003', 'M003', 'P002', 'D022', 'I003'], cells: ['macrophage', 'monocyte'], desc: 'Myeloid IL-6 → JAK–STAT3 → capillary leak and acute phase → IL-6R blockade.' },
  { title: 'PD-1 → melanoma → pembrolizumab', chain: ['C015', 'R011', 'C027', 'D012', 'I008', 'TR003'], cells: ['cd8'], desc: 'Chronic antigen → PD-1-high exhausted CTLs → pembrolizumab reinvigorates → KEYNOTE-006.' },
  { title: 'Th2 → asthma → dupilumab', chain: ['C012', 'M009', 'R017', 'D005', 'I006', 'TR011'], cells: ['cd4', 'ilc'], desc: 'Th2/ILC2 IL-13 → IL-4Rα → airway type-2 inflammation → dupilumab → LIBERTY ASTHMA QUEST.' },
  { title: 'Th17 → psoriasis → secukinumab', chain: ['C013', 'M010', 'C029', 'D003', 'I004', 'TR004'], cells: ['cd4', 'gdt'], desc: 'Th17/γδ IL-17A → keratinocyte hyperproliferation → secukinumab → ERASURE.' },
  { title: 'Granuloma → TNF → TB reactivation risk', chain: ['X001', 'C003', 'M001', 'T008', 'I032', 'D010'], cells: ['macrophage'], desc: 'TNF maintains the granuloma wall; anti-TNF can release latent TB.' },
  { title: 'Urate → NLRP3 → IL-1β → CVD', chain: ['R004', 'P003', 'M002', 'D019', 'I023', 'TR002'], cells: ['macrophage', 'neutrophil'], desc: 'Crystals activate NLRP3 → IL-1β → plaque inflammation → canakinumab → CANTOS.' },
  { title: 'C5 → PNH → eculizumab → Neisseria risk', chain: ['P013', 'M028', 'D023', 'I027', 'X007'], cells: ['complement'], desc: 'One target, one benefit, one predictable risk.' },
  { title: 'EBV → B cells → MS → anti-CD20', chain: ['X006', 'C017', 'D002', 'I012', 'TR007'], cells: ['bcell', 'memory'], desc: 'A discovery-to-therapy loop: EBV epidemiology reframes the question of why B-cell depletion works in MS.' }
];

/* ---------------- LAYER 3: SYSTEM, simulator presets ---------------- */
CONTENT.simPresets = {
  normal: { label: 'Acute bacterial infection', p: { growth: 1.2, inoculum: 0.05, innate: 1, adaptive: 1, regulation: 1, cytokineGain: 1, lag: 4, memory: 0 }, note: 'Innate effectors contain early growth; adaptive effectors clear the pathogen after a ~4-day lag; regulation returns the system to baseline.' },
  vaccinated: { label: 'Vaccinated host', p: { growth: 1.2, inoculum: 0.05, innate: 1, adaptive: 1, regulation: 1, cytokineGain: 1, lag: 1.5, memory: 0.4 }, note: 'Pre-existing memory shortens the lag and raises the starting adaptive pool, the pathogen is cleared before damage accumulates.' },
  scid: { label: 'SCID (no adaptive)', p: { growth: 1.2, inoculum: 0.05, innate: 1, adaptive: 0, regulation: 1, cytokineGain: 1, lag: 4, memory: 0 }, note: 'Innate immunity alone limits but cannot clear the pathogen, persistent infection.' },
  neutropenia: { label: 'Neutropenia', p: { growth: 1.2, inoculum: 0.05, innate: 0.15, adaptive: 1, regulation: 1, cytokineGain: 1, lag: 4, memory: 0 }, note: 'Without early innate containment the pathogen load explodes before adaptive immunity arrives.' },
  storm: { label: 'Cytokine storm', p: { growth: 1.6, inoculum: 0.08, innate: 1.2, adaptive: 1, regulation: 0.3, cytokineGain: 2.6, lag: 5, memory: 0 }, note: 'High cytokine gain with weak regulation: positive feedback dominates and tissue damage is driven by the host response.' },
  chronic: { label: 'Chronic / persistent antigen', p: { growth: 1.1, inoculum: 0.05, innate: 0.5, adaptive: 0.15, regulation: 3, cytokineGain: 1, lag: 6, memory: 0 }, note: 'Strong regulation and weak effectors reach a stalemate: low-grade persistence (think chronic viral infection or granuloma).' }
};

/* ---------------- LAYER 4: DYNAMICS ---------------- */
CONTENT.tissues = [
  { name: 'Bone marrow', node: 'T009', role: 'Haematopoiesis; B-cell development; long-lived plasma-cell niches (CXCL12, APRIL, IL-6).', keyCells: ['Haematopoietic stem cell', 'Plasma cell', 'Neutrophil precursors'], failure: 'Myeloma, aplastic anaemia, emergency granulopoiesis in sepsis.' },
  { name: 'Thymus', node: 'T010', role: 'T-cell development; positive selection (cortex), negative selection via AIRE+ mTECs (medulla); natural Treg generation.', keyCells: ['Thymocyte', 'mTEC', 'tTreg'], failure: 'DiGeorge (athymia), AIRE deficiency (APS-1), thymoma-associated myasthenia.' },
  { name: 'Lymph node', node: 'T004', role: 'Antigen meets lymphocyte: DCs arrive via afferent lymph; T-zone priming; B-cell follicles and germinal centres.', keyCells: ['cDC', 'Naive T', 'Tfh', 'GC B cell', 'FDC'], failure: 'Lymphoma; tumour-draining node is where checkpoint blockade often acts.' },
  { name: 'Spleen', node: 'T011', role: 'Filters blood; marginal-zone B cells respond to encapsulated bacteria; red pulp removes old RBCs.', keyCells: ['Marginal-zone B cell', 'Red-pulp macrophage'], failure: 'Asplenia → overwhelming pneumococcal/meningococcal sepsis (vaccinate).' },
  { name: 'Gut mucosa', node: 'T003', role: 'Largest immune organ; tolerance to food and microbiota (Treg, IgA), Th17/ILC3 barrier defence.', keyCells: ['Th17', 'Treg', 'IgA plasma cell', 'ILC3', 'MAIT'], failure: 'IBD, coeliac disease, GVHD gut.' },
  { name: 'Lung', node: 'T002', role: 'Alveolar macrophages maintain surfactant and tolerance; rapid innate response to inhaled pathogens.', keyCells: ['Alveolar macrophage', 'ILC2', 'Trm'], failure: 'Asthma, ARDS, TB, pulmonary alveolar proteinosis (GM-CSF autoantibodies).' },
  { name: 'Skin', node: 'T001', role: 'Keratinocyte barrier, Langerhans cells, dermal γδ T, resident memory T cells.', keyCells: ['Keratinocyte', 'Langerhans cell', 'γδ T', 'Trm'], failure: 'Psoriasis, atopic dermatitis, vitiligo, SJS/TEN.' },
  { name: 'Liver', node: 'T014', role: 'Tolerogenic organ; Kupffer cells clear gut-derived bacteria; MAIT-rich; acute-phase protein factory.', keyCells: ['Kupffer cell', 'MAIT', 'Hepatocyte'], failure: 'Autoimmune hepatitis, checkpoint hepatitis, HBV reactivation after B-cell depletion.' },
  { name: 'CNS', node: 'T012', role: 'Microglia; blood–brain barrier restricts entry; meningeal lymphatics drain to deep cervical nodes.', keyCells: ['Microglia', 'Border-associated macrophage'], failure: 'MS, NMOSD, ICANS after CAR-T.' },
  { name: 'Synovium', node: 'T006', role: 'Lining macrophages form a protective barrier; in RA, fibroblasts and lymphoid aggregates sustain inflammation.', keyCells: ['Synovial fibroblast', 'Lining macrophage', 'B cell'], failure: 'RA pathotypes (lympho-myeloid, diffuse-myeloid, pauci-immune) predict response.' },
  { name: 'Tumour microenvironment', node: 'T007', role: 'Hot (T-cell inflamed), excluded or cold (desert) phenotypes; suppressive TAMs, MDSCs, Tregs, adenosine, hypoxia.', keyCells: ['CD8 CTL', 'TAM', 'MDSC', 'Treg', 'CAF'], failure: 'Immune escape; resistance to checkpoint blockade.' },
  { name: 'Artery wall', node: 'T013', role: 'Lipid-laden macrophages, cholesterol crystals and NLRP3 sustain plaque inflammation.', keyCells: ['Foam cell', 'Plaque macrophage'], failure: 'Atherosclerosis; residual inflammatory risk.' }
];

CONTENT.metabolism = [
  { state: 'Naive / memory T cell', programme: 'OXPHOS + fatty-acid oxidation', regulators: 'AMPK, low mTOR', why: 'Quiescent, long-lived; spare respiratory capacity enables rapid recall.', lever: 'Metformin/rapamycin can favour memory formation (preclinical).' },
  { state: 'Effector T cell', programme: 'Aerobic glycolysis + glutaminolysis', regulators: 'mTORC1, MYC, HIF-1α', why: 'Biosynthesis for rapid division; glycolytic GAPDH frees IFNG mRNA for translation.', lever: 'Tumour glucose competition starves T cells.' },
  { state: 'Treg', programme: 'OXPHOS, FAO; tolerates lactate', regulators: 'Foxp3 represses MYC/glycolysis', why: 'Thrives in lactate-rich TME where effectors fail.', lever: 'Explains Treg dominance in glycolytic tumours.' },
  { state: 'Exhausted T cell', programme: 'Mitochondrial dysfunction, depolarised mitochondria', regulators: 'PD-1 suppresses PGC-1α', why: 'Loss of metabolic fitness parallels loss of function.', lever: '4-1BB co-stimulation (e.g., in cilta-cel) favours mitochondrial biogenesis and persistence.' },
  { state: 'M1-like macrophage', programme: 'Glycolysis; broken TCA cycle (succinate, itaconate)', regulators: 'HIF-1α, NF-κB', why: 'Succinate stabilises HIF-1α → IL-1β; itaconate is anti-microbial and anti-inflammatory feedback.', lever: 'Dimethyl fumarate (MS) and 4-octyl itaconate act on this axis.' },
  { state: 'M2-like / resolving macrophage', programme: 'OXPHOS, FAO', regulators: 'STAT6, PPARγ', why: 'Supports repair and efferocytosis.', lever: 'Efferocytosis feeds metabolites that sustain resolution.' },
  { state: 'Trained monocyte', programme: 'Glycolysis + mevalonate pathway', regulators: 'mTOR–HIF-1α; H3K4me3 at enhancers', why: 'Epigenetic memory after BCG/β-glucan.', lever: 'Statins blunt trained immunity in vitro.' }
];

CONTENT.genetics = [
  { allele: 'HLA-B*27', association: 'Ankylosing spondylitis / axial SpA', note: '~90% of patients in many European cohorts; misfolding and IL-23/IL-17 axis.' },
  { allele: 'HLA-DRB1 shared epitope (*04:01, *04:04, *01:01)', association: 'ACPA-positive RA', note: 'Preferential presentation of citrullinated peptides.' },
  { allele: 'HLA-DQ2 / DQ8', association: 'Coeliac disease; type 1 diabetes', note: 'Deamidated gliadin binds DQ2/DQ8 with high affinity.' },
  { allele: 'HLA-B*57:01', association: 'Abacavir hypersensitivity', note: 'Drug alters the peptide groove; mandatory pre-prescription screening.' },
  { allele: 'HLA-B*15:02', association: 'Carbamazepine SJS/TEN', note: 'Screen in people of Han Chinese/Southeast Asian ancestry.' },
  { allele: 'HLA-B*58:01', association: 'Allopurinol SJS/TEN/DRESS', note: 'Screening recommended in high-prevalence ancestries.' },
  { allele: 'TYK2 P1104A', association: 'Protection from RA, SLE, psoriasis; TB susceptibility (homozygous)', note: 'Human genetics validated the deucravacitinib target.' },
  { allele: 'PTPN22 R620W', association: 'RA, T1D, SLE, Graves', note: 'Alters TCR/BCR signalling thresholds.' },
  { allele: 'IL23R R381Q', association: 'Protection from IBD and psoriasis', note: 'Loss-of-function supports targeting IL-23.' },
  { allele: 'NOD2 variants', association: 'Ileal Crohn disease', note: 'Impaired bacterial sensing and Paneth-cell function.' }
];

/* ---------------- LAYER 5: DISEASE ---------------- */
CONTENT.hypersensitivity = [
  { type: 'I', name: 'Immediate (IgE)', mechanism: 'Allergen cross-links IgE on mast cells/basophils → histamine, tryptase, leukotrienes within minutes.', examples: 'Anaphylaxis, allergic asthma, urticaria, food allergy.', test: 'Skin-prick, specific IgE, tryptase.', therapy: 'Adrenaline, antihistamines, omalizumab, allergen immunotherapy.' },
  { type: 'II', name: 'Antibody against cell/matrix antigen', mechanism: 'IgG/IgM bind fixed antigens → complement, ADCC, receptor blockade or stimulation.', examples: 'AIHA, Goodpasture, myasthenia gravis, Graves, NMOSD, ANCA vasculitis.', test: 'Direct Coombs, specific autoantibodies.', therapy: 'Plasma exchange, IVIG, rituximab, FcRn blockers, complement inhibitors.' },
  { type: 'III', name: 'Immune complex', mechanism: 'Soluble antigen–antibody complexes deposit in vessels/glomeruli → complement and neutrophil injury.', examples: 'SLE nephritis, serum sickness, post-streptococcal GN.', test: 'Low C3/C4, anti-dsDNA, biopsy immunofluorescence.', therapy: 'Steroids, mycophenolate, belimumab, anifrolumab.' },
  { type: 'IV', name: 'Delayed (T-cell)', mechanism: 'Th1, Th2, Th17 or CTL responses 48–72 h after exposure (subtypes IVa–IVd).', examples: 'Contact dermatitis, TB skin test, SJS/TEN, DRESS, T1D, coeliac.', test: 'Patch test, IGRA, HLA screening.', therapy: 'Avoid trigger, topical/systemic steroids, targeted biologics.' }
];

CONTENT.cancerCycle = [
  { step: 1, name: 'Release of cancer antigens', fail: 'Low mutational burden; no immunogenic cell death', lever: 'Chemotherapy, radiotherapy, oncolytic viruses' },
  { step: 2, name: 'Antigen presentation', fail: 'Few cDC1s; WNT/β-catenin-driven exclusion', lever: 'FLT3L, STING agonists, TLR agonists' },
  { step: 3, name: 'Priming and activation', fail: 'CTLA-4 brake; Tregs', lever: 'Anti-CTLA-4 (ipilimumab), vaccines' },
  { step: 4, name: 'Trafficking to tumour', fail: 'Chemokine silencing', lever: 'Epigenetic agents (preclinical/early)' },
  { step: 5, name: 'Infiltration', fail: 'Stromal (TGF-β) exclusion; abnormal vasculature', lever: 'Anti-VEGF, TGF-β blockade' },
  { step: 6, name: 'Recognition of cancer cells', fail: 'MHC-I / B2M loss', lever: 'NK-directed therapy, CAR-T (MHC-independent)' },
  { step: 7, name: 'Killing of cancer cells', fail: 'PD-L1, adenosine, MDSCs, exhaustion', lever: 'Anti-PD-1/PD-L1, bispecifics, adenosine pathway inhibitors' }
];

/* ---------------- LAYER 6: THERAPY, mechanistic adverse-effect predictions ---------------- */
CONTENT.drugAE = {
  I032: ['Latent TB reactivation (granuloma requires TNF)', 'Worsening of moderate–severe heart failure (ATTACH, RENEWAL)', 'Demyelination / MS exacerbation (lenercept)', 'Paradoxical psoriasis', 'Drug-induced lupus (anti-dsDNA)'],
  I001: ['As TNF-blockade class', 'Infusion reactions; anti-drug antibodies (use with methotrexate)'],
  I002: ['As TNF-blockade class', 'Anti-drug antibodies reduce trough levels'],
  I007: ['As TNF-blockade class', 'Ineffective in Crohn disease, probably because the soluble receptor does not induce apoptosis of mucosal T cells'],
  I003: ['CRP and fever suppressed, masks infection', 'Lower GI perforation (diverticulitis)', 'Raised lipids and transaminases', 'Neutropenia'],
  I004: ['Mucocutaneous candidiasis (Th17 defends against Candida)', 'New or worsened IBD (IL-17A protects gut barrier)'],
  I005: ['Generally favourable; infection risk modest'],
  I006: ['Conjunctivitis (IL-13 → goblet-cell mucin)', 'Transient eosinophilia (IL-4/IL-13 regulate eosinophil trafficking)', 'Facial erythema'],
  I008: ['Immune-related adverse events: thyroiditis, pneumonitis, colitis, hepatitis, hypophysitis, T1D', 'Flare of pre-existing autoimmunity'],
  I009: ['As pembrolizumab'],
  I025: ['Colitis and hypophysitis more frequent than with PD-1 blockade', 'Higher grade 3–4 irAEs in combination'],
  I010: ['Infection, hyperglycaemia, osteoporosis, adrenal suppression', 'Impairs viral clearance if given before hyperinflammatory phase'],
  I011: ['Hypogammaglobulinaemia with repeated courses', 'HBV reactivation (screen)', 'Blunted vaccine responses', 'PML (rare)'],
  I012: ['As rituximab; infusion reactions', 'Reduced vaccine responses'],
  I013: ['Transient lymphopenia; CRS-like symptoms; rash', 'EBV/CMV reactivation (monitor)'],
  I014: ['Herpes zoster (IFN signalling)', 'VTE and MACE class warnings for JAK inhibitors (ORAL Surveillance, tofacitinib)'],
  I015: ['Herpes zoster and respiratory infections (type I IFN is antiviral)'],
  I016: ['CRS and ICANS', 'Delayed movement and neurocognitive toxicity (parkinsonism)', 'Prolonged cytopenias, hypogammaglobulinaemia'],
  I017: ['CRS and neurotoxicity', 'B-cell aplasia'],
  I018: ['Infections; depression signal'],
  I019: ['Infusion reactions; B-cell depletion effects'],
  I020: ['Acne, upper respiratory infections; spares JAK1–3 so fewer lab abnormalities'],
  I021: ['Anaphylaxis (rare)'],
  I022: ['Pharyngitis; theoretical impairment of anti-helminth immunity'],
  I023: ['Increased fatal infections (CANTOS), neutropenia'],
  I024: ['Infections; theoretical reduction of vaccine responses'],
  I026: ['Injection-site reactions; neutropenia'],
  I027: ['Meningococcal infection (MAC needed to lyse Neisseria), vaccinate', 'Breakthrough haemolysis if under-dosed'],
  I028: ['Generally well tolerated; helminth infection theoretical'],
  I029: ['Gut-selective: no PML signal (unlike natalizumab)', 'Nasopharyngitis'],
  I030: ['GI intolerance; drug interactions (CYP3A4/P-gp); myopathy with statins'],
  I031: ['Nephrotoxicity, hypertension, tremor, diabetes; PRES']
};

/* ---------------- LAYER 7: EVIDENCE, trial lessons ---------------- */
CONTENT.trialLessons = {
  TR001: { year: 2000, hypothesis: 'TNF is a causal driver of RA synovitis and erosion.', outcome: 'Infliximab plus methotrexate slowed radiographic progression.', lesson: 'Launched the biologic era; cytokines are druggable.', result: 'positive' },
  TR002: { year: 2017, hypothesis: 'Inflammation independently drives atherothrombosis.', outcome: 'MACE −15% (HR 0.85) with no LDL change; more fatal infections.', lesson: 'Demonstrated the inflammatory hypothesis of atherosclerosis.', result: 'positive' },
  TR003: { year: 2015, hypothesis: 'Releasing PD-1 restores anti-tumour CTL function.', outcome: 'Pembrolizumab beat ipilimumab; ~39% alive at 5 years.', lesson: 'Peripheral checkpoints, not priming, limit established tumour immunity.', result: 'positive' },
  TR004: { year: 2014, hypothesis: 'IL-17A is the effector of psoriatic plaques.', outcome: 'Secukinumab produced high PASI 75 rates vs placebo and etanercept.', lesson: 'The IL-23/IL-17 axis is the core of psoriasis.', result: 'positive' },
  TR005: { year: 2016, hypothesis: 'IL-4/IL-13 drive atopic dermatitis.', outcome: 'Dupilumab improved EASI and itch (SOLO 1/2).', lesson: 'Blocking a shared receptor subunit removes two cytokines at once.', result: 'positive' },
  TR006: { year: 2010, hypothesis: 'B cells (ANCA producers) drive vasculitis.', outcome: 'Rituximab non-inferior to cyclophosphamide; superior in relapsing disease.', lesson: 'B-cell depletion can replace alkylating agents.', result: 'positive' },
  TR007: { year: 2017, hypothesis: 'B cells drive progressive MS.', outcome: 'Ocrelizumab modestly reduced disability progression in PPMS.', lesson: 'First positive progressive MS trial; B cells matter beyond antibody.', result: 'positive' },
  TR008: { year: 2019, hypothesis: 'Modulating autoreactive T cells delays T1D onset.', outcome: 'Median delay ~2 years in stage 2 T1D.', lesson: 'Autoimmune disease can be intercepted before symptoms.', result: 'positive' },
  TR009: { year: 2021, hypothesis: 'Late COVID-19 is driven by the host response.', outcome: 'Dexamethasone reduced 28-day mortality in patients on oxygen or ventilation; no benefit without oxygen.', lesson: 'Same drug, different phase, opposite effect.', result: 'positive' },
  TR010: { year: 2023, hypothesis: 'BCMA CAR-T outperforms standard regimens earlier in myeloma.', outcome: 'Improved progression-free survival vs standard care in lenalidomide-refractory myeloma.', lesson: 'Cell therapy moving to earlier lines.', result: 'positive' },
  TR011: { year: 2018, hypothesis: 'IL-4Rα blockade benefits type-2 asthma.', outcome: 'Fewer exacerbations; larger benefit with eos ≥300/µL or high FeNO.', lesson: 'Biomarkers select the responsive endotype.', result: 'positive' },
  TR012: { year: 2019, hypothesis: 'Cheap anti-inflammatory therapy reduces post-MI events.', outcome: 'Colchicine reduced ischaemic events.', lesson: 'Mechanism validated with an old drug.', result: 'positive' },
  TR013: { year: 1999, hypothesis: 'Blocking TNF will help MS as it helps RA.', outcome: 'More frequent and earlier exacerbations.', lesson: 'TNFR2 signalling may be protective in the CNS; a cytokine’s role is tissue-specific.', result: 'negative' },
  TR014: { year: 2012, hypothesis: 'IL-17A blockade will help Crohn disease (IL-17 is high in gut).', outcome: 'Ineffective; more adverse events and worsening.', lesson: 'High level ≠ pathogenic role; IL-17A protects the epithelial barrier.', result: 'negative' },
  TR015: { year: 2003, hypothesis: 'TNF drives cardiac dysfunction in heart failure.', outcome: 'High-dose infliximab increased death/hospitalisation.', lesson: 'Association-driven targeting can harm; anti-TNF contraindicated in NYHA III–IV.', result: 'negative' },
  TR016: { year: 2014, hypothesis: 'Eosinophils drive exacerbations in eosinophilic asthma.', outcome: 'Mepolizumab halved exacerbations.', lesson: 'Earlier anti-IL-5 trials failed because patients were not selected by eosinophils.', result: 'positive' },
  TR017: { year: 2017, hypothesis: 'Redirecting T cells to CD19 kills B-ALL blasts.', outcome: 'Longer survival vs chemotherapy.', lesson: 'Bispecific engagers turn polyclonal T cells into tumour-specific killers.', result: 'positive' },
  TR018: { year: 2019, hypothesis: 'CD19+ plasmablasts produce pathogenic AQP4-IgG.', outcome: 'Inebilizumab reduced attacks.', lesson: 'Target the antibody-producing cell, not just B cells.', result: 'positive' },
  TR019: { year: 2013, hypothesis: 'Blocking gut homing treats UC without systemic immunosuppression.', outcome: 'Induction and maintenance of remission.', lesson: 'Location is a therapeutic dimension.', result: 'positive' },
  TR020: { year: 2015, hypothesis: 'CTLA-4 and PD-1 are non-redundant brakes.', outcome: 'Combination improved response and survival with more toxicity.', lesson: 'Two brakes, two sites, additive efficacy and toxicity.', result: 'positive' },
  TR021: { year: 2020, hypothesis: 'Type I IFN drives SLE.', outcome: 'Anifrolumab met BICLA endpoint (TULIP-1 had missed its primary SRI-4 endpoint).', lesson: 'Endpoint choice can decide a trial.', result: 'positive' },
  TR022: { year: 2011, hypothesis: 'BAFF sustains autoreactive B cells in SLE.', outcome: 'Belimumab improved SRI.', lesson: 'First new SLE drug in ~50 years.', result: 'positive' },
  TR023: { year: 2021, hypothesis: 'TSLP sits upstream of multiple asthma pathways.', outcome: 'Exacerbations fell, including in low-eosinophil patients.', lesson: 'Upstream targets broaden the responsive population.', result: 'positive' },
  TR024: { year: 2023, hypothesis: 'Selective TYK2 inhibition treats psoriasis.', outcome: 'Superior to placebo and apremilast.', lesson: 'Genetics → allosteric selectivity → approval.', result: 'positive' },
  TR025: { year: 2006, hypothesis: 'Terminal complement drives PNH haemolysis.', outcome: 'Stabilised haemoglobin, reduced transfusion.', lesson: 'A single protein target for a single-mechanism disease.', result: 'positive' },
  TR026: { year: 2006, hypothesis: 'CD28 superagonist will expand Tregs safely.', outcome: 'Life-threatening cytokine storm in all six volunteers within hours.', lesson: 'Human CD4 effector memory T cells express CD28; those of the macaques used for safety testing do not. First-in-human dosing now starts from the minimal anticipated biological effect level (MABEL).', result: 'safety' }
};

/* ---------------- LAYER 8: PATIENT, profile rules ---------------- */
CONTENT.flags = [
  { id: 'ltbi', label: 'Latent TB (positive IGRA)', group: 'Comorbidity' },
  { id: 'hf', label: 'Heart failure NYHA III–IV', group: 'Comorbidity' },
  { id: 'demyel', label: 'History of demyelination / MS', group: 'Comorbidity' },
  { id: 'ibd', label: 'Inflammatory bowel disease', group: 'Comorbidity' },
  { id: 'hbv', label: 'HBV (HBsAg+ or anti-HBc+)', group: 'Comorbidity' },
  { id: 'cv', label: 'Age ≥50 with CV risk factors / smoker', group: 'Comorbidity' },
  { id: 'vte', label: 'Previous VTE', group: 'Comorbidity' },
  { id: 'candida', label: 'Recurrent candidiasis', group: 'Comorbidity' },
  { id: 'autoimm', label: 'Pre-existing autoimmune disease', group: 'Comorbidity' },
  { id: 'unvacc_mening', label: 'Not vaccinated against meningococcus', group: 'Comorbidity' },
  { id: 'eos_hi', label: 'Blood eosinophils ≥300/µL', group: 'Biomarker' },
  { id: 'eos_lo', label: 'Blood eosinophils <150/µL', group: 'Biomarker' },
  { id: 'feno_hi', label: 'FeNO ≥25 ppb', group: 'Biomarker' },
  { id: 'ige_hi', label: 'Raised total IgE + perennial sensitisation', group: 'Biomarker' },
  { id: 'acpa', label: 'ACPA / anti-CCP positive', group: 'Biomarker' },
  { id: 'isg_hi', label: 'High interferon gene signature', group: 'Biomarker' },
  { id: 'pdl1_hi', label: 'PD-L1 TPS ≥50%', group: 'Biomarker' },
  { id: 'tmb_hi', label: 'High TMB (≥10 mut/Mb)', group: 'Biomarker' },
  { id: 'hypoxic', label: 'Requires supplemental oxygen', group: 'Clinical state' },
  { id: 'no_o2', label: 'No oxygen requirement', group: 'Clinical state' },
  { id: 'aab2', label: '≥2 islet autoantibodies + dysglycaemia', group: 'Biomarker' }
];
// rules: drug ids, flag, effect (+ support / - caution), message
CONTENT.rules = [
  { drugs: ['I032', 'I001', 'I002', 'I007'], flag: 'ltbi', effect: -2, msg: 'TNF maintains the granuloma; treat latent TB before starting anti-TNF.' },
  { drugs: ['I032', 'I001', 'I002', 'I007'], flag: 'hf', effect: -3, msg: 'ATTACH/RENEWAL: anti-TNF worsened moderate–severe heart failure. Avoid.' },
  { drugs: ['I032', 'I001', 'I002', 'I007'], flag: 'demyel', effect: -3, msg: 'Anti-TNF can trigger demyelination; lenercept worsened MS. Avoid.' },
  { drugs: ['I004'], flag: 'ibd', effect: -3, msg: 'IL-17A blockade can worsen IBD (secukinumab Crohn trial).' },
  { drugs: ['I004'], flag: 'candida', effect: -2, msg: 'IL-17 defends mucosa against Candida.' },
  { drugs: ['I005', 'I001', 'I002', 'I029'], flag: 'ibd', effect: 2, msg: 'Also effective in IBD, one drug for both diseases.' },
  { drugs: ['I011', 'I012', 'I019'], flag: 'hbv', effect: -2, msg: 'B-cell depletion → HBV reactivation; antiviral prophylaxis needed.' },
  { drugs: ['I014'], flag: 'cv', effect: -2, msg: 'JAK inhibitor class warning (ORAL Surveillance): higher MACE and malignancy in ≥50 with CV risk.' },
  { drugs: ['I014'], flag: 'vte', effect: -2, msg: 'JAK inhibitors carry a VTE warning.' },
  { drugs: ['I008', 'I009', 'I025'], flag: 'autoimm', effect: -1, msg: 'Checkpoint blockade can flare pre-existing autoimmunity; often still used with monitoring.' },
  { drugs: ['I027'], flag: 'unvacc_mening', effect: -3, msg: 'C5 blockade removes MAC killing of Neisseria, vaccinate (ACWY + B) at least 2 weeks before.' },
  { drugs: ['I028'], flag: 'eos_hi', effect: 3, msg: 'Eosinophilic phenotype: anti-IL-5 benefit scales with eosinophil count (MENSA).' },
  { drugs: ['I028'], flag: 'eos_lo', effect: -2, msg: 'Little eosinophil target, anti-IL-5 unlikely to help.' },
  { drugs: ['I006'], flag: 'eos_hi', effect: 2, msg: 'Eos ≥300 enriches dupilumab response in asthma (QUEST).' },
  { drugs: ['I006'], flag: 'feno_hi', effect: 2, msg: 'High FeNO reflects IL-13 activity, a dupilumab target.' },
  { drugs: ['I022'], flag: 'eos_lo', effect: 2, msg: 'TSLP is upstream: NAVIGATOR showed benefit even with low eosinophils.' },
  { drugs: ['I021'], flag: 'ige_hi', effect: 2, msg: 'Allergic (IgE-mediated) phenotype fits omalizumab.' },
  { drugs: ['I024'], flag: 'acpa', effect: 1, msg: 'Co-stimulation blockade acts upstream on T–B collaboration; ACPA+ association is observational rather than trial-level.' },
  { drugs: ['I015'], flag: 'isg_hi', effect: 2, msg: 'IFN-high patients have the target pathway engaged.' },
  { drugs: ['I008'], flag: 'pdl1_hi', effect: 2, msg: 'PD-L1 high enriches for response to PD-1 blockade.' },
  { drugs: ['I008', 'I009'], flag: 'tmb_hi', effect: 2, msg: 'More neoantigens → more targets for reinvigorated T cells.' },
  { drugs: ['I010'], flag: 'hypoxic', effect: 3, msg: 'RECOVERY: dexamethasone reduced mortality in patients needing oxygen.' },
  { drugs: ['I010'], flag: 'no_o2', effect: -2, msg: 'RECOVERY: no benefit (possible harm) without oxygen, viral clearance still needed.' },
  { drugs: ['I003', 'I014'], flag: 'hypoxic', effect: 2, msg: 'Added mortality benefit in hypoxic, inflamed COVID-19 (RECOVERY).' },
  { drugs: ['I013'], flag: 'aab2', effect: 3, msg: 'Matches TN10 population (stage 2 T1D).' }
];

/* ---------------- LAYER 9: AI, case reasoning ---------------- */
CONTENT.cases = [
  { role: 'Rheumatologist', q: 'Why might abatacept suit an anti-CCP-positive RA patient better than adalimumab?', path: ['B007', 'C017', 'C016', 'R019', 'R020', 'I024'], answer: 'ACPA+ RA is driven by T–B collaboration (Tfh help to autoreactive B cells). Abatacept blocks CD28–B7 co-stimulation upstream of that collaboration, whereas anti-TNF acts downstream on an effector cytokine. Comparative data are observational and should be treated as emerging evidence.' },
  { role: 'Medical science liaison', q: 'Explain why dupilumab causes conjunctivitis.', path: ['I006', 'R017', 'M009', 'D006'], answer: 'Dupilumab blocks IL-4Rα, shared by the type I (IL-4) and type II (IL-4/IL-13) receptors. Conjunctival goblet cells depend on IL-13 for mucin production; blocking it destabilises the tear film. The adverse effect is a mechanistic prediction.' },
  { role: 'CPD educator', q: 'Teach COVID-19 → dexamethasone as mechanistic reasoning.', path: ['X005', 'C003', 'M003', 'D018', 'I010', 'TR009'], answer: 'Early disease is viral replication (needs intact immunity); late hypoxic disease is macrophage-driven hyperinflammation. Dexamethasone suppresses the host response, lifesaving late, unhelpful or harmful early. Same drug, different phase.' },
  { role: 'Gastroenterologist', q: 'IL-17A is high in Crohn gut. Why did blocking it make patients worse?', path: ['C013', 'M010', 'D004', 'I004', 'TR014'], answer: 'In the gut, IL-17A maintains tight junctions and antimicrobial peptides. A high level marked a protective response, not the driver. IL-23 blockade (ustekinumab, risankizumab) works because it removes pathogenic Th17 programming upstream while sparing IL-23-independent barrier IL-17.' },
  { role: 'Haematologist', q: 'After CAR-T, fever 39 °C and hypotension on day 2. What is happening and what helps?', path: ['I016', 'C015', 'C003', 'M003', 'D022', 'I003'], answer: 'CAR-T activation → IFN-γ/GM-CSF → monocyte/macrophage IL-6 → endothelial trans-signalling → CRS. Tocilizumab blocks IL-6R without impairing CAR-T killing; steroids added for refractory CRS or ICANS.' },
  { role: 'Neurologist', q: 'Why does B-cell depletion work in MS if MS was considered a T-cell disease?', path: ['X006', 'C017', 'D002', 'I012', 'TR007'], answer: 'B cells act as antigen-presenting cells and cytokine sources for autoreactive T cells, and are the EBV reservoir. Anti-CD20 rapidly reduces relapses without lowering IgG, the effect is not via antibodies. EBV epidemiology (Bjornevik 2022) supports a B-cell–viral link.' }
];

/* ---------------- LAYER 10: RESEARCH ---------------- */
CONTENT.frontier = [
  { title: 'CAR-T for autoimmunity', node: 'DS004', status: 'EMERGING', text: 'CD19 CAR-T produced drug-free remissions in refractory SLE, myositis and systemic sclerosis case series. Open questions: durability, toxicity, cost, and whether a reset is truly achieved.' },
  { title: 'EBV and multiple sclerosis', node: 'DS001', status: 'EVIDENCE-SUPPORTED', text: 'EBV seroconversion preceded MS onset in a 10-million-person cohort. Next: EBV vaccines and antivirals, EBNA1–GlialCAM mimicry.' },
  { title: 'AI-discovered targets', node: 'DS002', status: 'EMERGING', text: 'TNIK inhibitor for IPF, target and molecule nominated with generative AI; phase 2a signal. AI shortens discovery but trials still decide.' },
  { title: 'Tissue-resident macrophage states', node: 'DS003', status: 'EMERGING', text: 'FOLR2+ macrophages: anti-tumour or suppressive? Single-cell and spatial data disagree by tissue, a reminder that cell states are context-dependent.' },
  { title: 'Residual inflammatory risk', node: 'DS005', status: 'EVIDENCE-SUPPORTED', text: 'IL-6 inhibition (ziltivekimab) is now in cardiovascular outcome trials, building on CANTOS and COLCOT.' }
];
// roadmap: a curation gap, plus the concepts it names that are already curated
CONTENT.roadmap = [
  { text: 'Attach a PMID or DOI to every mechanism link', related: [] },
  { text: 'Record the tissue in which each link has been shown', related: [] },
  { text: 'Use measured effect sizes as link weights in the simulator', related: [] },
  { text: 'Surface + curate draft EM layer (fibre/SCFA → Treg → IBD; barrier; sIgA)', related: ['C014', 'EM01', 'EM02', 'EM03'] },
  { text: 'Surface & curate draft vaccine immunology (adjuvants, mRNA, GC → memory, correlates)', related: ['EV01', 'EV04', 'C019', 'C018'] },
  { text: 'Surface & curate draft transplantation (direct/indirect allorecognition, AMR)', related: ['D016', 'ET01', 'ET02'] },
  { text: 'Surface & curate draft PID teaching (XLA, CGD, SCID live-vaccine risk) toward IUIS depth', related: ['D008', 'EP01', 'EP09'] },
  { text: 'Surface & curate draft immunogenetics (shared epitope → ACPA → RA; HLA screens)', related: ['EG02', 'B007', 'D001'] },
  { text: 'Paediatric and ageing (immunosenescence, inflammaging) modifiers in the patient layer', related: [] }
];

return CONTENT;
})();
/* Draft coverage extensions (see src/data/extensions.ts). */
import { EXT_LESSONS, EXT_ROUTES, EXT_FLAGS, EXT_RULES } from "./extensions";
{
  const C = CONTENT as any;
  C.lessons.push(...EXT_LESSONS);
  C.routes.push(...EXT_ROUTES);
  C.flags.push(...EXT_FLAGS);
  C.rules.push(...EXT_RULES);
  EXT_LESSONS.forEach((l) => { const m = C.modules.find((x: any) => x.letter === l.module); if (m) (m.lessons ||= []).push(l.id); });
}
