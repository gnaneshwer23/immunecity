/* Start → perturbation → outcome mechanism workspace.
   Rule-based graph walks only — illustrative unless independently validated. */
import {
  byId, edgeRef, human, out, propagate, relId, shortestPath, SEM,
  type KGEdge, type PathStep,
} from "@/lib/immune/engine";
import { relationshipStatus, STATUS_INFO, type ReviewStatus } from "@/lib/immune/evidenceStatus";

export type PerturbMode = "activate" | "inhibit";

export interface MechanismHop {
  edge: KGEdge;
  relId: string;
  fwd: boolean;
  fromId: string;
  toId: string;
  review: ReviewStatus;
  reviewLabel: string;
  hasSourceLink: boolean;
}

export interface MechanismResult {
  startId: string;
  perturbId: string;
  outcomeId: string;
  mode: PerturbMode;
  pathToOutcome: MechanismHop[] | null;
  pathViaPerturb: MechanismHop[] | null;
  effects: { id: string; v: number; depth: number; path: MechanismHop[] }[];
  outcomeEffect: { id: string; v: number; depth: number; path: MechanismHop[] } | null;
  assumptions: string[];
  gaps: string[];
  illustrative: true;
}

function hopFromStep(step: PathStep, fromId: string): MechanismHop {
  const review = relationshipStatus(step.r, []);
  return {
    edge: step.r,
    relId: relId(step.r),
    fwd: step.fwd,
    fromId,
    toId: step.to,
    review,
    reviewLabel: STATUS_INFO[review].label,
    hasSourceLink: !!edgeRef(step.r),
  };
}

function hopsFromPath(from: string, steps: PathStep[]): MechanismHop[] {
  const hops: MechanismHop[] = [];
  let cur = from;
  for (const s of steps) {
    hops.push(hopFromStep(s, cur));
    cur = s.to;
  }
  return hops;
}

function hopsFromEdges(edges: KGEdge[]): MechanismHop[] {
  return edges.map((edge) => {
    const review = relationshipStatus(edge, []);
    return {
      edge,
      relId: relId(edge),
      fwd: true,
      fromId: edge.subject_id,
      toId: edge.object_id,
      review,
      reviewLabel: STATUS_INFO[review].label,
      hasSourceLink: !!edgeRef(edge),
    };
  });
}

/** Trace start → outcome, apply a perturbation, and report effects / gaps. */
export function reasonMechanism(
  startId: string,
  perturbId: string,
  outcomeId: string,
  mode: PerturbMode = "inhibit",
): MechanismResult | null {
  if (!byId[startId] || !byId[perturbId] || !byId[outcomeId]) return null;
  if (startId === outcomeId && startId === perturbId) return null;

  const rawPath = startId === outcomeId ? [] : shortestPath(startId, outcomeId, false);
  const pathToOutcome = rawPath ? hopsFromPath(startId, rawPath) : null;

  const viaA = shortestPath(startId, perturbId, false);
  const viaB = shortestPath(perturbId, outcomeId, false);
  const pathViaPerturb =
    viaA && viaB ? [...hopsFromPath(startId, viaA), ...hopsFromPath(perturbId, viaB)] : null;

  const effects = propagate(perturbId, mode, 4, 0.72, null).map((e) => ({
    id: e.id,
    v: e.v,
    depth: e.depth,
    path: hopsFromEdges(e.path),
  }));
  const outcomeEffect = effects.find((e) => e.id === outcomeId) ?? null;

  const assumptions = [
    "Walks use curated causal edges and relation polarity (+ / − / reverse+).",
    "Perturbation spread is a simplified signed decay model — not a kinetic simulation.",
    "Evidence badges reflect relationship-level review status in this graph, not new literature search.",
    "Results are illustrative unless validated against independent experimental data.",
  ];

  const gaps: string[] = [];
  if (!pathToOutcome) gaps.push(`No graph path connects ${byId[startId]!.name} to ${byId[outcomeId]!.name}.`);
  if (!pathViaPerturb) gaps.push(`No stitched path runs through the chosen perturbation (${byId[perturbId]!.name}).`);
  if (!outcomeEffect) gaps.push(`Signed propagation from the perturbation does not reach ${byId[outcomeId]!.name} within four hops.`);
  const weak = [...(pathToOutcome ?? []), ...(pathViaPerturb ?? []), ...(outcomeEffect?.path ?? [])]
    .filter((h) => h.review === "draft" || h.review === "unreviewed" || h.edge.evidence_status === "HYPOTHESIS" || h.edge.evidence_status === "EMERGING");
  if (weak.length) {
    gaps.push(`${weak.length} link(s) on the displayed paths are draft, unreviewed, emerging, or hypothetical.`);
  }
  const noSource = [...(pathToOutcome ?? []), ...(pathViaPerturb ?? [])].filter((h) => !h.hasSourceLink);
  if (noSource.length) gaps.push(`${noSource.length} link(s) lack a PMID/DOI provenance link.`);

  // Flag if relation polarity is descriptive-only on the path to outcome
  for (const h of pathToOutcome ?? []) {
    const sem = SEM[h.edge.relation];
    if (sem === "r+" && h.fwd) continue;
    if (!sem) gaps.push(`Relation "${human(h.edge.relation)}" has no polarity semantics — direction is descriptive only.`);
  }

  return {
    startId,
    perturbId,
    outcomeId,
    mode,
    pathToOutcome,
    pathViaPerturb,
    effects: effects.slice(0, 24),
    outcomeEffect,
    assumptions,
    gaps: [...new Set(gaps)],
    illustrative: true,
  };
}

/** Compact label for a hop in UI lists. */
export function hopPhrase(h: MechanismHop): string {
  const s = byId[h.edge.subject_id]?.name ?? h.edge.subject_id;
  const o = byId[h.edge.object_id]?.name ?? h.edge.object_id;
  const rel = human(h.edge.relation);
  return h.fwd ? `${s} ${rel} ${o}` : `${o} ← ${rel} ${s}`;
}

/** Neighbour interventions useful as default perturbation picks. */
export function suggestedPerturbations(startId: string, limit = 8): string[] {
  const ids = new Set<string>();
  for (const e of out[startId] || []) {
    const o = byId[e.object_id];
    if (o && (o.node_type === "INTERVENTION" || o.node_type === "MOLECULE" || o.node_type === "PATHWAY")) ids.add(o.id);
  }
  for (const n of Object.values(byId)) {
    if (ids.size >= limit) break;
    if (n.node_type === "INTERVENTION" && !n.draft) ids.add(n.id);
  }
  return [...ids].slice(0, limit);
}
