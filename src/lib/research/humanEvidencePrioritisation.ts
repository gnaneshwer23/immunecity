/**
 * Cap 6 — Human evidence prioritisation (§6.11 / HSI_REFERENCE_REASONING_QUERIES).
 * Comparison table from Ask grounding: classify organism cues from available text only,
 * separate Gate C support from graph teaching, never invent a species field, and never
 * auto-rank every human cue above every preclinical/experimental finding.
 */
import { byId, edgeByRel, human, type KGEdge } from "@/lib/immune/engine";
import type { AskGrounding, CitationLike, GroundedLink } from "@/lib/askGrounding";

export const HUMAN_EVIDENCE_SCHEMA_VERSION = "cap6-1";
export const HUMAN_EVIDENCE_CAPABILITY = "cap6_human_evidence_prioritisation" as const;

/** Organism / model-system class inferred from available text — never a KG species column. */
export const ORGANISM_CLASSES = [
  "human_clinical",
  "preclinical_animal",
  "in_vitro",
  "mixed_or_unclear",
  "not_stated",
] as const;
export type OrganismClass = (typeof ORGANISM_CLASSES)[number];

export const ORGANISM_CLASS_LABEL: Record<OrganismClass, string> = {
  human_clinical: "Human / clinical cues",
  preclinical_animal: "Preclinical / animal cues",
  in_vitro: "In vitro / cell cues",
  mixed_or_unclear: "Mixed or unclear cues",
  not_stated: "Organism not stated in retrieved text",
};

/**
 * Presentation groups for navigation — NOT a scientific hierarchy that always
 * ranks human evidence above experiments.
 */
export const PRESENTATION_GROUPS = [
  "gate_c_with_human_cues",
  "gate_c_without_human_cues",
  "graph_teaching_with_human_cues",
  "graph_teaching_other",
] as const;
export type PresentationGroup = (typeof PRESENTATION_GROUPS)[number];

export const PRESENTATION_GROUP_LABEL: Record<PresentationGroup, string> = {
  gate_c_with_human_cues: "Gate C support · human/clinical cues in text",
  gate_c_without_human_cues: "Gate C support · no human cue (or non-human / unstated)",
  graph_teaching_with_human_cues: "Graph teaching only · human/clinical cues in text",
  graph_teaching_other: "Graph teaching only · other / unstated organism",
};

export type HumanEvidenceRow = {
  relId: string;
  assertion: string;
  subjectId: string;
  objectId: string;
  organismClass: OrganismClass;
  designCues: string[];
  cueSource: "cite_text" | "edge_mechanism" | "none";
  gateCSupport: boolean;
  reviewedEvidenceCount: number;
  reviewedPmids: string[];
  counterEvidenceCount: number;
  tier: GroundedLink["tier"];
  presentationGroup: PresentationGroup;
  limitations: string[];
};

export type HumanEvidenceComparison = {
  kind: typeof HUMAN_EVIDENCE_CAPABILITY;
  schemaVersion: typeof HUMAN_EVIDENCE_SCHEMA_VERSION;
  capabilityLabel: "Available research capability";
  product: "Cap 6 Human evidence prioritisation";
  question: string;
  rows: HumanEvidenceRow[];
  /** Counts by organism class — descriptive, not a ranking score. */
  organismCounts: Record<OrganismClass, number>;
  groupCounts: Record<PresentationGroup, number>;
  honesty: string[];
  kgWrite: false;
  clinicalAdvice: false;
};

const HUMAN_RE =
  /\b(?:human|humans|patient|patients|cohort|clinical\s+trial|randomi[sz]ed|rct|phase\s+[i1][i1iabc0-3]*|participants?|serum|plasma|pbmc)\b/i;
const PRECLINICAL_RE =
  /\b(?:mouse|mice|murine|rat|rats|rodent|in\s+vivo|zebrafish|non-?human\s+primate|nhp|macaque)\b/i;
const INVITRO_RE =
  /\b(?:in\s+vitro|cell\s+line|cell\s+culture|organoid|ex\s+vivo)\b/i;
const DESIGN_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\brandomi[sz]ed\b|\brct\b/i, label: "randomized/RCT" },
  { re: /\bmeta-?analysis\b|\bsystematic review\b/i, label: "review/meta-analysis" },
  { re: /\bcohort\b|\bcase[- ]control\b/i, label: "observational cohort/case-control" },
  { re: /\bphase\s+[i1][i1iabc0-3]*/i, label: "clinical trial phase cue" },
  { re: /\bmouse\b|\bmurine\b|\bin vivo\b/i, label: "preclinical/in vivo" },
  { re: /\bin vitro\b|\bcell line\b/i, label: "in vitro" },
  { re: /\bpatient\b|\bclinical\b/i, label: "clinical/human wording" },
];

function uniq(xs: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const t = x.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function nodeName(id: string): string {
  return byId[id]?.name ?? id;
}

function citeBlob(c: CitationLike): string {
  return [c.claim_text, c.notes, c.passage_span, c.label].filter(Boolean).join(" ");
}

function edgeBlob(edge: KGEdge | undefined): string {
  if (!edge) return "";
  const extra = edge as KGEdge & { context?: string };
  return [edge.mechanism, edge.location, extra.context, edge.reference].filter(Boolean).join(" ");
}

export function classifyOrganismFromText(blob: string): {
  organismClass: OrganismClass;
  designCues: string[];
} {
  const text = blob.trim();
  if (!text) {
    return { organismClass: "not_stated", designCues: [] };
  }
  const designCues = DESIGN_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  const human = HUMAN_RE.test(text);
  const pre = PRECLINICAL_RE.test(text);
  const vitro = INVITRO_RE.test(text);
  const hits = [human, pre, vitro].filter(Boolean).length;
  if (hits > 1) return { organismClass: "mixed_or_unclear", designCues };
  if (human) return { organismClass: "human_clinical", designCues };
  if (pre) return { organismClass: "preclinical_animal", designCues };
  if (vitro) return { organismClass: "in_vitro", designCues };
  return { organismClass: "not_stated", designCues };
}

function presentationGroup(row: Pick<HumanEvidenceRow, "gateCSupport" | "organismClass">): PresentationGroup {
  const humanCue = row.organismClass === "human_clinical";
  if (row.gateCSupport && humanCue) return "gate_c_with_human_cues";
  if (row.gateCSupport) return "gate_c_without_human_cues";
  if (humanCue) return "graph_teaching_with_human_cues";
  return "graph_teaching_other";
}

function emptyCounts(): Record<OrganismClass, number> {
  return {
    human_clinical: 0,
    preclinical_animal: 0,
    in_vitro: 0,
    mixed_or_unclear: 0,
    not_stated: 0,
  };
}

function emptyGroups(): Record<PresentationGroup, number> {
  return {
    gate_c_with_human_cues: 0,
    gate_c_without_human_cues: 0,
    graph_teaching_with_human_cues: 0,
    graph_teaching_other: 0,
  };
}

/**
 * Build Cap 6 comparison from Ask grounding.
 * Ordering is presentation-group then relId — not a species superiority rank.
 */
export function buildHumanEvidenceComparison(input: {
  question: string;
  grounding: AskGrounding;
}): HumanEvidenceComparison {
  const question = input.question.trim();
  const { grounding } = input;
  const rows: HumanEvidenceRow[] = [];

  for (const link of grounding.links) {
    const cites = [
      ...(grounding.reviewedCites ?? []).filter((c) => c.relationship_id === link.relId),
      ...(grounding.counterEvidence ?? []).filter((c) => c.relationship_id === link.relId),
    ];
    const citeText = cites.map(citeBlob).join("\n");
    const edge = edgeByRel[link.relId];
    const mechText = edgeBlob(edge);
    let cueSource: HumanEvidenceRow["cueSource"] = "none";
    let blob = "";
    if (citeText.trim()) {
      blob = citeText;
      cueSource = "cite_text";
    } else if (mechText.trim()) {
      blob = mechText;
      cueSource = "edge_mechanism";
    }
    const { organismClass, designCues } = classifyOrganismFromText(blob);
    const gateCSupport = link.hasClaimSupport && link.reviewedEvidenceCount > 0;
    const limitations: string[] = [];
    if (cueSource === "none") {
      limitations.push("No organism/study-design cues in retrieved cite or edge text — class = not_stated.");
    }
    if (cueSource === "edge_mechanism") {
      limitations.push("Organism cues inferred from edge mechanism/context only — not a curated species field.");
    }
    if (!gateCSupport) {
      limitations.push("No Gate C approved+supports rows on this relationship — graph teaching only.");
    }
    if (link.counterEvidenceCount > 0) {
      limitations.push(`${link.counterEvidenceCount} counter/partial assessment row(s) on this edge — not suppressed.`);
    }
    if (organismClass === "human_clinical" && !gateCSupport) {
      limitations.push("Human/clinical wording present does not upgrade Gate C status.");
    }
    if (organismClass !== "human_clinical" && gateCSupport) {
      limitations.push("Gate C support is not demoted solely because organism cues are non-human or unstated.");
    }

    const row: HumanEvidenceRow = {
      relId: link.relId,
      assertion: `${nodeName(link.subjectId)} ${human(link.relation)} ${nodeName(link.objectId)}`,
      subjectId: link.subjectId,
      objectId: link.objectId,
      organismClass,
      designCues: uniq(designCues),
      cueSource,
      gateCSupport,
      reviewedEvidenceCount: link.reviewedEvidenceCount,
      reviewedPmids: [...link.reviewedPmids],
      counterEvidenceCount: link.counterEvidenceCount,
      tier: link.tier,
      presentationGroup: "graph_teaching_other",
      limitations,
    };
    row.presentationGroup = presentationGroup(row);
    rows.push(row);
  }

  // Stable order by presentation group (navigation), then relId — never species rank score.
  const groupOrder = new Map(PRESENTATION_GROUPS.map((g, i) => [g, i]));
  rows.sort((a, b) => {
    const ga = groupOrder.get(a.presentationGroup) ?? 99;
    const gb = groupOrder.get(b.presentationGroup) ?? 99;
    if (ga !== gb) return ga - gb;
    return a.relId.localeCompare(b.relId);
  });

  const organismCounts = emptyCounts();
  const groupCounts = emptyGroups();
  for (const r of rows) {
    organismCounts[r.organismClass] += 1;
    groupCounts[r.presentationGroup] += 1;
  }

  return {
    kind: HUMAN_EVIDENCE_CAPABILITY,
    schemaVersion: HUMAN_EVIDENCE_SCHEMA_VERSION,
    capabilityLabel: "Available research capability",
    product: "Cap 6 Human evidence prioritisation",
    question,
    rows,
    organismCounts,
    groupCounts,
    honesty: [
      "Available research capability — Cap 6 comparison table, not clinical advice.",
      "The knowledge graph has no species field; organism class is inferred from retrieved cite/edge text only.",
      "Do not treat human cues as automatically superior to preclinical or in-vitro findings — groups are navigation aids.",
      "Gate C approved+supports is orthogonal to organism cues.",
      "Empty or not_stated classes are honest incompleteness, not worldwide literature claims.",
      "kgWrite=false · clinicalAdvice=false.",
    ],
    kgWrite: false,
    clinicalAdvice: false,
  };
}

export function formatHumanEvidenceMarkdown(table: HumanEvidenceComparison): string {
  const lines: string[] = [
    `# ${table.product} (${table.schemaVersion})`,
    ``,
    `> ${table.honesty[0]}`,
    ``,
    `Question: ${table.question}`,
    ``,
    `## Comparison (navigation groups — not a species rank)`,
  ];
  let current: PresentationGroup | null = null;
  for (const r of table.rows) {
    if (r.presentationGroup !== current) {
      current = r.presentationGroup;
      lines.push(``, `### ${PRESENTATION_GROUP_LABEL[current]}`, ``);
    }
    lines.push(
      `- **${r.assertion}** (\`${r.relId}\`)`,
      `  - Organism: ${ORGANISM_CLASS_LABEL[r.organismClass]} (${r.cueSource})`,
      `  - Design cues: ${r.designCues.length ? r.designCues.join("; ") : "none detected"}`,
      `  - Gate C support: ${r.gateCSupport ? `yes (n=${r.reviewedEvidenceCount}; PMIDs ${r.reviewedPmids.join(", ") || "—"})` : "no"}`,
      `  - Tier: ${r.tier}; counter rows: ${r.counterEvidenceCount}`,
      `  - Limitations: ${r.limitations.join(" ")}`,
    );
  }
  if (!table.rows.length) {
    lines.push(``, `_No retrieved relationships — honest empty._`);
  }
  lines.push(``, `## Honesty`, ...table.honesty.map((h) => `- ${h}`), ``);
  return lines.join("\n");
}
