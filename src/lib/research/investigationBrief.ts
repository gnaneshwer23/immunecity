/**
 * M1 Biomedical Discovery Brief — Workflow B (Immune Mechanism Investigation).
 * Built from Ask `prepareAsk` / `AskGrounding` only — no second chatbot, no invented PMIDs.
 * Claim categories 2–5 for research; Category 1 (Observed) is N/A (no PHI / clinical plane).
 */
import { byId, human, TYPES } from "@/lib/immune/engine";
import {
  prepareAsk,
  type AskGrounding,
  type EvidenceTier,
  type GroundedLink,
} from "@/lib/askGrounding";
import { classifyEvidenceGap, evidenceGapLabelText } from "./evidenceGap";
import {
  buildHumanEvidenceComparison,
  formatHumanEvidenceMarkdown,
  type HumanEvidenceComparison,
} from "./humanEvidencePrioritisation";
import {
  buildContradictionReport,
  formatContradictionMarkdown,
  type ContradictionReport,
} from "./contradictionReport";
import {
  buildResearchGapRegister,
  formatResearchGapRegisterMarkdown,
  type ResearchGapRegister,
} from "./researchGapRegister";
import type { ResearchGapCandidate } from "@/lib/discovery/types";

export const INVESTIGATION_BRIEF_SCHEMA_VERSION = "m1-2";
export const INVESTIGATION_BRIEF_KIND = "biomedical_discovery_brief" as const;
export const INVESTIGATION_BRIEF_WORKFLOW = "workflow_b_immune_mechanism" as const;

/** HSI evidence categories — Cat 1 never populated on research-only M1. */
export const RESEARCH_CLAIM_TYPES = [
  "observed_patient_fact",
  "established_evidence",
  "statistical_association",
  "computational_inference",
  "unvalidated_hypothesis",
] as const;
export type ResearchClaimType = (typeof RESEARCH_CLAIM_TYPES)[number];

export const CLAIM_TYPE_LABEL: Record<ResearchClaimType, string> = {
  observed_patient_fact: "Observed (N/A — research-only)",
  established_evidence: "Established",
  statistical_association: "Association",
  computational_inference: "Inference",
  unvalidated_hypothesis: "Hypothesis (unvalidated)",
};

export type InvestigationBriefSectionId =
  | "question"
  | "entities"
  | "mechanisms"
  | "supporting_evidence"
  | "contradictions_gaps"
  | "limitations"
  | "claim_categories";

export type InvestigationBriefSection = {
  id: InvestigationBriefSectionId;
  title: string;
  body: string;
  citedIds: string[];
};

export type BriefClaimStatement = {
  claimType: ResearchClaimType;
  assertion: string;
  relId: string | null;
  subjectId: string | null;
  objectId: string | null;
  tier: EvidenceTier | null;
  reviewStatus: string | null;
  /** Atlas / citation inspection targets — never invented. */
  sourceIds: string[];
  /** True when Cat 5 — always unvalidated on M1. */
  unvalidated: boolean;
  /** Cat 1 is never applicable on this research path. */
  applicable: boolean;
};

export type InvestigationSourceLink = {
  id: string;
  kind: "concept" | "relationship" | "pmid" | "evidence";
  name: string;
  href: string | null;
};

export type InvestigationBrief = {
  kind: typeof INVESTIGATION_BRIEF_KIND;
  schemaVersion: typeof INVESTIGATION_BRIEF_SCHEMA_VERSION;
  workflow: typeof INVESTIGATION_BRIEF_WORKFLOW;
  product: "M1 Biomedical Discovery Brief";
  capabilityLabel: "Available research capability";
  label: "AI/draft";
  reviewStatus: "unreviewed";
  kgWrite: false;
  canApproveIntoKg: false;
  clinicalAdvice: false;
  clinicalProduct: false;
  trialsProduct: false;
  question: string;
  exportedAt: string;
  graphVersion: string;
  nodeIds: string[];
  relIds: string[];
  sections: InvestigationBriefSection[];
  claimStatements: BriefClaimStatement[];
  sourceLinks: InvestigationSourceLink[];
  /** Cap 6 companion — human/clinical cue comparison (not a species rank). */
  humanEvidence: HumanEvidenceComparison;
  /** Cap 10 companion — unresolved contradictions (no majority vote). */
  contradictions: ContradictionReport;
  /** Cap 11 companion — gap register with mandatory search-scope honesty. */
  researchGaps: ResearchGapRegister;
  disclaimer: string;
};

export type InvestigationBriefResult =
  | { ok: true; brief: InvestigationBrief }
  | { ok: false; reason: string };

const CLINICAL_ADVICE_RE =
  /\b((?:you|the patient|patients)\s+should\b|prescrib(?:e|ing)\s+(?:this|the|a)\b|dos(?:e|age)\s+of\b|diagnos(?:e|is)\s+(?:the\s+)?patient\b|start\s+(?:this\s+)?treatment\b|I recommend\b|this (?:is|constitutes) clinical decision support\b)\b/i;

/** Map ISI graph evidence tiers → HSI claim categories (research plane). */
export function mapTierToClaimType(tier: EvidenceTier): ResearchClaimType {
  switch (tier) {
    case "established":
      return "established_evidence";
    case "evidence-supported":
      return "statistical_association";
    case "emerging":
      return "computational_inference";
    case "hypothesis":
    case "draft":
    case "missing-support":
      return "unvalidated_hypothesis";
    default:
      return "unvalidated_hypothesis";
  }
}

export function claimTypeFromLink(link: GroundedLink): ResearchClaimType {
  // Gate C reviewed + established status → Established; otherwise keep tier map.
  if (link.tier === "established" && link.hasClaimSupport && link.reviewedEvidenceCount > 0) {
    return "established_evidence";
  }
  if (link.tier === "established") return "established_evidence";
  return mapTierToClaimType(link.tier);
}

function uniq(ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = typeof raw === "string" ? raw.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function nodeName(id: string): string {
  return byId[id]?.name ?? id;
}

/**
 * Fail closed: refuse clinical phrasing and any PMID / EV / REL / concept id
 * not present in the retrieved grounding universe.
 */
export function validateInvestigationCitations(
  text: string,
  grounding: AskGrounding,
): { ok: true } | { ok: false; reason: string } {
  if (CLINICAL_ADVICE_RE.test(text)) {
    return {
      ok: false,
      reason: "Fail closed: clinical diagnosis/treatment phrasing is not allowed in investigation briefs.",
    };
  }
  const allowed = new Set<string>([
    ...grounding.nodeIds,
    ...grounding.relIds,
    ...grounding.reviewedCites.flatMap((c) => [c.evidence_id, c.pmid].filter(Boolean) as string[]),
    ...grounding.counterEvidence.flatMap((c) => [c.evidence_id, c.pmid].filter(Boolean) as string[]),
    ...(grounding.provisionalLiterature ?? []).flatMap((p) => (p.pmid ? [p.pmid] : [])),
  ]);

  const candidates =
    text.match(/\b(?:REL-[A-Za-z0-9_-]+|[A-Z]{1,3}\d{2,4}|EV-[A-Za-z0-9._:-]+|E\d{2,4}|PMID\s*\d{5,9}|\d{7,9})\b/gi) ??
    [];
  for (const raw of candidates) {
    const token = raw.replace(/^PMID\s*/i, "").trim();
    if (/^\d{7,9}$/.test(token)) {
      if (!allowed.has(token) && !grounding.reviewedCites.some((c) => c.pmid === token)) {
        // Bare digits that are also concept-like graph ids (e.g. unlikely) — only fail if look like PMID invent.
        // Allow when digit string equals a retrieved concept id.
        if (!allowed.has(token)) {
          return { ok: false, reason: `Fail closed: unsupported or unretrieved PMID ${token}.` };
        }
      }
      continue;
    }
    if (!allowed.has(raw) && !allowed.has(token)) {
      if (byId[raw] || raw.startsWith("REL-") || /^EV-/i.test(raw) || /^E\d{2,4}$/i.test(raw)) {
        return { ok: false, reason: `Fail closed: unsupported or unretrieved id ${raw}.` };
      }
    }
  }
  return { ok: true };
}

function buildClaimStatements(grounding: AskGrounding): BriefClaimStatement[] {
  const statements: BriefClaimStatement[] = [
    {
      claimType: "observed_patient_fact",
      assertion:
        "Observed patient facts are out of scope for the Scientific Intelligence MVP (no PHI / clinical plane on this path).",
      relId: null,
      subjectId: null,
      objectId: null,
      tier: null,
      reviewStatus: null,
      sourceIds: [],
      unvalidated: false,
      applicable: false,
    },
  ];

  for (const link of grounding.links.slice(0, 12)) {
    const claimType = claimTypeFromLink(link);
    const pmids = link.reviewedPmids.slice(0, 4);
    statements.push({
      claimType,
      assertion: `${nodeName(link.subjectId)} ${human(link.relation)} ${nodeName(link.objectId)}${
        link.mechanism ? ` — ${link.mechanism}` : ""
      }`,
      relId: link.relId,
      subjectId: link.subjectId,
      objectId: link.objectId,
      tier: link.tier,
      reviewStatus: link.reviewLabel,
      sourceIds: uniq([link.relId, link.subjectId, link.objectId, ...pmids]),
      unvalidated: claimType === "unvalidated_hypothesis",
      applicable: true,
    });
  }

  // Explicit Cat 5 placeholder when no hypothesis-tier links but question asked for mechanisms.
  if (!statements.some((s) => s.claimType === "unvalidated_hypothesis" && s.applicable)) {
    const weak = grounding.links.filter(
      (l) => l.tier === "emerging" || l.tier === "missing-support" || !l.hasClaimSupport,
    );
    if (weak.length) {
      const w = weak[0]!;
      statements.push({
        claimType: "unvalidated_hypothesis",
        assertion: `Candidate (unvalidated): further work may clarify ${nodeName(w.subjectId)} ↔ ${nodeName(w.objectId)} beyond current graph support.`,
        relId: w.relId,
        subjectId: w.subjectId,
        objectId: w.objectId,
        tier: w.tier,
        reviewStatus: w.reviewLabel,
        sourceIds: [w.relId, w.subjectId, w.objectId],
        unvalidated: true,
        applicable: true,
      });
    }
  }

  return statements;
}

function buildSourceLinks(grounding: AskGrounding): InvestigationSourceLink[] {
  const links: InvestigationSourceLink[] = [];
  for (const id of grounding.nodeIds) {
    const n = byId[id];
    if (!n) continue;
    links.push({
      id,
      kind: "concept",
      name: `${n.name} (${TYPES[n.node_type].label})`,
      href: `/atlas/${encodeURIComponent(id)}`,
    });
  }
  for (const rid of grounding.relIds.slice(0, 24)) {
    links.push({
      id: rid,
      kind: "relationship",
      name: rid,
      href: `/graph?focus=${encodeURIComponent(grounding.nodeIds[0] ?? "")}`,
    });
  }
  for (const c of grounding.reviewedCites.slice(0, 12)) {
    if (c.pmid) {
      links.push({
        id: c.pmid,
        kind: "pmid",
        name: c.label || `PMID ${c.pmid}`,
        href: c.url || `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`,
      });
    } else if (c.evidence_id) {
      links.push({
        id: c.evidence_id,
        kind: "evidence",
        name: c.label || c.evidence_id,
        href: c.url || null,
      });
    }
  }
  return links;
}

/**
 * Deterministic Workflow B brief from Ask grounding.
 * Prefer calling with grounding from the same prepareAsk used for the chat turn.
 */
export function buildInvestigationBrief(input: {
  question: string;
  grounding?: AskGrounding;
  now?: Date;
  /** Optional Radar conflict candidates for Cap 10 — never invented. */
  discoveryConflicts?: readonly ResearchGapCandidate[];
}): InvestigationBriefResult {
  const question = input.question.trim();
  if (!question) {
    return { ok: false, reason: "Fail closed: research question is required." };
  }

  const prepared = input.grounding ? null : prepareAsk(question);
  const grounding = input.grounding ?? prepared!.grounding;
  const queryClass = prepared?.queryClass ?? grounding.queryClass;

  if (grounding.trace.abstained || queryClass === "clinical_personal") {
    return {
      ok: false,
      reason:
        grounding.trace.abstentionReason === "clinical_personal" || queryClass === "clinical_personal"
          ? "Fail closed: personal clinical questions are outside the Scientific Intelligence research brief."
          : `Fail closed: Ask abstained (${grounding.trace.abstentionReason ?? queryClass}).`,
    };
  }
  if (!grounding.coverage.matched || !grounding.nodeIds.length) {
    return {
      ok: false,
      reason: "Fail closed: no graph entities resolved — cannot draft a source-traceable investigation brief.",
    };
  }

  const exportedAt = (input.now ?? new Date()).toISOString();
  const claims = buildClaimStatements(grounding);
  const sourceLinks = buildSourceLinks(grounding);
  const humanEvidence = buildHumanEvidenceComparison({ question, grounding });
  const contradictions = buildContradictionReport({
    question,
    grounding,
    discoveryConflicts: input.discoveryConflicts,
  });
  const researchGaps = buildResearchGapRegister({
    question,
    grounding,
    contradictionItems: contradictions.items,
  });

  const entityLines = grounding.nodes.slice(0, 16).map((n) => `- ${n.name} (${n.id}, ${TYPES[n.node_type].label})`);

  const mechanismLines = grounding.links.slice(0, 10).map((l) => {
    const ct = CLAIM_TYPE_LABEL[claimTypeFromLink(l)];
    return `- ${nodeName(l.subjectId)} —${human(l.relation)}→ ${nodeName(l.objectId)} [${l.relId}; ${l.tier}; ${ct}]`;
  });

  const evidenceLines: string[] = [];
  for (const l of grounding.links.slice(0, 8)) {
    if (l.reviewedPmids.length) {
      evidenceLines.push(
        `- ${l.relId}: Gate C / reviewed PMIDs ${l.reviewedPmids.slice(0, 4).join(", ")} (count=${l.reviewedEvidenceCount})`,
      );
    } else if (l.hasSourceLink) {
      evidenceLines.push(`- ${l.relId}: source-linked on graph; claim-level Gate C support not counted for this edge.`);
    } else {
      evidenceLines.push(`- ${l.relId}: no reviewed PMID attached in this retrieval.`);
    }
  }
  if (!evidenceLines.length) {
    evidenceLines.push("No supporting evidence rows were attached for retrieved relationships.");
  }

  const gapLines: string[] = [];
  for (const id of grounding.nodeIds.slice(0, 8)) {
    const gap = classifyEvidenceGap(id);
    if (gap) gapLines.push(`- ${nodeName(id)} (${id}): ${evidenceGapLabelText(gap)}`);
  }
  if (grounding.counterEvidence.length) {
    for (const c of grounding.counterEvidence.slice(0, 6)) {
      gapLines.push(
        `- Counterevidence: ${c.label || c.pmid || c.evidence_id}${c.pmid ? ` (PMID ${c.pmid})` : ""} — assessed conflict/partial, not Gate C support.`,
      );
    }
  } else {
    gapLines.push(
      "- Contradictions: none retrieved for this neighbourhood (honest empty — not a claim that none exist in the literature).",
    );
  }
  if (grounding.contextGaps.length) {
    for (const g of grounding.contextGaps.slice(0, 4)) {
      gapLines.push(`- Context gap: ${g}`);
    }
  }
  if (!gapLines.some((l) => l.startsWith("- ") && !l.includes("honest empty"))) {
    // keep honest empty + any gap labels
  }

  const claimSummary = RESEARCH_CLAIM_TYPES.map((ct) => {
    const rows = claims.filter((c) => c.claimType === ct);
    if (ct === "observed_patient_fact") {
      return `- ${CLAIM_TYPE_LABEL[ct]}: N/A on this research path (${rows[0]?.assertion ?? ""})`;
    }
    const n = rows.filter((r) => r.applicable).length;
    return `- ${CLAIM_TYPE_LABEL[ct]}: ${n} statement(s)${ct === "unvalidated_hypothesis" ? " — labelled unvalidated" : ""}`;
  });

  const sections: InvestigationBriefSection[] = [
    {
      id: "question",
      title: "Question",
      body: question,
      citedIds: [],
    },
    {
      id: "entities",
      title: "Entities",
      body: entityLines.length
        ? `Resolved from the curated knowledge graph:\n${entityLines.join("\n")}`
        : "No entities resolved.",
      citedIds: [...grounding.nodeIds],
    },
    {
      id: "mechanisms",
      title: "Mechanisms",
      body: mechanismLines.length
        ? `Graph relationships (retrieved neighbourhood):\n${mechanismLines.join("\n")}`
        : "No mechanism edges among retrieved entities.",
      citedIds: uniq([...grounding.relIds, ...grounding.nodeIds]),
    },
    {
      id: "supporting_evidence",
      title: "Supporting evidence",
      body: [
        ...evidenceLines,
        grounding.coverage.reviewedEvidenceCount
          ? `Coverage: ${grounding.coverage.reviewedEvidenceCount} reviewed support row(s) on retrieved links.`
          : "Coverage: no Gate C approved+supports rows on retrieved links for this turn.",
        "Provisional literature (if shown in Ask) remains unreviewed and is never treated as Gate C.",
      ].join("\n"),
      citedIds: uniq([
        ...grounding.relIds,
        ...grounding.reviewedCites.flatMap((c) => [c.pmid, c.evidence_id].filter(Boolean) as string[]),
      ]),
    },
    {
      id: "contradictions_gaps",
      title: "Contradictions and gaps",
      body: [
        ...gapLines,
        "",
        `Cap 10 unresolved items: ${contradictions.items.length}${contradictions.honestEmpty ? " (honest empty)" : ""}.`,
        `Cap 11 register entries: ${researchGaps.entries.length}${researchGaps.honestEmpty ? " (honest empty)" : ""}.`,
        `Cap 6 human-cue rows: ${humanEvidence.rows.length} (navigation groups — not a species rank).`,
        researchGaps.scopeHonestyNote,
      ].join("\n"),
      citedIds: uniq([
        ...grounding.nodeIds.slice(0, 8),
        ...grounding.counterEvidence.flatMap((c) => [c.pmid, c.evidence_id].filter(Boolean) as string[]),
      ]),
    },
    {
      id: "limitations",
      title: "Limitations",
      body: [
        "Available research capability only — not HSI Clinical and not HSI Trials.",
        "Draft / AI-assisted structure from graph retrieval; reviewStatus remains unreviewed.",
        "Cannot approve into the knowledge graph from this brief.",
        "No diagnosis, treatment, dosing, or patient-specific prediction.",
        "Ontology depth and Gate C coverage remain partial; empty contradiction lists are honest empties.",
        `Graph snapshot: ${grounding.trace.graphSnapshot}; prompt ${grounding.trace.promptVersion}.`,
      ].join(" "),
      citedIds: [],
    },
    {
      id: "claim_categories",
      title: "Claim categories",
      body: [
        "HSI categories on this brief (Cat 1 Observed is N/A for research-only):",
        ...claimSummary,
        "",
        "Statements:",
        ...claims
          .filter((c) => c.applicable || c.claimType === "observed_patient_fact")
          .slice(0, 14)
          .map((c) => {
            const tag = c.unvalidated ? " [unvalidated]" : c.applicable ? "" : " [N/A]";
            return `- (${CLAIM_TYPE_LABEL[c.claimType]}${tag}) ${c.assertion}`;
          }),
      ].join("\n"),
      citedIds: uniq(claims.flatMap((c) => c.sourceIds)),
    },
  ];

  for (const s of sections) {
    const v = validateInvestigationCitations(s.body, grounding);
    if (!v.ok) return v;
  }

  const brief: InvestigationBrief = {
    kind: INVESTIGATION_BRIEF_KIND,
    schemaVersion: INVESTIGATION_BRIEF_SCHEMA_VERSION,
    workflow: INVESTIGATION_BRIEF_WORKFLOW,
    product: "M1 Biomedical Discovery Brief",
    capabilityLabel: "Available research capability",
    label: "AI/draft",
    reviewStatus: "unreviewed",
    kgWrite: false,
    canApproveIntoKg: false,
    clinicalAdvice: false,
    clinicalProduct: false,
    trialsProduct: false,
    question,
    exportedAt,
    graphVersion: grounding.trace.graphVersion,
    nodeIds: [...grounding.nodeIds],
    relIds: [...grounding.relIds],
    sections,
    claimStatements: claims,
    sourceLinks,
    humanEvidence,
    contradictions,
    researchGaps,
    disclaimer:
      "M1 Biomedical Discovery Brief (Workflow B) + Cap 6/10/11 companions. Available research capability. AI/draft · unreviewed. Not clinical advice. Not HSI Clinical / Trials. kgWrite=false. Hypotheses are unvalidated. Observed patient facts are N/A on this path. Gaps ≠ worldwide literature absence. Contradictions stay unresolved (no majority vote).",
  };

  return { ok: true, brief };
}

export function exportInvestigationBriefJson(brief: InvestigationBrief): string {
  return JSON.stringify(brief, null, 2);
}

export function exportInvestigationBriefMarkdown(brief: InvestigationBrief): string {
  const lines: string[] = [
    `# ${brief.product} (AI/draft · unreviewed)`,
    ``,
    `- Schema: ${brief.schemaVersion}`,
    `- Workflow: ${brief.workflow}`,
    `- Capability: ${brief.capabilityLabel}`,
    `- Exported: ${brief.exportedAt}`,
    `- Graph: ${brief.graphVersion}`,
    `- kgWrite: ${brief.kgWrite}`,
    `- clinicalAdvice: ${brief.clinicalAdvice}`,
    ``,
    `> ${brief.disclaimer}`,
    ``,
  ];
  for (const s of brief.sections) {
    lines.push(`## ${s.title}`);
    lines.push(s.body);
    if (s.citedIds.length) lines.push(``, `Cited: ${s.citedIds.join(", ")}`);
    lines.push(``);
  }
  lines.push(`## Source inspection`);
  for (const s of brief.sourceLinks) {
    const link = s.href ? ` → ${s.href}` : "";
    lines.push(`- [${s.kind}] ${s.id} — ${s.name}${link}`);
  }
  lines.push(``);
  lines.push(formatHumanEvidenceMarkdown(brief.humanEvidence));
  lines.push(formatContradictionMarkdown(brief.contradictions));
  lines.push(formatResearchGapRegisterMarkdown(brief.researchGaps));
  return lines.join("\n");
}
