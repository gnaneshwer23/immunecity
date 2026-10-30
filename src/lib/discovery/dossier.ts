/**
 * Phase 4 — Gap dossier view-model.
 * Reuses Atlas / Ask / Evidence / Workbench / Trial deep links — does not duplicate those UIs.
 */
import { askPrefill } from "@/lib/immune/concepts";
import { byId } from "@/lib/immune/engine";
import type { VerificationReport } from "@/lib/discovery/verify";
import {
  GAP_CLASS_UI,
  type ResearchGapClass,
  type OpportunityStatus,
} from "@/lib/discovery/gapClass";
import type {
  ResearchGapCandidate,
  ResearchGapStatus,
  SearchScope,
} from "@/lib/discovery/types";

export type GapStatusBadge = {
  status: ResearchGapStatus | ResearchGapCandidate["status"];
  label: string;
  tone: "neutral" | "warn" | "ok" | "danger" | "info";
  honesty: string;
};

export type DossierLink = {
  id: string;
  label: string;
  href: string;
  external?: boolean;
};

export type GapDossierView = {
  gapKey: string;
  title: string;
  summary: string;
  status: ResearchGapStatus | ResearchGapCandidate["status"];
  badge: GapStatusBadge;
  gapClass: ResearchGapClass | null;
  gapClassLabel: string | null;
  gapClassHonesty: string | null;
  opportunityStatus: OpportunityStatus | null;
  classReason: string | null;
  whyItMatters: string;
  searchScope: SearchScope;
  detectionSource: string;
  pilot: string | null;
  coverageLabel: string | null;
  persisted: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  subjectName: string | null;
  objectName: string | null;
  askPrefillQuestion: string;
  askHref: string;
  links: DossierLink[];
  verification: VerificationReport | null;
  coverageRows: Array<{
    searchAttempted: boolean;
    hitCount: number | null;
    scopeNote: string;
    queryText: string | null;
    ranAt: string | null;
  }>;
  reviews: Array<{
    actor: string;
    decision: string;
    rationale: string;
    previousStatus: string;
    newStatus: string;
    createdAt: string;
  }>;
  noveltyLimitationNote: string;
  autoApprove: false;
  note: string;
  /** Evidence Intel 4.0 panel — optional; absent when not reassessed. */
  intel4: {
    version: string;
    claimSupport: number;
    claimInsufficient: number;
    claimAbstained: number;
    demotedFromPriorSupport: number;
    routeRisk: "low" | "moderate" | "high" | null;
    routeHref: string | null;
    adjudicatorUncertainty: string | null;
    smeQueued: boolean;
    accuracyVsGold: null;
    honesty: string;
  } | null;
};

export function gapStatusBadge(
  status: ResearchGapStatus | ResearchGapCandidate["status"],
): GapStatusBadge {
  switch (status) {
    case "coverage_insufficient":
      return {
        status,
        label: "Coverage insufficient",
        tone: "warn",
        honesty: "ISI search / Gate C signals incomplete — not worldwide literature absence.",
      };
    case "needs_context":
      return {
        status,
        label: "Needs context",
        tone: "info",
        honesty: "Reviewer requested more context before a final decision.",
      };
    case "rejected":
      return {
        status,
        label: "Rejected",
        tone: "danger",
        honesty: "Human reviewer rejected this as not a gap within documented scope.",
      };
    case "reviewed_gap":
      return {
        status,
        label: "Reviewed gap",
        tone: "ok",
        honesty: "Human-confirmed research gap within documented ISI scope.",
      };
    case "superseded":
      return {
        status,
        label: "Superseded",
        tone: "neutral",
        honesty: "Replaced by a newer version or change event.",
      };
    case "candidate":
    default:
      return {
        status: "candidate",
        label: "Candidate",
        tone: "neutral",
        honesty: "Detected from ISI signals — awaiting human scientific review.",
      };
  }
}

/** Build Ask prefill from gap subject/object without inventing science. */
export function dossierAskPrefill(gap: Pick<ResearchGapCandidate, "subjectId" | "objectId" | "title">): {
  about: string;
  q: string;
  href: string;
} {
  const about = gap.subjectId ?? gap.objectId ?? "";
  const subject = gap.subjectId ? byId[gap.subjectId]?.name : null;
  const object = gap.objectId ? byId[gap.objectId]?.name : null;
  const q =
    subject && object
      ? `What evidence uncertainty remains for ${subject} in relation to ${object}? Frame as ISI coverage, not worldwide literature absence.`
      : subject
        ? `What evidence gaps or coverage limits does ISI show for ${subject}?`
        : askPrefill(about, `Explain the research uncertainty: ${gap.title}`);
  const params = new URLSearchParams();
  if (about) params.set("about", about);
  if (q) params.set("q", q.slice(0, 500));
  const qs = params.toString();
  return { about, q, href: qs ? `/ask?${qs}` : "/ask" };
}

export function buildGapDossier(input: {
  gap: ResearchGapCandidate & { status?: ResearchGapStatus | ResearchGapCandidate["status"] };
  persistedStatus?: ResearchGapStatus | null;
  persisted?: boolean;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  verification?: VerificationReport | null;
  coverageRows?: GapDossierView["coverageRows"];
  reviews?: GapDossierView["reviews"];
  intel4?: GapDossierView["intel4"];
}): GapDossierView {
  const { gap } = input;
  const status = (input.persistedStatus ?? gap.status) as ResearchGapStatus | ResearchGapCandidate["status"];
  const ask = dossierAskPrefill(gap);
  const links: DossierLink[] = [];
  if (gap.subjectId) {
    links.push({ id: "atlas-subject", label: "Atlas · subject", href: `/atlas/${gap.subjectId}` });
  }
  if (gap.objectId) {
    links.push({ id: "atlas-object", label: "Atlas · object", href: `/atlas/${gap.objectId}` });
  }
  links.push({ id: "ask", label: "Ask Immune (prefilled)", href: ask.href });
  links.push({ id: "evidence", label: "Evidence explorer", href: "/evidence" });
  links.push({ id: "research", label: "Research library", href: "/research" });
  links.push({ id: "workbench", label: "Research Workbench", href: "/research-workbench" });
  if (gap.diseaseId === "D012" || gap.objectId === "D012" || gap.subjectId === "D012") {
    links.push({ id: "pipeline", label: "Disease pipelines · trials", href: "/pipeline" });
    links.push({ id: "therapy", label: "Therapy explorer", href: "/therapy" });
  }
  links.push({ id: "radar", label: "Research Radar", href: "/discovery" });
  const gapClass = gap.gapClass ?? null;
  if (gapClass === "isi_curation_gap") {
    links.push({ id: "sme", label: "SME review workspace", href: "/sme" });
    links.push({ id: "curation", label: "Evidence curation", href: "/curation" });
  }
  if (input.intel4?.routeHref) {
    links.push({
      id: "intel4-route",
      label: input.intel4.smeQueued ? "Intel 4.0 · SME queue" : "Intel 4.0 · review route",
      href: input.intel4.routeHref,
    });
  } else if (
    gap.gapKey.startsWith("GAP-OPP-") ||
    gapClass === "scientific_evidence_gap" ||
    gapClass === "research_opportunity"
  ) {
    links.push({
      id: "sme-opp",
      label: "SME review workspace",
      href: `/sme?gapKey=${encodeURIComponent(gap.gapKey)}`,
    });
  }

  const classUi = gapClass ? GAP_CLASS_UI[gapClass] : null;

  return {
    gapKey: gap.gapKey,
    title: gap.title,
    summary: gap.summary,
    status,
    badge: gapStatusBadge(status),
    gapClass,
    gapClassLabel: classUi?.label ?? null,
    gapClassHonesty: classUi?.honesty ?? null,
    opportunityStatus: gap.opportunityStatus ?? null,
    classReason: gap.classReason ?? null,
    whyItMatters: gap.whyItMatters,
    searchScope: gap.searchScope,
    detectionSource: gap.detectionSource,
    pilot: gap.pilot,
    coverageLabel: gap.coverageLabel,
    persisted: Boolean(input.persisted),
    reviewedBy: input.reviewedBy ?? null,
    reviewedAt: input.reviewedAt ?? null,
    subjectName: gap.subjectId ? byId[gap.subjectId]?.name ?? gap.subjectId : null,
    objectName: gap.objectId ? byId[gap.objectId]?.name ?? gap.objectId : null,
    askPrefillQuestion: ask.q,
    askHref: ask.href,
    links,
    verification: input.verification ?? null,
    coverageRows: input.coverageRows ?? [],
    reviews: input.reviews ?? [],
    noveltyLimitationNote:
      "Novelty notes reflect documented ISI/product search scope and pilot corpora only — not a claim of global literature novelty. Incomplete retrieval blocks confident scientific-gap claims.",
    autoApprove: false,
    note: "Dossier reuses Ask, Atlas, Evidence, Workbench, and Trials — one knowledge graph. Gap class is orthogonal to review status; reviewed_gap / reviewed_opportunity require human review.",
    intel4: input.intel4 ?? null,
  };
}
