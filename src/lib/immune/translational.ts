/* Mechanism → therapy → patient selection → trial paths, read only from the curated graph.
   Browser-safe and synchronous (SSR). Live registry data is layered on separately and is
   never mixed into these rows. */
import { byId, inn, out, type KGEdge, type KGNode } from "@/lib/immune/engine";

/** Relations by which an intervention acts on its mechanism (target). */
const ACTS_ON = new Set(["targets", "blocks", "binds", "neutralises", "inhibits", "depletes", "suppresses", "rescues_from_exhaustion"]);
/** Relations from an intervention to a disease, grouped by clinical outcome. */
const BENEFIT = new Set(["treats", "prevents"]);
const HARM = new Set(["worsens", "fails_in"]);

export interface TranslationalRow {
  therapy: KGNode;
  /** benefit = treats/prevents; failed = worsens/fails_in for the focal disease. */
  outcome: "benefit" | "failed" | null;
  targets: { node: KGNode; edge: KGEdge }[];
  /** Biomarkers linked to response, eligibility or enrichment for this therapy. */
  selection: { node: KGNode; edge: KGEdge }[];
  trials: KGNode[];
  diseases: KGNode[];
  /** Set when the therapy reaches the focal disease through a drug class it belongs to. */
  viaClass: KGNode | null;
}

const isType = (id: string, t: KGNode["node_type"]) => byId[id]?.node_type === t;

function rowFor(therapyId: string, focalDisease?: string, viaClass: string | null = null): TranslationalRow {
  const therapy = byId[therapyId]!;
  const outs = out[therapyId] ?? [];
  const ins = inn[therapyId] ?? [];
  const outcomeSource = viaClass ?? therapyId;
  const toDisease = focalDisease ? (out[outcomeSource] ?? []).filter((e) => e.object_id === focalDisease) : [];
  const outcome = toDisease.some((e) => BENEFIT.has(e.relation))
    ? "benefit"
    : toDisease.some((e) => HARM.has(e.relation))
      ? "failed"
      : null;
  const trialIds = new Set([
    ...ins.filter((e) => e.relation === "evaluates" && isType(e.subject_id, "TRIAL")).map((e) => e.subject_id),
    ...outs.filter((e) => isType(e.object_id, "TRIAL")).map((e) => e.object_id),
  ]);
  return {
    therapy,
    outcome,
    targets: outs.filter((e) => ACTS_ON.has(e.relation) && byId[e.object_id]).map((edge) => ({ node: byId[edge.object_id]!, edge })),
    selection: ins.filter((e) => isType(e.subject_id, "BIOMARKER")).map((edge) => ({ node: byId[edge.subject_id]!, edge })),
    trials: [...trialIds].map((id) => byId[id]!).sort((a, b) => a.name.localeCompare(b.name)),
    diseases: outs.filter((e) => BENEFIT.has(e.relation) && isType(e.object_id, "DISEASE")).map((e) => byId[e.object_id]!),
    viaClass: viaClass ? byId[viaClass]! : null,
  };
}

/** Rows for a disease, intervention or drug target; empty for concepts with no clinical path. */
export function translationalPath(nodeId: string): TranslationalRow[] {
  const n = byId[nodeId];
  if (!n) return [];
  const ins = inn[nodeId] ?? [];
  let therapyIds: string[] = [];
  if (n.node_type === "DISEASE") {
    therapyIds = ins
      .filter((e) => isType(e.subject_id, "INTERVENTION") && (BENEFIT.has(e.relation) || HARM.has(e.relation)))
      .map((e) => e.subject_id);
  } else if (n.node_type === "INTERVENTION") {
    therapyIds = [nodeId];
  } else if (["MOLECULE", "RECEPTOR", "CELL", "PATHWAY"].includes(n.node_type)) {
    therapyIds = ins.filter((e) => ACTS_ON.has(e.relation) && isType(e.subject_id, "INTERVENTION")).map((e) => e.subject_id);
  }
  const focal = n.node_type === "DISEASE" ? nodeId : undefined;
  const rows: TranslationalRow[] = [];
  const seen = new Set<string>();
  for (const id of therapyIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push(rowFor(id, focal));
    // A drug class stands in for its members: list each member drug too, attributed to the class.
    for (const e of inn[id] ?? []) {
      if (e.relation === "member_of" && isType(e.subject_id, "INTERVENTION") && !seen.has(e.subject_id)) {
        seen.add(e.subject_id);
        rows.push(rowFor(e.subject_id, focal, id));
      }
    }
  }
  const rank = (r: TranslationalRow) => (r.outcome === "failed" ? 1 : 0);
  return rows.sort((a, b) => rank(a) - rank(b) || b.trials.length - a.trials.length || a.therapy.name.localeCompare(b.therapy.name));
}

/** Registry search term: first part of compound names ("Severe COVID-19 / ARDS"), no parentheticals. */
export function registryTerm(name: string): string {
  return name.split("/")[0]!.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

/** What to ask the live registry for this concept; null when a live query would be misleading. */
export function registryQueryFor(node: KGNode): { condition: string | null; intervention: string | null } | null {
  if (node.node_type === "DISEASE") return { condition: registryTerm(node.name), intervention: null };
  if (node.node_type === "INTERVENTION" && !/\(class\)/i.test(node.name)) return { condition: null, intervention: node.name };
  return null;
}
