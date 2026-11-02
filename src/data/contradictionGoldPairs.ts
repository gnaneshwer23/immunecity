/**
 * Cap 10 — first-class CONTRADICTS gold pairs (draft).
 *
 * Paired evidence statements linked by meta CONTRADICTS. Backing edges are
 * existing KG relationships; PMIDs are never invented (TO_BE_CURATED or real
 * edge source_refs only). Finding nodes + CONTRADICTS edges merge as draft
 * via extensions so the KG remains the source of truth.
 *
 * Policy: retain both sides; majorityVote=false; never silent-merge.
 */

export const CONTRADICTION_GOLD_VERSION = "cap10-gold-v0";

/** One side of an unresolved scientific disagreement. */
export type ContradictionSide = {
  findingId: string;
  statement: string;
  /** Existing graph concepts this side is about. */
  conceptIds: readonly string[];
  /** Existing relationship id (REL-…) when the side is grounded in a KG edge. */
  backingRelId: string;
  /** Study context preserved from existing edge fields (never invented). */
  tissue: string | null;
  method: string | null;
  population: string | null;
  /** TO_BE_CURATED or real refs copied from the backing edge — never fabricated PMIDs. */
  sourceRefs: readonly string[];
};

export type ContradictionGoldPair = {
  id: string;
  /** Meta relation — first-class CONTRADICTS. */
  relation: "CONTRADICTS";
  draft: true;
  unresolved: true;
  majorityVote: false;
  silentMerge: false;
  /** Short curator note (educational / draft). */
  note: string;
  sideA: ContradictionSide;
  sideB: ContradictionSide;
};

const PROV = "draft-contradiction-gold; expert review required; no invented PMIDs";

/**
 * Curated gold pairs from real opposing / context-divergent graph edges.
 * Source refs stay TO_BE_CURATED until human cite curation.
 */
export const CONTRADICTION_GOLD_PAIRS: readonly ContradictionGoldPair[] = [
  {
    id: "gold-cx-il17a-ibd-pathogenic-vs-barrier",
    relation: "CONTRADICTS",
    draft: true,
    unresolved: true,
    majorityVote: false,
    silentMerge: false,
    note:
      "IL-17A axis in IBD: graph records both inflammatory participation and barrier-protective implications of blockade. Context disagreement — do not majority-vote.",
    sideA: {
      findingId: "CXF01",
      statement:
        "IL-17A participates in intestinal inflammation (context-dependent contribution to IBD).",
      conceptIds: ["M010", "D004"],
      backingRelId: "REL-M010-contributes_to-D004",
      tissue: "gut mucosa",
      method: null,
      population: null,
      sourceRefs: ["TO_BE_CURATED"],
    },
    sideB: {
      findingId: "CXF02",
      statement:
        "IL-17A blockade (secukinumab) can worsen Crohn disease — consistent with a barrier-protective role for IL-17A in gut mucosa.",
      conceptIds: ["I004", "D004", "M010"],
      backingRelId: "REL-I004-worsens-D004",
      tissue: null,
      method: null,
      population: null,
      sourceRefs: ["TO_BE_CURATED"],
    },
  },
  {
    id: "gold-cx-antitnf-crohn-mab-vs-receptor-fusion",
    relation: "CONTRADICTS",
    draft: true,
    unresolved: true,
    majorityVote: false,
    silentMerge: false,
    note:
      "Anti-TNF class in Crohn: monoclonal antibody efficacy coexists with receptor-fusion failure on the graph. Mechanism/context disagreement — retain both.",
    sideA: {
      findingId: "CXF03",
      statement: "Infliximab (monoclonal anti-TNF) treats Crohn / IBD.",
      conceptIds: ["I001", "D004", "M001"],
      backingRelId: "REL-I001-treats-D004",
      tissue: null,
      method: null,
      population: null,
      sourceRefs: ["TO_BE_CURATED"],
    },
    sideB: {
      findingId: "CXF04",
      statement:
        "Etanercept (TNF receptor–Fc fusion) fails in Crohn disease (no mucosal T-cell apoptosis induction as recorded on graph).",
      conceptIds: ["I007", "D004", "M001"],
      backingRelId: "REL-I007-fails_in-D004",
      tissue: null,
      method: null,
      population: null,
      sourceRefs: ["TO_BE_CURATED"],
    },
  },
];

/** Draft finding nodes (DISCOVERY) for meta CONTRADICTS edges. */
export const EXT_CONTRADICTION_NODES = CONTRADICTION_GOLD_PAIRS.flatMap((p) => [
  {
    id: p.sideA.findingId,
    node_type: "DISCOVERY",
    name: `Finding: ${p.sideA.statement.slice(0, 72)}${p.sideA.statement.length > 72 ? "…" : ""}`,
    description: `${p.sideA.statement} Backing ${p.sideA.backingRelId}. ${PROV}`,
    evidence_status: "EVIDENCE-SUPPORTED",
    provenance: PROV,
    context: p.sideA.tissue ?? undefined,
  },
  {
    id: p.sideB.findingId,
    node_type: "DISCOVERY",
    name: `Finding: ${p.sideB.statement.slice(0, 72)}${p.sideB.statement.length > 72 ? "…" : ""}`,
    description: `${p.sideB.statement} Backing ${p.sideB.backingRelId}. ${PROV}`,
    evidence_status: "EVIDENCE-SUPPORTED",
    provenance: PROV,
    context: p.sideB.tissue ?? undefined,
  },
]);

/** Draft Finding —CONTRADICTS→ Finding edges (first-class meta relation). */
export const EXT_CONTRADICTION_EDGES = CONTRADICTION_GOLD_PAIRS.map((p) => ({
  subject_id: p.sideA.findingId,
  relation: "CONTRADICTS",
  object_id: p.sideB.findingId,
  mechanism: p.note,
  location: p.sideA.tissue ?? p.sideB.tissue ?? "",
  evidence_status: "EVIDENCE-SUPPORTED",
  confidence: "medium" as const,
  provenance: PROV,
  source_refs: ["TO_BE_CURATED"] as string[],
}));

/** Concept ids that should surface a gold pair when present in Ask neighbourhood. */
export function goldPairConceptIds(pair: ContradictionGoldPair): string[] {
  return [...new Set([...pair.sideA.conceptIds, ...pair.sideB.conceptIds])];
}
