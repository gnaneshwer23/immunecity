/* Coverage extensions to KG v0.3 — DRAFT content written to close roadmap gaps
   (microbiome, vaccines, transplantation, primary immunodeficiency, frontier).
   Every item carries draft: true and needs expert review before it is treated as curated.
   The user's kg.json stays the source of truth; these are merged at load time. */

type N = { id: string; node_type: string; name: string; description: string; evidence_status: string };
type E = { subject_id: string; relation: string; object_id: string; mechanism: string; evidence_status: string; confidence: "high" | "medium" | "low"; location?: string };

const n = (id: string, node_type: string, name: string, description: string, evidence_status = "ESTABLISHED"): N => ({ id, node_type, name, description, evidence_status });
const e = (subject_id: string, relation: string, object_id: string, mechanism: string, location = "", evidence_status = "ESTABLISHED", confidence: E["confidence"] = "high"): E =>
  ({ subject_id, relation, object_id, mechanism, location, evidence_status, confidence });

export const EXT_NODES: N[] = [
  // microbiome & barrier
  n("EM01", "COMPARTMENT", "Gut microbiota", "Commensal bacteria of the colon; educate mucosal immunity and compete with pathogens"),
  n("EM02", "MOLECULE", "Short-chain fatty acids (butyrate)", "Fermentation products of dietary fibre; HDAC inhibition in T cells, fuel for colonocytes"),
  n("EM03", "PATHWAY", "Peripheral Treg induction (colonic)", "Microbial metabolites and antigens drive RORγt+ FOXP3+ Tregs in the colonic lamina propria"),
  n("EM04", "PATHWAY", "Epithelial barrier breach", "Loss of tight junctions and mucus lets microbial products reach the lamina propria"),
  n("EM05", "PATHWAY", "Dysbiosis", "Loss of diversity and butyrate producers, expansion of pathobionts", "EVIDENCE-SUPPORTED"),
  n("EM06", "MOLECULE", "Secretory IgA", "Dimeric IgA transported across epithelium; coats commensals and limits their contact with tissue"),
  // vaccines
  n("EV01", "INTERVENTION", "mRNA vaccine", "Lipid-nanoparticle mRNA encoding antigen; self-adjuvanting through innate sensing"),
  n("EV02", "MOLECULE", "Vaccine adjuvant (alum / TLR agonist)", "Adds innate danger signal so dendritic cells license T-cell priming"),
  n("EV03", "INTERVENTION", "Live attenuated vaccine", "Replicating weakened pathogen; strong durable immunity, contraindicated in severe immunosuppression"),
  n("EV04", "BIOMARKER", "Neutralising antibody titre", "Serum antibody level that blocks infection in vitro; correlate of protection for many vaccines"),
  // transplantation
  n("ET01", "PATHWAY", "Direct allorecognition", "Recipient T cells recognise intact donor HLA on donor antigen-presenting cells"),
  n("ET02", "DISEASE", "Acute cellular rejection", "T-cell-mediated graft injury, typically weeks to months after transplant"),
  n("ET03", "DISEASE", "Antibody-mediated rejection", "Donor-specific antibody binds graft endothelium and fixes complement"),
  n("ET04", "MOLECULE", "Donor-specific antibody", "Recipient antibody against donor HLA"),
  n("ET05", "INTERVENTION", "Antithymocyte globulin", "Polyclonal T-cell-depleting antibody used for induction and rejection"),
  // primary immunodeficiencies
  n("EP09", "MOLECULE", "BTK", "Bruton tyrosine kinase; BCR signalling needed for B-cell development"),
  n("EP01", "DISEASE", "X-linked agammaglobulinaemia", "BTK loss; absent B cells and antibodies; recurrent encapsulated bacterial infections"),
  n("EP02", "DISEASE", "Common variable immunodeficiency", "Low IgG with poor vaccine responses; infections, autoimmunity, granulomas"),
  n("EP03", "DISEASE", "Terminal complement deficiency (C5–C9)", "No membrane attack complex; recurrent Neisseria infection"),
  n("EP04", "DISEASE", "IL-12/IFN-γ axis defect (MSMD)", "Mendelian susceptibility to mycobacterial disease"),
  n("EP05", "DISEASE", "IPEX syndrome", "FOXP3 loss; no functional Tregs; early severe autoimmunity and enteropathy"),
  n("EP06", "DISEASE", "APECED (AIRE deficiency)", "Failed thymic tolerance; endocrine autoimmunity and chronic candidiasis"),
  n("EP07", "DISEASE", "22q11.2 deletion (DiGeorge)", "Thymic hypoplasia; variable T-cell lymphopenia"),
  n("EP08", "DISEASE", "Leukocyte adhesion deficiency type 1", "CD18 loss; neutrophils cannot leave blood; no pus, delayed cord separation"),
  // frontier
  n("EF01", "INTERVENTION", "CD19 CAR-T (autoimmune)", "CD19-directed CAR-T used to reset B-cell autoimmunity", "EMERGING"),
];

export const EXT_EDGES: E[] = [
  e("EM01", "produces", "EM02", "Fibre fermentation by Clostridia and Bacteroides yields butyrate, propionate, acetate.", "gut lumen"),
  e("EM02", "promotes", "EM03", "Butyrate inhibits HDAC at the Foxp3 locus, favouring colonic Treg differentiation.", "gut mucosa", "EVIDENCE-SUPPORTED", "medium"),
  e("EM03", "expands", "C014", "Induced Tregs populate the colonic lamina propria.", "gut mucosa"),
  e("EM05", "impairs", "EM02", "Loss of butyrate producers lowers SCFA supply.", "gut lumen", "EVIDENCE-SUPPORTED", "medium"),
  e("EM05", "contributes_to", "D004", "Dysbiosis is consistently observed in IBD; causality is partly established.", "gut mucosa", "EVIDENCE-SUPPORTED", "medium"),
  e("EM04", "triggers", "P001", "Microbial products crossing the barrier engage TLRs and NF-κB.", "gut mucosa"),
  e("EM04", "contributes_to", "D004", "Barrier defects precede and amplify IBD flares.", "gut mucosa", "EVIDENCE-SUPPORTED", "medium"),
  e("M035", "inhibits", "EM04", "IL-22 drives epithelial repair and antimicrobial peptides.", "gut mucosa"),
  e("C018", "produces", "EM06", "Lamina propria plasma cells secrete dimeric IgA.", "gut mucosa"),
  e("EM06", "contains", "EM01", "IgA coating limits commensal contact with epithelium.", "gut lumen"),
  e("EM01", "located_in", "T003", "Highest density in colon.", "gut lumen"),

  e("EV02", "activates", "C004", "Adjuvant innate signals mature dendritic cells and up-regulate co-stimulation.", "lymph node"),
  e("EV01", "triggers", "P004", "mRNA and lipid carrier are sensed, inducing type-I interferon.", "lymph node"),
  e("EV01", "activates", "C004", "Transfected dendritic cells present encoded antigen.", "lymph node"),
  e("EV01", "drives", "P008", "Persistent antigen sustains germinal-centre reactions for weeks.", "lymph node"),
  e("P008", "generates", "C019", "Germinal centres output high-affinity memory B cells.", "lymph node"),
  e("EV01", "generates", "C026", "Vaccination leaves CD4 and CD8 memory T cells.", "lymph node"),
  e("C018", "produces", "EV04", "Long-lived plasma cells sustain serum neutralising antibody.", "blood"),
  e("EV01", "prevents", "D018", "mRNA vaccines reduced severe COVID-19 in phase-3 trials.", "clinical trial"),
  e("EV03", "activates", "P004", "Replication induces strong innate sensing.", "tissue"),
  e("I011", "impairs", "P008", "B-cell depletion blunts vaccine antibody responses for months.", "lymph node"),

  e("R025", "triggers", "ET01", "Donor HLA presented intact to recipient T cells.", "lymph node"),
  e("ET01", "activates", "C015", "A large fraction of T cells cross-react with allo-HLA.", "lymph node"),
  e("C015", "drives", "ET02", "Cytotoxic T cells infiltrate and kill graft cells.", "tissue"),
  e("C018", "produces", "ET04", "Allo-sensitised plasma cells secrete donor-specific antibody.", "blood"),
  e("ET04", "triggers", "P013", "DSA on graft endothelium activates the classical complement pathway.", "blood/vessel"),
  e("ET04", "drives", "ET03", "DSA plus complement deposition (C4d) injure the graft.", "blood/vessel"),
  e("I031", "inhibits", "P007", "Calcineurin blockade stops NFAT-driven IL-2 transcription.", "lymph node"),
  e("I031", "prevents", "ET02", "Standard maintenance therapy against cellular rejection.", "clinical trial"),
  e("ET05", "depletes", "C015", "Polyclonal antibody depletes circulating T cells.", "blood"),
  e("ET05", "treats", "ET02", "Used for steroid-resistant cellular rejection.", "clinical trial"),

  e("EP09", "supports", "C017", "BTK signalling is required at the pre-B to B transition.", "bone marrow"),
  e("EP01", "depletes", "C017", "BTK loss arrests B-cell development.", "bone marrow"),
  e("EP01", "impairs", "M024", "No B cells, so no IgG.", "blood"),
  e("EP02", "impairs", "C018", "Failed terminal differentiation into plasma cells.", "lymphoid tissue"),
  e("EP03", "impairs", "M028", "Missing C5–C9 prevents membrane attack complex assembly.", "blood"),
  e("EP03", "risks", "X007", "Recurrent meningococcal disease.", "blood"),
  e("EP04", "impairs", "M006", "IL-12R or IFN-γR defects block macrophage activation.", "tissue"),
  e("EP04", "risks", "X001", "Disseminated mycobacterial infection, including after BCG.", "tissue"),
  e("EP05", "depletes", "C014", "FOXP3 loss abolishes functional Tregs.", "blood"),
  e("EP06", "impairs", "P023", "Without AIRE, tissue antigens are not shown to developing T cells.", "thymus"),
  e("EP07", "impairs", "T010", "Third pharyngeal pouch defect leaves a small or absent thymus.", "thymus"),
  e("EP08", "impairs", "C001", "No β2 integrin, so neutrophils cannot adhere and migrate.", "blood"),

  e("EF01", "depletes", "C017", "Deep B-cell depletion including tissue-resident B cells.", "lymphoid tissue", "EMERGING", "medium"),
  e("EF01", "treats", "D007", "Drug-free remission in small refractory SLE series.", "clinical trial", "EMERGING", "low"),
  e("DS004", "characterises", "EF01", "Frontier: CAR-T for autoimmunity.", "", "EMERGING", "medium"),
  e("DS003", "characterises", "C003", "Frontier: tissue-resident macrophage states.", "", "EMERGING", "medium"),
  e("DS005", "characterises", "D019", "Frontier: inflammation drives cardiovascular risk beyond LDL.", "", "EVIDENCE-SUPPORTED", "medium"),
  e("I023", "prevents", "D019", "IL-1β blockade lowered recurrent cardiovascular events (CANTOS).", "clinical trial"),
];

const step = (name: string, type: string, phase: string, desc: string, fn: string, absent: string, clinical: string) => ({ name, type, phase, desc, fn, absent, clinical });

export const EXT_LESSONS = [
  {
    id: "microbiome", module: "F", draft: true, title: "Microbiome and barrier: how commensals train tolerance",
    question: "Why does losing gut bacteria make the immune system more inflammatory?",
    cells: ["treg", "plasma", "macrophage"], nodes: ["EM01", "EM02", "EM03", "C014", "EM04", "D004"],
    steps: [
      step("Commensal microbiota", "tissue", "source", "Dense colonic community", "Ferments fibre and occupies niches pathogens would use.", "Germ-free mice have few colonic Tregs and immature gut lymphoid tissue.", "Antibiotic exposure early in life is associated with later IBD and allergy."),
      step("Butyrate", "metabolite", "signal", "Short-chain fatty acid", "Inhibits HDAC at the Foxp3 locus and fuels colonocytes.", "Low butyrate weakens the barrier and Treg pool.", "Butyrate producers are depleted in Crohn's disease."),
      step("Colonic Treg", "cell", "response", "RORγt+ FOXP3+ Treg", "Secretes IL-10 and restrains responses to commensals.", "IL-10 loss causes spontaneous colitis.", "IL-10 receptor deficiency causes very-early-onset IBD."),
      step("Barrier breach", "process", "failure", "Mucus and tight-junction loss", "Microbial products reach the lamina propria and engage TLRs.", "Intact barrier keeps inflammation local and low.", "Anti-integrin and IL-23 therapies act downstream of this failure."),
    ],
  },
  {
    id: "vaccines", module: "B", draft: true, title: "Vaccines: building memory on purpose",
    question: "What does a vaccine need to produce long-lasting protection?",
    cells: ["dendritic", "bcell", "plasma", "memory"], nodes: ["EV02", "C004", "P008", "C019", "C018", "EV04"],
    steps: [
      step("Adjuvant", "signal", "trigger", "Innate danger signal", "Matures dendritic cells so they deliver signal 2.", "Antigen alone tends to induce tolerance.", "Alum, AS01 and mRNA lipid carriers are different adjuvant strategies."),
      step("Dendritic cell priming", "cell", "recognition", "Antigen presentation in lymph node", "Primes CD4 T cells, including Tfh cells.", "Without Tfh help there is no germinal centre.", "Elderly people have weaker priming, so high-dose or adjuvanted vaccines are used."),
      step("Germinal centre", "process", "response", "Affinity maturation", "Selects B cells with higher-affinity antibody.", "CD40L loss (hyper-IgM) blocks class switching.", "Rituximab blunts responses to new vaccines for months."),
      step("Memory and plasma cells", "cell", "consequence", "Durable output", "Long-lived plasma cells keep antibody up; memory B and T cells respond fast on re-exposure.", "Without memory every infection is a first infection.", "Antibody titre is a correlate of protection for many vaccines."),
    ],
  },
  {
    id: "transplant", module: "K", draft: true, title: "Transplantation: why grafts are rejected",
    question: "Why do so many T cells react to a donor organ, and how is rejection prevented?",
    cells: ["cd8", "cd4", "plasma"], nodes: ["R025", "ET01", "C015", "ET02", "ET04", "ET03", "I031"],
    steps: [
      step("Donor HLA", "molecule", "trigger", "Allo-antigen", "Mismatched HLA is the main target.", "HLA-identical siblings reject far less.", "HLA matching and crossmatch testing guide allocation."),
      step("Direct allorecognition", "process", "recognition", "Recipient T cells see donor HLA", "1–10% of T cells cross-react, far more than for any pathogen.", "", "Explains why rejection is fast without immunosuppression."),
      step("Cellular rejection", "process", "response", "CD8 T-cell attack", "Cytotoxic T cells infiltrate and kill graft cells.", "", "Calcineurin inhibitors and steroids are the backbone of prevention."),
      step("Antibody-mediated rejection", "process", "failure", "Donor-specific antibody", "DSA fixes complement on graft endothelium.", "", "A leading cause of late kidney graft loss."),
    ],
  },
  {
    id: "pid", module: "I", draft: true, title: "Primary immunodeficiencies: experiments of nature",
    question: "What does each missing gene reveal about the job of the part it encodes?",
    cells: ["bcell", "neutrophil", "treg", "complement"], nodes: ["EP01", "EP03", "EP04", "EP05", "EP06", "EP08", "D008", "D009"],
    steps: [
      step("Antibody defects", "disease", "failure", "XLA, CVID", "No or poor antibody.", "Recurrent sinus and lung infections with encapsulated bacteria.", "Treated with immunoglobulin replacement."),
      step("Phagocyte defects", "disease", "failure", "CGD, LAD-1", "Neutrophils cannot kill (CGD) or cannot leave blood (LAD-1).", "Deep bacterial and fungal infections.", "LAD-1: very high blood neutrophils but no pus."),
      step("Complement defects", "disease", "failure", "C5–C9 deficiency", "No membrane attack complex.", "Recurrent Neisseria infection.", "Same risk appears with eculizumab, so patients are vaccinated."),
      step("Regulation defects", "disease", "failure", "IPEX, APECED", "Loss of Tregs or thymic tolerance.", "Early, multi-organ autoimmunity.", "Shows tolerance is active, not default."),
    ],
  },
  {
    id: "frontier", module: "O", draft: true, title: "Frontier: where the evidence is still moving",
    question: "Which new ideas could change immunology practice, and how strong is the evidence?",
    cells: ["bcell", "macrophage"], nodes: ["DS004", "EF01", "DS001", "X006", "DS003", "DS005", "I023"],
    steps: [
      step("CAR-T for autoimmunity", "therapy", "frontier", "CD19 CAR-T in refractory SLE", "Deep B-cell reset can give drug-free remission.", "", "Small series so far; randomised trials are running."),
      step("EBV and multiple sclerosis", "pathogen", "frontier", "Infection as a trigger", "EBV infection sharply raises later MS risk.", "", "Supports trials of EBV-targeted therapies and vaccines."),
      step("Macrophage states", "cell", "frontier", "Tissue-resident programmes", "Single-cell maps reveal states beyond M1/M2.", "", "Some states, such as FOLR2+ macrophages, are still contested."),
      step("Residual inflammatory risk", "concept", "frontier", "Inflammation beyond cholesterol", "IL-1β blockade lowered cardiac events (CANTOS).", "", "Colchicine is now used for secondary prevention."),
    ],
  },
];

export const EXT_ROUTES = [
  { title: "Fibre → butyrate → Treg → IBD", chain: ["EM01", "EM02", "EM03", "C014", "D004"], cells: ["treg"], desc: "Commensal metabolites build colonic Tregs; losing them tilts the gut toward inflammation.", draft: true },
  { title: "Vaccine → germinal centre → memory", chain: ["EV01", "C004", "P008", "C019", "C018", "EV04"], cells: ["bcell", "plasma"], desc: "How a vaccine leaves antibodies and memory behind.", draft: true },
  { title: "Donor HLA → T cells → rejection → tacrolimus", chain: ["R025", "ET01", "C015", "ET02", "I031"], cells: ["cd8"], desc: "Why grafts are attacked and where calcineurin inhibitors act.", draft: true },
  { title: "BTK → B cells → antibody (XLA)", chain: ["EP09", "C017", "M024", "EP01"], cells: ["bcell"], desc: "One missing kinase removes the whole antibody arm.", draft: true },
  { title: "CAR-T → B-cell reset → SLE", chain: ["EF01", "C017", "D007"], cells: ["bcell"], desc: "An emerging approach to refractory autoimmunity.", draft: true },
];

/* Patient modifiers: life stage and immune status. Rules are draft reasoning. */
export const EXT_FLAGS = [
  { id: "child", label: "Child (under 12)", group: "Life stage & immune status" },
  { id: "older", label: "Older adult (65+)", group: "Life stage & immune status" },
  { id: "pregnant", label: "Pregnancy", group: "Life stage & immune status" },
  { id: "immunosupp", label: "Already immunosuppressed", group: "Life stage & immune status" },
];
export const EXT_RULES = [
  { drugs: ["I014"], flag: "older", effect: -2, msg: "JAK inhibitors carry higher cardiovascular, cancer and clot risk in older adults; regulators restrict use at 65+ unless no alternative." },
  { drugs: ["I010"], flag: "older", effect: -1, msg: "Long steroid courses raise fracture, diabetes and infection risk with age." },
  { drugs: ["I010"], flag: "child", effect: -1, msg: "Long steroid courses slow growth in children." },
  { drugs: ["I006"], flag: "child", effect: 1, msg: "Dupilumab is approved for atopic dermatitis from infancy, with a favourable safety record." },
  { drugs: ["I014"], flag: "pregnant", effect: -2, msg: "JAK inhibitors are contraindicated in pregnancy." },
  { drugs: ["I001", "I002"], flag: "pregnant", effect: -1, msg: "TNF antibodies cross the placenta late in pregnancy; the baby should avoid live vaccines for months." },
  { drugs: ["I011"], flag: "pregnant", effect: -1, msg: "Rituximab can deplete the newborn's B cells if given in later pregnancy." },
  { drugs: ["I011", "I012"], flag: "immunosupp", effect: -1, msg: "B-cell depletion on top of other immunosuppression raises low-antibody infections." },
  { drugs: ["I001", "I002", "I014"], flag: "immunosupp", effect: -1, msg: "Adds to existing infection risk; screen for TB, hepatitis B and shingles first." },
  { drugs: ["I011", "I012"], flag: "lymph_lo", effect: -2, msg: "Baseline lymphopenia: B-cell depletion on a low lymphocyte count raises hypogammaglobulinaemia and infection risk." },
  { drugs: ["I010"], flag: "lymph_lo", effect: -1, msg: "Steroids further redistribute and deplete lymphocytes." },
  { drugs: ["I031"], flag: "lymph_lo", effect: -1, msg: "Calcineurin inhibition on a low T-cell count deepens immunosuppression; monitor closely." },
  { drugs: ["I008", "I009", "I025"], flag: "lymph_lo", effect: -1, msg: "Low lymphocyte count is associated with poorer checkpoint-inhibitor outcomes in several cohorts." },
];

/* Continuous biomarker inputs for the Patient page. Each slider maps its value
   onto the existing rule flags, so every score change names the biomarker and
   the threshold that fired. Thresholds are literature-derived draft picks and
   need expert review. */
export interface BiomarkerInput {
  id: string; label: string; unit: string; min: number; max: number; step: number; def: number;
  thresholds: { flag: string; above?: number; below?: number; label: string }[];
}
export const EXT_BIOMARKERS: BiomarkerInput[] = [
  {
    id: "pdl1", label: "PD-L1 tumour proportion score", unit: "%", min: 0, max: 100, step: 1, def: 0,
    thresholds: [{ flag: "pdl1_hi", above: 50, label: "PD-L1 TPS ≥50%" }],
  },
  {
    id: "tmb", label: "Tumour mutational burden", unit: "mut/Mb", min: 0, max: 40, step: 1, def: 0,
    thresholds: [{ flag: "tmb_hi", above: 10, label: "TMB ≥10 mut/Mb" }],
  },
  {
    id: "lymph", label: "Blood lymphocyte count", unit: "×10⁹/L", min: 0, max: 4, step: 0.1, def: 2,
    thresholds: [{ flag: "lymph_lo", below: 1, label: "Lymphocytes <1.0 ×10⁹/L" }],
  },
  {
    id: "eos", label: "Blood eosinophils", unit: "/µL", min: 0, max: 1000, step: 10, def: 100,
    thresholds: [
      { flag: "eos_hi", above: 300, label: "Eosinophils ≥300/µL" },
      { flag: "eos_lo", below: 150, label: "Eosinophils <150/µL" },
    ],
  },
];
export const EXT_FLAG_LABELS: Record<string, string> = { lymph_lo: "Lymphopenia (<1.0 ×10⁹/L)" };
