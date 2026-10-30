/**
 * Research brief generator (Phase 4) — draft-only, fail-closed on unsupported ids.
 * Structure: rationale, evidence, hypotheses, biomarkers, trials, limitations.
 * Cites only retrieved graph / trial / evidence ids. No clinical recommendations.
 * Cannot approve into the knowledge graph.
 */
import { byId, human, inn, out, type KGNode } from "@/lib/immune/engine";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";
import {
  classifyEvidenceGap,
  evidenceGapLabelText,
  type EvidenceGapLabel,
  type EvidenceGapSignals,
} from "./evidenceGap";

export const RESEARCH_BRIEF_SCHEMA_VERSION = "rb-1";
export const RESEARCH_BRIEF_KIND = "research_brief_draft" as const;

/** Patient-directed / CDS advice only — disclaimers and educational trial language are allowed. */
const CLINICAL_ADVICE_RE =
  /\b((?:you|the patient|patients)\s+should\b|prescrib(?:e|ing)\s+(?:this|the|a)\b|dos(?:e|age)\s+of\b|diagnos(?:e|is)\s+(?:the\s+)?patient\b|start\s+(?:this\s+)?treatment\b|I recommend\b|this (?:is|constitutes) clinical decision support\b)\b/i;

export type RetrievedBriefSources = {
  /** Graph concept ids retrieved for this draft. */
  conceptIds: readonly string[];
  /** Evidence record ids (Neon evidence_id) retrieved — never invent. */
  evidenceIds?: readonly string[];
  /** Trial graph node ids (TR…) or trial_id strings from retrieved pilots. */
  trialIds?: readonly string[];
  /** Optional relationship ids retrieved with the question. */
  relIds?: readonly string[];
};

export type ResearchBriefSection = {
  id: "rationale" | "evidence" | "hypotheses" | "biomarkers" | "trials" | "limitations";
  title: string;
  body: string;
  citedIds: string[];
};

export type ResearchBriefDraft = {
  kind: typeof RESEARCH_BRIEF_KIND;
  schemaVersion: typeof RESEARCH_BRIEF_SCHEMA_VERSION;
  /** Always draft / AI-assisted — never curated knowledge. */
  label: "AI/draft";
  reviewStatus: "unreviewed";
  kgWrite: false;
  canApproveIntoKg: false;
  clinicalAdvice: false;
  question: string;
  exportedAt: string;
  exportVersion: string;
  graphConceptIds: string[];
  evidenceIds: string[];
  trialIds: string[];
  relIds: string[];
  gapClassifications: Array<{ conceptId: string; gap: EvidenceGapLabel | null; label: string | null }>;
  sections: ResearchBriefSection[];
  sourceList: Array<{ id: string; kind: "concept" | "evidence" | "trial" | "relationship"; name: string }>;
  disclaimer: string;
};

export type ResearchBriefResult =
  | { ok: true; brief: ResearchBriefDraft }
  | { ok: false; reason: string };

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

function pilotTrialById(id: string) {
  return MELANOMA_PILOT_TRIALS.find((t) => t.trialId === id || t.graphNodeId === id);
}

/** Allowed citation universe for this draft — fail closed outside it. */
export function buildAllowedCitationSet(sources: RetrievedBriefSources): Set<string> {
  const allowed = new Set<string>();
  for (const id of sources.conceptIds ?? []) {
    const t = id.trim();
    if (t && byId[t]) allowed.add(t);
  }
  for (const id of sources.evidenceIds ?? []) {
    const t = id.trim();
    if (t) allowed.add(t);
  }
  for (const id of sources.trialIds ?? []) {
    const t = id.trim();
    if (!t) continue;
    if (byId[t] || pilotTrialById(t)) allowed.add(t);
  }
  for (const id of sources.relIds ?? []) {
    const t = id.trim();
    if (t.startsWith("REL-")) allowed.add(t);
  }
  return allowed;
}

/**
 * Reject invented / unretrieved ids and clinical-advice phrasing.
 * Empty retrieved concept set fails closed.
 */
export function validateBriefCitations(
  text: string,
  sources: RetrievedBriefSources,
): { ok: true } | { ok: false; reason: string } {
  if (CLINICAL_ADVICE_RE.test(text)) {
    return {
      ok: false,
      reason: "Fail closed: clinical diagnosis/treatment phrasing is not allowed in research briefs.",
    };
  }
  const allowed = buildAllowedCitationSet(sources);
  if (![...allowed].some((id) => byId[id])) {
    return {
      ok: false,
      reason: "Fail closed: no retrieved graph concept ids — cannot draft a source-traceable brief.",
    };
  }

  // Graph ids (A12 / TR003), REL-*, EV-* / E## evidence ids, NCT*. Avoid matching words like ESTABLISHED.
  const candidates =
    text.match(/\b(?:REL-[A-Za-z0-9_-]+|[A-Z]{1,3}\d{2,4}|EV-[A-Za-z0-9._:-]+|E\d{2,4}|NCT\d{8})\b/g) ?? [];
  for (const raw of candidates) {
    if (/^NCT\d{8}$/.test(raw)) {
      const ok = MELANOMA_PILOT_TRIALS.some(
        (t) => (allowed.has(t.graphNodeId) || allowed.has(t.trialId)) && t.nctId === raw,
      );
      if (!ok) return { ok: false, reason: `Fail closed: unsupported NCT id ${raw}.` };
      continue;
    }
    if (!allowed.has(raw)) {
      if (byId[raw] || raw.startsWith("REL-") || /^EV-[A-Za-z0-9._:-]+$/.test(raw) || /^E\d{2,4}$/.test(raw)) {
        return { ok: false, reason: `Fail closed: unsupported or unretrieved id ${raw}.` };
      }
    }
  }
  return { ok: true };
}

function neighbourLines(conceptIds: string[], allowed: Set<string>): string[] {
  const lines: string[] = [];
  for (const id of conceptIds) {
    if (!allowed.has(id)) continue;
    const edges = [...(out[id] ?? []), ...(inn[id] ?? [])].slice(0, 6);
    for (const e of edges) {
      const other = e.subject_id === id ? e.object_id : e.subject_id;
      const node = byId[other];
      if (!node) continue;
      // Cite only retrieved ids — neighbour names without unretrieved ids.
      if (allowed.has(other)) {
        lines.push(`${id} —${human(e.relation)}→ ${other} (${node.name})`);
      } else {
        lines.push(`${id} —${human(e.relation)}→ ${node.name} (neighbour not in retrieved id set)`);
      }
    }
  }
  return uniq(lines).slice(0, 12);
}

function nodesOfType(conceptIds: string[], type: KGNode["node_type"]): KGNode[] {
  return conceptIds.map((id) => byId[id]).filter((n): n is KGNode => Boolean(n && n.node_type === type));
}

/**
 * Build a draft research brief from retrieved sources only.
 * Deterministic template (labelled AI/draft) — no live model call required for MVP.
 */
export function draftResearchBrief(input: {
  question: string;
  sources: RetrievedBriefSources;
  rationale?: string;
  hypotheses?: readonly string[];
  gapSignalsByConcept?: Record<string, EvidenceGapSignals>;
  now?: Date;
}): ResearchBriefResult {
  const question = input.question.trim();
  if (!question) return { ok: false, reason: "Fail closed: research question is required." };

  const conceptIds = uniq(input.sources.conceptIds).filter((id) => byId[id]);
  const evidenceIds = uniq(input.sources.evidenceIds ?? []);
  const trialIds = uniq(input.sources.trialIds ?? []).filter((id) => byId[id] || pilotTrialById(id));
  const relIds = uniq(input.sources.relIds ?? []).filter((id) => id.startsWith("REL-"));

  const sources: RetrievedBriefSources = { conceptIds, evidenceIds, trialIds, relIds };
  const allowed = buildAllowedCitationSet(sources);
  if (!conceptIds.length) {
    return {
      ok: false,
      reason: "Fail closed: no retrieved graph concept ids — cannot draft a source-traceable brief.",
    };
  }

  const rationaleExtra = (input.rationale ?? "").trim();
  if (rationaleExtra) {
    const v = validateBriefCitations(rationaleExtra, sources);
    if (!v.ok) return v;
  }
  for (const h of input.hypotheses ?? []) {
    const v = validateBriefCitations(h, sources);
    if (!v.ok) return v;
  }

  const exportedAt = (input.now ?? new Date()).toISOString();
  const gaps = conceptIds.map((conceptId) => {
    const gap = classifyEvidenceGap(conceptId, input.gapSignalsByConcept?.[conceptId] ?? {});
    return { conceptId, gap, label: gap ? evidenceGapLabelText(gap) : null };
  });

  const conceptNames = conceptIds.map((id) => `${byId[id]!.name} (${id})`);
  const evidenceLines = neighbourLines(conceptIds, allowed);
  const biomarkers = nodesOfType(conceptIds, "BIOMARKER");
  const trialNodes = [
    ...nodesOfType(conceptIds, "TRIAL"),
    ...trialIds.map((id) => byId[id]).filter((n): n is KGNode => Boolean(n && n.node_type === "TRIAL")),
  ];
  const uniqueTrials = uniq(trialNodes.map((n) => n.id)).map((id) => byId[id]!);

  const hypLines: string[] = (input.hypotheses ?? []).map((h) => h.trim()).filter(Boolean);
  if (!hypLines.length) {
    hypLines.push(
      `Candidate (unreviewed): mechanisms among ${conceptIds.slice(0, 4).join(", ")} remain illustrative until human review.`,
    );
  }

  const sections: ResearchBriefSection[] = [
    {
      id: "rationale",
      title: "Rationale",
      body:
        rationaleExtra ||
        `Draft investigation of "${question}" using retrieved atlas concepts: ${conceptNames.join("; ")}. This is an AI/draft synthesis for human review — not curated knowledge.`,
      citedIds: [...conceptIds],
    },
    {
      id: "evidence",
      title: "Evidence",
      body: [
        evidenceIds.length
          ? `Retrieved evidence record refs: ${evidenceIds.join(", ")}.`
          : "No evidence record refs were retrieved for this draft.",
        evidenceLines.length
          ? `Graph neighbourhood (retrieved ids only):\n${evidenceLines.map((l) => `- ${l}`).join("\n")}`
          : "No incident edges among retrieved concept ids were available to list.",
        `Gap labels (real status only; Gate C density is never invented): ${gaps
          .map((g) => `${g.conceptId}=${g.label ?? "supported/unknown"}`)
          .join("; ")}.`,
      ].join("\n"),
      citedIds: uniq([...conceptIds, ...evidenceIds, ...relIds]),
    },
    {
      id: "hypotheses",
      title: "Hypotheses",
      body: hypLines.map((h, i) => `${i + 1}. ${h} (candidate · unreviewed)`).join("\n"),
      citedIds: [...conceptIds],
    },
    {
      id: "biomarkers",
      title: "Biomarkers",
      body: biomarkers.length
          ? biomarkers
              .map((b) => `- ${b.name} (${b.id}) · graph evidence_status label recorded on node`)
              .join("\n")
        : "No BIOMARKER concepts were present in the retrieved id set. Assay rows are not invented.",
      citedIds: biomarkers.map((b) => b.id),
    },
    {
      id: "trials",
      title: "Trials",
      body: uniqueTrials.length
        ? uniqueTrials
            .map((t) => {
              const pilot = pilotTrialById(t.id);
              const extra = pilot?.nctId ? ` · NCT ${pilot.nctId}` : "";
              return `- ${t.name} (${t.id})${extra} · educational/trial context only — not clinical decision support.`;
            })
            .join("\n")
        : "No TRIAL concepts were present in the retrieved id set.",
      citedIds: uniqueTrials.map((t) => t.id),
    },
    {
      id: "limitations",
      title: "Limitations",
      body: [
        "Draft / AI-assisted only — reviewStatus remains unreviewed.",
        "Cannot approve into the knowledge graph from this export.",
        "No diagnosis, treatment, dosing, or patient-specific prediction is offered.",
        "Citations are limited to retrieved graph, trial, and evidence ids; unsupported ids fail closed.",
        "Production Trial Intelligence UI may be flag-gated; fixture/Postgres pilots stay source-traceable when present.",
      ].join(" "),
      citedIds: [],
    },
  ];

  for (const s of sections) {
    const v = validateBriefCitations(s.body, sources);
    if (!v.ok) return v;
  }

  const sourceList: ResearchBriefDraft["sourceList"] = [
    ...conceptIds.map((id) => ({ id, kind: "concept" as const, name: byId[id]!.name })),
    ...evidenceIds.map((id) => ({ id, kind: "evidence" as const, name: id })),
    ...uniqueTrials.map((t) => ({ id: t.id, kind: "trial" as const, name: t.name })),
    ...relIds.map((id) => ({ id, kind: "relationship" as const, name: id })),
  ];

  const brief: ResearchBriefDraft = {
    kind: RESEARCH_BRIEF_KIND,
    schemaVersion: RESEARCH_BRIEF_SCHEMA_VERSION,
    label: "AI/draft",
    reviewStatus: "unreviewed",
    kgWrite: false,
    canApproveIntoKg: false,
    clinicalAdvice: false,
    question,
    exportedAt,
    exportVersion: `${RESEARCH_BRIEF_SCHEMA_VERSION}+${exportedAt}`,
    graphConceptIds: conceptIds,
    evidenceIds,
    trialIds: uniqueTrials.map((t) => t.id),
    relIds,
    gapClassifications: gaps,
    sections,
    sourceList,
    disclaimer:
      "AI/draft research brief. Unreviewed. Not clinical advice. kgWrite=false. Cannot approve into the curated knowledge graph.",
  };

  return { ok: true, brief };
}

export function exportResearchBriefJson(brief: ResearchBriefDraft): string {
  return JSON.stringify(brief, null, 2);
}

export function exportResearchBriefMarkdown(brief: ResearchBriefDraft): string {
  const lines: string[] = [
    `# Research brief (AI/draft · unreviewed)`,
    ``,
    `- Schema: ${brief.schemaVersion}`,
    `- Exported: ${brief.exportedAt}`,
    `- Review: ${brief.reviewStatus}`,
    `- kgWrite: ${brief.kgWrite}`,
    `- canApproveIntoKg: ${brief.canApproveIntoKg}`,
    `- clinicalAdvice: ${brief.clinicalAdvice}`,
    ``,
    `## Question`,
    brief.question,
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
  lines.push(`## Source list`);
  for (const s of brief.sourceList) {
    lines.push(`- [${s.kind}] ${s.id} — ${s.name}`);
  }
  lines.push(``);
  return lines.join("\n");
}
