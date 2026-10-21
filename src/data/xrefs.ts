/* External identifier cross-links for curated graph concepts.
   Data only: kg.json stays the source of truth for concepts; this maps graph IDs to
   established resources. Every entry was resolved against the issuing authority's API
   (HGNC REST, UniProt REST, EBI OLS4 for CL/GO/MONDO, NLM MeSH RDF, ChEMBL API) on the
   date below, and `label` is the authority's own label at that time. Never add an ID
   that has not been checked the same way.
   match: "exact" = same entity (emitted as schema.org sameAs);
          "close" = related but not identical (e.g. gene record for a protein concept,
          GO complex for a teaching pathway) — shown, never asserted as sameAs. */

export type XrefSource = "HGNC" | "UniProt" | "CL" | "GO" | "MONDO" | "MeSH" | "ChEMBL";

export interface Xref {
  source: XrefSource;
  id: string;
  label: string;
  match: "exact" | "close";
}

export const XREF_PROVENANCE = {
  verifiedOn: "2026-10-21",
  method: "Resolved via HGNC REST, UniProt REST (reviewed human entries), EBI OLS4, NLM MeSH RDF and ChEMBL API; labels copied from the authority.",
};

const obo = (id: string) => `https://purl.obolibrary.org/obo/${id.replace(":", "_")}`;
const ols = (ont: string, id: string) =>
  `https://www.ebi.ac.uk/ols4/ontologies/${ont}/classes/${encodeURIComponent(encodeURIComponent(obo(id).replace("https://", "http://")))}`;

export const XREF_SOURCES: Record<XrefSource, { name: string; pattern: RegExp; href: (id: string) => string; iri: (id: string) => string }> = {
  HGNC: {
    name: "HGNC",
    pattern: /^HGNC:\d+$/,
    href: (id) => `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${id}`,
    iri: (id) => `https://identifiers.org/${id}`,
  },
  UniProt: {
    name: "UniProt",
    pattern: /^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/,
    href: (id) => `https://www.uniprot.org/uniprotkb/${id}/entry`,
    iri: (id) => `https://www.uniprot.org/uniprotkb/${id}`,
  },
  CL: { name: "Cell Ontology", pattern: /^CL:\d{7}$/, href: (id) => ols("cl", id), iri: obo },
  GO: { name: "Gene Ontology", pattern: /^GO:\d{7}$/, href: (id) => `https://www.ebi.ac.uk/QuickGO/term/${id}`, iri: obo },
  MONDO: { name: "MONDO", pattern: /^MONDO:\d{7}$/, href: (id) => ols("mondo", id), iri: obo },
  MeSH: {
    name: "MeSH",
    pattern: /^D\d{6}$/,
    href: (id) => `https://meshb.nlm.nih.gov/record/ui?ui=${id}`,
    iri: (id) => `https://id.nlm.nih.gov/mesh/${id}`,
  },
  ChEMBL: {
    name: "ChEMBL",
    pattern: /^CHEMBL\d+$/,
    href: (id) => `https://www.ebi.ac.uk/chembl/explore/compound/${id}`,
    iri: (id) => `https://identifiers.org/chembl.compound:${id}`,
  },
};

export const NODE_XREFS: Record<string, Xref[]> = {
  M001: [
    { source: "HGNC", id: "HGNC:11892", label: "TNF — tumor necrosis factor", match: "close" },
    { source: "UniProt", id: "P01375", label: "Tumor necrosis factor (human, Swiss-Prot)", match: "exact" },
  ],
  M002: [
    { source: "HGNC", id: "HGNC:5992", label: "IL1B — interleukin 1 beta", match: "close" },
    { source: "UniProt", id: "P01584", label: "Interleukin-1 beta (human, Swiss-Prot)", match: "exact" },
  ],
  M003: [
    { source: "HGNC", id: "HGNC:6018", label: "IL6 — interleukin 6", match: "close" },
    { source: "UniProt", id: "P05231", label: "Interleukin-6 (human, Swiss-Prot)", match: "exact" },
  ],
  M006: [
    { source: "HGNC", id: "HGNC:5438", label: "IFNG — interferon gamma", match: "close" },
    { source: "UniProt", id: "P01579", label: "Interferon gamma (human, Swiss-Prot)", match: "exact" },
  ],
  M007: [
    { source: "HGNC", id: "HGNC:6014", label: "IL4 — interleukin 4", match: "close" },
    { source: "UniProt", id: "P05112", label: "Interleukin-4 (human, Swiss-Prot)", match: "exact" },
  ],
  M008: [
    { source: "HGNC", id: "HGNC:6016", label: "IL5 — interleukin 5", match: "close" },
    { source: "UniProt", id: "P05113", label: "Interleukin-5 (human, Swiss-Prot)", match: "exact" },
  ],
  M009: [
    { source: "HGNC", id: "HGNC:5973", label: "IL13 — interleukin 13", match: "close" },
    { source: "UniProt", id: "P35225", label: "Interleukin-13 (human, Swiss-Prot)", match: "exact" },
  ],
  M010: [
    { source: "HGNC", id: "HGNC:5981", label: "IL17A — interleukin 17A", match: "close" },
    { source: "UniProt", id: "Q16552", label: "Interleukin-17A (human, Swiss-Prot)", match: "exact" },
  ],
  R011: [
    { source: "HGNC", id: "HGNC:8760", label: "PDCD1 — programmed cell death 1", match: "close" },
    { source: "UniProt", id: "Q15116", label: "Programmed cell death protein 1 (human, Swiss-Prot)", match: "exact" },
  ],
  C001: [
    { source: "CL", id: "CL:0000775", label: "neutrophil", match: "exact" },
  ],
  C003: [
    { source: "CL", id: "CL:0000235", label: "macrophage", match: "exact" },
  ],
  C006: [
    { source: "CL", id: "CL:0000623", label: "natural killer cell", match: "exact" },
  ],
  C007: [
    { source: "CL", id: "CL:0000097", label: "mast cell", match: "exact" },
  ],
  C010: [
    { source: "CL", id: "CL:0000895", label: "naive thymus-derived CD4-positive, alpha-beta T cell", match: "exact" },
  ],
  C012: [
    { source: "CL", id: "CL:0000546", label: "T-helper 2 cell", match: "exact" },
  ],
  C013: [
    { source: "CL", id: "CL:0000899", label: "T-helper 17 cell", match: "exact" },
  ],
  C014: [
    { source: "CL", id: "CL:0000815", label: "regulatory T cell", match: "exact" },
  ],
  C015: [
    { source: "CL", id: "CL:0000794", label: "CD8-positive, alpha-beta cytotoxic T cell", match: "exact" },
  ],
  C017: [
    { source: "CL", id: "CL:0000236", label: "B cell", match: "exact" },
  ],
  C018: [
    { source: "CL", id: "CL:0000786", label: "plasma cell", match: "exact" },
  ],
  D001: [
    { source: "MONDO", id: "MONDO:0008383", label: "rheumatoid arthritis", match: "exact" },
    { source: "MeSH", id: "D001172", label: "Arthritis, Rheumatoid", match: "exact" },
  ],
  D002: [
    { source: "MONDO", id: "MONDO:0005301", label: "multiple sclerosis", match: "exact" },
    { source: "MeSH", id: "D009103", label: "Multiple Sclerosis", match: "exact" },
  ],
  D003: [
    { source: "MONDO", id: "MONDO:0005083", label: "psoriasis", match: "exact" },
    { source: "MeSH", id: "D011565", label: "Psoriasis", match: "exact" },
  ],
  D004: [
    { source: "MONDO", id: "MONDO:0005265", label: "inflammatory bowel disease", match: "exact" },
    { source: "MeSH", id: "D015212", label: "Inflammatory Bowel Diseases", match: "exact" },
  ],
  D005: [
    { source: "MONDO", id: "MONDO:0004979", label: "asthma", match: "exact" },
    { source: "MeSH", id: "D001249", label: "Asthma", match: "exact" },
  ],
  D006: [
    { source: "MONDO", id: "MONDO:0004980", label: "atopic eczema", match: "exact" },
    { source: "MeSH", id: "D003876", label: "Dermatitis, Atopic", match: "exact" },
  ],
  D007: [
    { source: "MONDO", id: "MONDO:0007915", label: "systemic lupus erythematosus", match: "exact" },
    { source: "MeSH", id: "D008180", label: "Lupus Erythematosus, Systemic", match: "exact" },
  ],
  P001: [
    { source: "GO", id: "GO:0007249", label: "canonical NF-kappaB signal transduction", match: "close" },
  ],
  P002: [
    { source: "GO", id: "GO:0007259", label: "cell surface receptor signaling pathway via JAK-STAT", match: "close" },
  ],
  P003: [
    { source: "GO", id: "GO:0072559", label: "NLRP3 inflammasome complex", match: "close" },
  ],
  P004: [
    { source: "GO", id: "GO:0060337", label: "type I interferon-mediated signaling pathway", match: "exact" },
  ],
  P007: [
    { source: "GO", id: "GO:0050852", label: "T cell receptor signaling pathway", match: "exact" },
  ],
  P008: [
    { source: "GO", id: "GO:0002467", label: "germinal center formation", match: "close" },
  ],
  I001: [
    { source: "ChEMBL", id: "CHEMBL1201581", label: "INFLIXIMAB", match: "exact" },
  ],
  I002: [
    { source: "ChEMBL", id: "CHEMBL1201580", label: "ADALIMUMAB", match: "exact" },
  ],
  I003: [
    { source: "ChEMBL", id: "CHEMBL1237022", label: "TOCILIZUMAB", match: "exact" },
  ],
  I004: [
    { source: "ChEMBL", id: "CHEMBL1743068", label: "SECUKINUMAB", match: "exact" },
  ],
  I005: [
    { source: "ChEMBL", id: "CHEMBL1201835", label: "USTEKINUMAB", match: "exact" },
  ],
  I006: [
    { source: "ChEMBL", id: "CHEMBL2108675", label: "DUPILUMAB", match: "exact" },
  ],
  I008: [
    { source: "ChEMBL", id: "CHEMBL3137343", label: "PEMBROLIZUMAB", match: "exact" },
  ],
  I011: [
    { source: "ChEMBL", id: "CHEMBL1201576", label: "RITUXIMAB", match: "exact" },
  ],
  I012: [
    { source: "ChEMBL", id: "CHEMBL2108041", label: "OCRELIZUMAB", match: "exact" },
  ],
  I015: [
    { source: "ChEMBL", id: "CHEMBL2364653", label: "ANIFROLUMAB", match: "exact" },
  ],
  I018: [
    { source: "ChEMBL", id: "CHEMBL1789843", label: "BELIMUMAB", match: "exact" },
  ],
  I024: [
    { source: "ChEMBL", id: "CHEMBL1201823", label: "ABATACEPT", match: "exact" },
  ],
};

export function conceptXrefs(nodeId: string): Xref[] {
  return NODE_XREFS[nodeId] ?? [];
}

/** IRIs for exact matches only — the set asserted as schema.org sameAs. */
export function conceptSameAs(nodeId: string): string[] {
  return conceptXrefs(nodeId)
    .filter((x) => x.match === "exact")
    .map((x) => XREF_SOURCES[x.source].iri(x.id));
}
