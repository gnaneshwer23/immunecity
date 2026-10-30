/**
 * Phase E — Structured scientific brief + human review handoff.
 * Reuses draftResearchBrief (fail-closed) and Phase C claim/review queue helpers.
 * Unreviewed claims never auto-approve. No community→KG write.
 *
 * Claim candidates must be source-backed (PMID/DOI and/or curator claim_text).
 * Bare evidence ids without locators never mint placeholder assertions.
 */
import { byId, edgeByRel } from "@/lib/immune/engine";
import {
  assertNoSilentApproval,
  claimRequiresHumanReview,
  toSourceBackedClaim,
  type SourceBackedClaim,
} from "@/lib/immune/claimRecords";
import {
  buildScientificReviewQueue,
  type ReviewQueueRowInput,
  type ReviewQueueSnapshot,
} from "@/lib/immune/scientificReviewQueue";
import { melanomaInvestigationConceptIds } from "@/lib/immune/melanomaInvestigationPath";
import type { CitationLike } from "@/lib/immune/evidenceStatus";
import { MELANOMA_PILOT_TRIALS } from "@/data/trialIntelligence";
import { GRAPH_CORE_VERSION, GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";
import {
  draftResearchBrief,
  exportResearchBriefMarkdown,
  type ResearchBriefDraft,
  type RetrievedBriefSources,
} from "./researchBrief";
import { buildExportProvenanceTrail, type ExportProvenanceTrail } from "./exportProvenance";
import {
  validateManifestForImport,
  type CurationManifestExport,
} from "./literatureWorkflow";

export const SCIENTIFIC_BRIEF_HANDOFF_KIND = "scientific_brief_review_handoff" as const;
export const SCIENTIFIC_BRIEF_SCHEMA = "sb-1" as const;

export type ScientificBriefPackage = {
  kind: "scientific_brief_package";
  schemaVersion: typeof SCIENTIFIC_BRIEF_SCHEMA;
  label: "AI/draft";
  reviewStatus: "unreviewed";
  kgWrite: false;
  canApproveIntoKg: false;
  clinicalAdvice: false;
  clinicalConclusion: false;
  brief: ResearchBriefDraft;
  provenance: ExportProvenanceTrail;
  /** Source-backed claim candidates — still unreviewed; never Gate C by export. */
  claimCandidates: SourceBackedClaim[];
  reviewQueue: ReviewQueueSnapshot | null;
  handoff: ScientificBriefReviewHandoff;
};

export type ScientificBriefReviewHandoff = {
  kind: typeof SCIENTIFIC_BRIEF_HANDOFF_KIND;
  /** True when a curation-importable candidateManifest is attached (auth still required at /curation). */
  wired: boolean;
  kgWrite: false;
  autoPromote: false;
  openRoute: "/curation";
  note: string;
  claimCount: number;
  requiresHumanReview: true;
  blockedSilentApprovals: number;
  exportedAt: string;
  /** Importable as literature_candidate_export — curation stays unreviewed. */
  candidateManifest: CurationManifestExport | null;
};

function rowToCite(row: ReviewQueueRowInput): CitationLike {
  return {
    evidence_id: row.evidence_id,
    relationship_id: row.relationship_id ?? null,
    claim_support: row.claim_support ?? "unassessed",
    curation: row.curation ?? "unreviewed",
    label: row.label ?? row.pmid ?? row.doi ?? row.evidence_id,
    url: row.url ?? (row.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${row.pmid}/` : ""),
    pmid: row.pmid ?? undefined,
    doi: row.doi ?? undefined,
    claim_text: row.claim_text ?? undefined,
    passage_span: row.passage_span ?? undefined,
    reviewed_at: row.reviewed_at ?? null,
  };
}

/** True when a candidate has a durable locator or an explicit curator assertion — never a synthetic stub. */
export function isSourceBackedCandidate(c: CitationLike): boolean {
  const hasLocator = Boolean(c.pmid?.trim() || c.doi?.trim());
  const hasAssertion = Boolean(c.claim_text?.trim() || c.passage_span?.trim() || c.notes?.trim());
  if (!hasLocator && !hasAssertion) return false;
  // Reject legacy placeholder wording if it ever reappears.
  if (c.claim_text?.startsWith("Candidate claim linked to brief export")) return false;
  return true;
}

/**
 * Melanoma pilot fixture → unreviewed candidate cites with real trial PMIDs/DOIs.
 * Educational draft only — never approved, never invented locators.
 */
export function melanomaPilotSourceBackedCandidates(): ReviewQueueRowInput[] {
  const out: ReviewQueueRowInput[] = [];
  for (const trial of MELANOMA_PILOT_TRIALS) {
    const pmid = trial.primaryPmid?.trim();
    const doi = trial.primaryDoi?.trim();
    if (!pmid && !doi) continue;
    const relId =
      trial.graphNodeId === "TR003"
        ? "REL-I008-demonstrates_in-TR003"
        : trial.graphNodeId === "TR020"
          ? "REL-I009-evaluates_in-TR020"
          : null;
    const nodeId =
      trial.graphNodeId === "TR003" ? "I008" : trial.graphNodeId === "TR020" ? "I009" : trial.graphNodeId;
    out.push({
      evidence_id: `SB-PILOT-${trial.graphNodeId}-PRIMARY`,
      node_id: nodeId,
      relationship_id: relId && edgeByRel[relId] ? relId : null,
      claim_support: "unassessed",
      curation: "unreviewed",
      check_status: "unchecked",
      pmid: pmid || null,
      doi: doi || null,
      label: `${trial.acronym} primary report PMID ${pmid ?? "n/a"}`,
      url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : undefined,
      claim_text: `${trial.acronym} (${trial.nctId}): ${trial.populationSummary} Educational candidate — unreviewed; not Gate C.`,
      passage_span: null,
      reviewed_at: null,
    });
  }
  return out;
}

function buildCandidateManifest(
  rows: readonly ReviewQueueRowInput[],
  exportedAt: string,
): CurationManifestExport | null {
  const groups = new Map<string, CurationManifestExport["evidence_records"][number]>();
  for (const row of rows) {
    const cite = rowToCite(row);
    if (!isSourceBackedCandidate(cite)) continue;
    if ((row.curation ?? "unreviewed") === "approved") continue;
    const conceptId =
      (row.node_id && byId[row.node_id] ? row.node_id : null) ??
      (row.relationship_id && edgeByRel[row.relationship_id]
        ? edgeByRel[row.relationship_id]!.subject_id
        : null);
    if (!conceptId || !byId[conceptId]) continue;
    const node = byId[conceptId]!;
    if (!groups.has(conceptId)) {
      groups.set(conceptId, {
        node_id: conceptId,
        node_type: node.node_type,
        node_name: node.name,
        evidence: [],
      });
    }
    groups.get(conceptId)!.evidence.push({
      evidence_id: row.evidence_id,
      source_ref: row.label ?? row.pmid ?? row.doi ?? null,
      status: "candidate",
      source_type: "literature_workflow",
      pmid: row.pmid ?? undefined,
      doi: row.doi ?? undefined,
      relationship_id: row.relationship_id ?? null,
      claim_support: (row.claim_support as "unassessed") ?? "unassessed",
      claim_text: row.claim_text ?? undefined,
    });
  }
  if (!groups.size) return null;
  const manifest: CurationManifestExport = {
    meta: {
      kind: "literature_candidate_export",
      project_id: `SB-HANDOFF-${exportedAt.slice(0, 10)}`,
      graphVersion: GRAPH_CORE_VERSION,
      extensionsVersion: GRAPH_EXTENSIONS_VERSION,
      exportedAt,
      curation: "unreviewed",
      note:
        "Scientific brief handoff — source-backed candidates only. Not auto-approved. Not a KG write. Import at /curation (authenticated) for human review.",
    },
    evidence_records: [...groups.values()],
  };
  const check = validateManifestForImport(manifest);
  return check.ok ? manifest : null;
}

/**
 * Draft a structured scientific brief for the melanoma path (or custom sources)
 * and attach an unreviewed human-review handoff. Never approves into the KG.
 */
export function buildScientificBriefPackage(input: {
  question?: string;
  sources?: RetrievedBriefSources;
  /**
   * Source-backed rows for claim candidates + review queue.
   * When omitted, melanoma pilot primary PMIDs/DOIs seed unreviewed candidates.
   * Bare evidenceIds alone never mint placeholder claims.
   */
  reviewRows?: readonly ReviewQueueRowInput[];
  now?: Date;
}): { ok: true; package: ScientificBriefPackage } | { ok: false; reason: string } {
  const defaultConcepts = melanomaInvestigationConceptIds();
  const sources: RetrievedBriefSources = input.sources ?? {
    conceptIds: defaultConcepts,
    trialIds: ["TR003", "TR020"],
    evidenceIds: [],
    relIds: [],
  };

  const briefResult = draftResearchBrief({
    question:
      input.question?.trim() ||
      "Melanoma PD-1 immunotherapy: mechanisms, biomarkers, trials, and unknowns (educational draft).",
    sources,
    now: input.now,
  });
  if (!briefResult.ok) return briefResult;

  const brief = briefResult.brief;

  const seedRows: ReviewQueueRowInput[] =
    input.reviewRows && input.reviewRows.length
      ? [...input.reviewRows]
      : melanomaPilotSourceBackedCandidates().filter((row) => {
          // Keep candidates aligned with retrieved trial/concept universe when custom sources are set.
          if (!input.sources) return true;
          const trialOk =
            !row.relationship_id ||
            brief.trialIds.some((t) => row.evidence_id.includes(t)) ||
            brief.relIds.includes(row.relationship_id) ||
            brief.graphConceptIds.includes(row.node_id ?? "");
          return trialOk || brief.trialIds.length === 0;
        });

  // Only source-backed rows become claim candidates — drop bare / placeholder stubs.
  const candidateRows = seedRows.filter((row) => {
    const cite = rowToCite({ ...row, curation: "unreviewed" });
    // Force unreviewed in draft package even if a row was passed as approved (refuse silent promote).
    return isSourceBackedCandidate(cite);
  });

  for (const row of candidateRows) {
    if (row.curation === "approved") {
      return { ok: false, reason: "Refuse approved claims inside draft brief package." };
    }
  }

  const candidateCites = candidateRows.map((row) =>
    rowToCite({ ...row, curation: "unreviewed", claim_support: row.claim_support ?? "unassessed" }),
  );

  for (const cite of candidateCites) {
    if (!claimRequiresHumanReview(cite) && cite.curation === "approved") {
      return { ok: false, reason: "Refuse approved claims inside draft brief package." };
    }
  }

  const claimCandidates = candidateCites.map((c) => {
    const edge = c.relationship_id ? edgeByRel[c.relationship_id] : null;
    return toSourceBackedClaim(c, edge);
  });

  const reviewRows: ReviewQueueRowInput[] = candidateRows.map((row) => ({
    ...row,
    curation: "unreviewed",
    node_id: row.node_id ?? brief.graphConceptIds[0] ?? null,
  }));

  const reviewQueue = reviewRows.length ? buildScientificReviewQueue(reviewRows) : null;

  let blockedSilentApprovals = reviewQueue?.blockedSilentApprovals ?? 0;
  for (const c of candidateCites) {
    const probe = assertNoSilentApproval({
      ...c,
      curation: "approved",
      claim_support: "unassessed",
    });
    if (!probe.ok) blockedSilentApprovals += 1;
  }

  const evidenceIdsForProvenance = [
    ...new Set([...brief.evidenceIds, ...candidateRows.map((r) => r.evidence_id)]),
  ];

  const provenance = buildExportProvenanceTrail({
    conceptIds: brief.graphConceptIds,
    relIds: brief.relIds,
    trialIds: brief.trialIds,
    evidenceIds: evidenceIdsForProvenance,
    now: input.now,
  });

  const candidateManifest = buildCandidateManifest(reviewRows, brief.exportedAt);
  const wired = Boolean(candidateManifest);

  const handoff: ScientificBriefReviewHandoff = {
    kind: SCIENTIFIC_BRIEF_HANDOFF_KIND,
    wired,
    kgWrite: false,
    autoPromote: false,
    openRoute: "/curation",
    note: wired
      ? "Handoff wired: import candidateManifest at /curation (authenticated). Unreviewed stays unapproved. autoPromote=false. Not a KG write."
      : "No importable source-backed candidates — nothing to hand off. Unreviewed stays unapproved. Not a KG write.",
    claimCount: claimCandidates.length,
    requiresHumanReview: true,
    blockedSilentApprovals,
    exportedAt: brief.exportedAt,
    candidateManifest,
  };

  return {
    ok: true,
    package: {
      kind: "scientific_brief_package",
      schemaVersion: SCIENTIFIC_BRIEF_SCHEMA,
      label: "AI/draft",
      reviewStatus: "unreviewed",
      kgWrite: false,
      canApproveIntoKg: false,
      clinicalAdvice: false,
      clinicalConclusion: false,
      brief,
      provenance,
      claimCandidates,
      reviewQueue,
      handoff,
    },
  };
}

export function exportScientificBriefPackageJson(pkg: ScientificBriefPackage): string {
  return JSON.stringify(pkg, null, 2);
}

export function exportScientificBriefPackageMarkdown(pkg: ScientificBriefPackage): string {
  const briefMd = exportResearchBriefMarkdown(pkg.brief);
  return [
    briefMd,
    ``,
    `## Provenance trail`,
    `- Graph core: ${pkg.provenance.graphCoreVersion}`,
    `- Extensions: ${pkg.provenance.graphExtensionsVersion}`,
    `- Concepts: ${pkg.provenance.concepts.map((c) => c.isiId).join(", ") || "(none)"}`,
    `- Trials: ${pkg.provenance.trials.map((t) => t.graphNodeId).join(", ") || "(none)"}`,
    `- kgWrite: ${pkg.provenance.kgWrite}`,
    ``,
    `## Human review handoff`,
    `- Route: ${pkg.handoff.openRoute}`,
    `- Wired: ${pkg.handoff.wired}`,
    `- Claims: ${pkg.handoff.claimCount}`,
    `- Requires human review: ${pkg.handoff.requiresHumanReview}`,
    `- Blocked silent approvals: ${pkg.handoff.blockedSilentApprovals}`,
    `- autoPromote: ${pkg.handoff.autoPromote}`,
    `- Candidate manifest: ${pkg.handoff.candidateManifest ? "attached (unreviewed)" : "none"}`,
    `- Note: ${pkg.handoff.note}`,
  ].join("\n");
}
