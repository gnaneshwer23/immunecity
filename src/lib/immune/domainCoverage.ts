/* Phase B domain coverage + knowledge-gap queue.
   Reports educational draft density by thin domain; never invents PMIDs or approvals. */
import { CONTENT } from "@/data/content";
import { EXT_PROVENANCE } from "@/data/extensions";
import { GRAPH_EXTENSIONS_VERSION } from "@/lib/immune/graphRelease";
import { KG, byId, deg, edgeRef, relId, type KGEdge, type KGNode } from "@/lib/immune/engine";

export type KnowledgeDomainId =
  | "microbiome"
  | "vaccines"
  | "transplant"
  | "pid"
  | "immunogenetics"
  | "infection_autoimmunity"
  | "frontier";

export interface KnowledgeDomain {
  id: KnowledgeDomainId;
  label: string;
  /** Stable ID prefixes for extension concepts in this domain. */
  prefixes: string[];
  lessonId: string;
  /** Minimum draft concepts expected for a non-thin teaching scaffold. */
  expectedMinNodes: number;
}

export const KNOWLEDGE_DOMAINS: KnowledgeDomain[] = [
  { id: "microbiome", label: "Microbiome & barrier", prefixes: ["EM"], lessonId: "microbiome", expectedMinNodes: 8 },
  { id: "vaccines", label: "Vaccines", prefixes: ["EV"], lessonId: "vaccines", expectedMinNodes: 6 },
  { id: "transplant", label: "Transplantation", prefixes: ["ET"], lessonId: "transplant", expectedMinNodes: 6 },
  { id: "pid", label: "Primary immunodeficiency", prefixes: ["EP"], lessonId: "pid", expectedMinNodes: 8 },
  { id: "immunogenetics", label: "Immunogenetics", prefixes: ["EG"], lessonId: "immunogenetics", expectedMinNodes: 8 },
  { id: "infection_autoimmunity", label: "Infection ↔ autoimmunity", prefixes: ["EI"], lessonId: "infection-autoimmunity", expectedMinNodes: 3 },
  { id: "frontier", label: "Frontier", prefixes: ["EF"], lessonId: "frontier", expectedMinNodes: 1 },
];

export type GapKind =
  | "isolated_node"
  | "untaught_concept"
  | "missing_lesson"
  | "missing_route"
  | "thin_domain"
  | "draft_link_uncited";

export interface CoverageGapItem {
  id: string;
  kind: GapKind;
  domainId: KnowledgeDomainId;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  conceptIds: string[];
  relIds?: string[];
}

export interface DomainCoverageRow {
  domain: KnowledgeDomain;
  nodeIds: string[];
  nodeCount: number;
  draftNodeCount: number;
  edgeCount: number;
  draftEdgeCount: number;
  bridgeToCoreCount: number;
  lessonPresent: boolean;
  routeCount: number;
  isolatedNodeIds: string[];
  untaughtNodeIds: string[];
  uncitedDraftRelIds: string[];
  teachingCoveragePct: number;
}

export interface DomainCoverageReport {
  extensionsVersion: string;
  provenanceLabel: string;
  domains: DomainCoverageRow[];
  gaps: CoverageGapItem[];
  summary: {
    domainCount: number;
    draftNodesInDomains: number;
    untaughtConcepts: number;
    isolatedConcepts: number;
    thinDomains: number;
    uncitedDraftLinks: number;
    lessonsPresent: number;
    routesTouchingDomains: number;
  };
}

function domainOfId(id: string): KnowledgeDomain | undefined {
  return KNOWLEDGE_DOMAINS.find((d) => d.prefixes.some((p) => id.startsWith(p)));
}

function isDomainNode(n: KGNode, d: KnowledgeDomain): boolean {
  return d.prefixes.some((p) => n.id.startsWith(p));
}

function edgeTouchesDomain(e: KGEdge, d: KnowledgeDomain): boolean {
  return d.prefixes.some((p) => e.subject_id.startsWith(p) || e.object_id.startsWith(p));
}

function isCoreId(id: string): boolean {
  return !KNOWLEDGE_DOMAINS.some((d) => d.prefixes.some((p) => id.startsWith(p)));
}

function taughtConceptIds(): Set<string> {
  const taught = new Set<string>();
  for (const l of CONTENT.lessons as { nodes?: string[] }[]) {
    for (const id of l.nodes || []) taught.add(id);
  }
  for (const r of CONTENT.routes as { chain?: string[] }[]) {
    for (const id of r.chain || []) taught.add(id);
  }
  return taught;
}

function routesForDomain(d: KnowledgeDomain): { title: string; chain: string[]; draft?: boolean }[] {
  return (CONTENT.routes as { title: string; chain: string[]; draft?: boolean }[]).filter((r) =>
    (r.chain || []).some((id) => d.prefixes.some((p) => id.startsWith(p))),
  );
}

function severityRank(s: CoverageGapItem["severity"]): number {
  return s === "high" ? 0 : s === "medium" ? 1 : 2;
}

/** Build per-domain coverage rows and a prioritised gap queue (candidates only). */
export function domainCoverageReport(): DomainCoverageReport {
  const taught = taughtConceptIds();
  const domains: DomainCoverageRow[] = [];
  const gaps: CoverageGapItem[] = [];

  for (const domain of KNOWLEDGE_DOMAINS) {
    const nodes = KG.nodes.filter((n) => isDomainNode(n, domain));
    const edges = KG.relationships.filter((e) => edgeTouchesDomain(e, domain));
    const draftEdges = edges.filter((e) => e.draft);
    const bridgeToCoreCount = edges.filter(
      (e) =>
        (domain.prefixes.some((p) => e.subject_id.startsWith(p)) && isCoreId(e.object_id)) ||
        (domain.prefixes.some((p) => e.object_id.startsWith(p)) && isCoreId(e.subject_id)),
    ).length;
    const lessonPresent = (CONTENT.lessons as { id: string }[]).some((l) => l.id === domain.lessonId);
    const routes = routesForDomain(domain);
    const isolatedNodeIds = nodes.filter((n) => deg(n.id) === 0).map((n) => n.id);
    const untaughtNodeIds = nodes.filter((n) => !taught.has(n.id)).map((n) => n.id);
    const uncitedDraftRelIds = draftEdges.filter((e) => !edgeRef(e)).map((e) => relId(e));
    const teachingCoveragePct = nodes.length
      ? Math.round(((nodes.length - untaughtNodeIds.length) / nodes.length) * 1000) / 10
      : 0;

    domains.push({
      domain,
      nodeIds: nodes.map((n) => n.id),
      nodeCount: nodes.length,
      draftNodeCount: nodes.filter((n) => n.draft).length,
      edgeCount: edges.length,
      draftEdgeCount: draftEdges.length,
      bridgeToCoreCount,
      lessonPresent,
      routeCount: routes.length,
      isolatedNodeIds,
      untaughtNodeIds,
      uncitedDraftRelIds,
      teachingCoveragePct,
    });

    if (!lessonPresent) {
      gaps.push({
        id: `gap-lesson-${domain.id}`,
        kind: "missing_lesson",
        domainId: domain.id,
        severity: "high",
        title: `Missing lesson for ${domain.label}`,
        detail: `Expected draft lesson id "${domain.lessonId}" in curriculum merges.`,
        conceptIds: nodes.map((n) => n.id).slice(0, 12),
      });
    }
    if (routes.length === 0 && nodes.length > 0) {
      gaps.push({
        id: `gap-route-${domain.id}`,
        kind: "missing_route",
        domainId: domain.id,
        severity: "medium",
        title: `No teaching route touches ${domain.label}`,
        detail: "Add a draft route chain so learners can walk the domain in the atlas.",
        conceptIds: nodes.map((n) => n.id).slice(0, 8),
      });
    }
    if (nodes.length < domain.expectedMinNodes) {
      gaps.push({
        id: `gap-thin-${domain.id}`,
        kind: "thin_domain",
        domainId: domain.id,
        severity: nodes.length === 0 ? "high" : "medium",
        title: `${domain.label} still thin (${nodes.length}/${domain.expectedMinNodes} concepts)`,
        detail: "Draft educational fills welcome — keep evidence_status honest; no fabricated PMIDs.",
        conceptIds: nodes.map((n) => n.id),
      });
    }
    for (const id of isolatedNodeIds) {
      gaps.push({
        id: `gap-isolated-${id}`,
        kind: "isolated_node",
        domainId: domain.id,
        severity: "high",
        title: `Isolated draft concept ${id}`,
        detail: `${byId[id]?.name ?? id} has no links — connect it or remove the orphan.`,
        conceptIds: [id],
      });
    }
    for (const id of untaughtNodeIds.slice(0, 24)) {
      gaps.push({
        id: `gap-untaught-${id}`,
        kind: "untaught_concept",
        domainId: domain.id,
        severity: "low",
        title: `Untaught draft concept ${id}`,
        detail: `${byId[id]?.name ?? id} is in the graph but not yet on a lesson node list or route chain.`,
        conceptIds: [id],
      });
    }
    // Surface a sample of uncited draft links for curator prioritisation (not auto-approve).
    for (const rid of uncitedDraftRelIds.slice(0, 6)) {
      const e = KG.relationships.find((r) => relId(r) === rid);
      if (!e) continue;
      gaps.push({
        id: `gap-uncited-${rid}`,
        kind: "draft_link_uncited",
        domainId: domain.id,
        severity: "low",
        title: `Uncited draft link ${e.subject_id} ${e.relation} ${e.object_id}`,
        detail: "Draft educational edge — queue for literature workflow; do not invent a PMID.",
        conceptIds: [e.subject_id, e.object_id],
        relIds: [rid],
      });
    }
  }

  gaps.sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || a.id.localeCompare(b.id));

  const draftNodesInDomains = domains.reduce((n, d) => n + d.draftNodeCount, 0);
  const untaughtConcepts = domains.reduce((n, d) => n + d.untaughtNodeIds.length, 0);
  const isolatedConcepts = domains.reduce((n, d) => n + d.isolatedNodeIds.length, 0);
  const thinDomains = domains.filter((d) => d.nodeCount < d.domain.expectedMinNodes).length;
  const uncitedDraftLinks = domains.reduce((n, d) => n + d.uncitedDraftRelIds.length, 0);

  return {
    extensionsVersion: GRAPH_EXTENSIONS_VERSION,
    provenanceLabel: EXT_PROVENANCE.label,
    domains,
    gaps,
    summary: {
      domainCount: domains.length,
      draftNodesInDomains,
      untaughtConcepts,
      isolatedConcepts,
      thinDomains,
      uncitedDraftLinks,
      lessonsPresent: domains.filter((d) => d.lessonPresent).length,
      routesTouchingDomains: domains.reduce((n, d) => n + d.routeCount, 0),
    },
  };
}

/** Prioritised queue for coverage work — candidates only, never approvals. */
export function knowledgeGapQueue(limit = 40): CoverageGapItem[] {
  return domainCoverageReport().gaps.slice(0, limit);
}

export function domainById(id: KnowledgeDomainId): KnowledgeDomain {
  return KNOWLEDGE_DOMAINS.find((d) => d.id === id)!;
}

/** Resolve which Phase B domain owns a concept id, if any. */
export function domainForConcept(conceptId: string): KnowledgeDomain | undefined {
  return domainOfId(conceptId);
}
