import { KG, SEM, deg, edgeRef, lessonsForNode } from "./engine";
import { CONTENT } from "@/data/content";

export function graphHealth() {
  const routed = new Set((CONTENT.routes as { chain: string[] }[]).flatMap((r) => r.chain));
  const isolated = KG.nodes.filter((n) => deg(n.id) === 0).map((n) => n.id);
  const unusedByLessons = KG.nodes.filter((n) => !lessonsForNode[n.id] && !routed.has(n.id)).map((n) => n.id);
  const pairs: Record<string, Set<string>> = {};
  KG.relationships.forEach((r) => { (pairs[`${r.subject_id}|${r.object_id}`] ||= new Set()).add(r.relation); });
  const contradictions = Object.entries(pairs)
    .filter(([, rels]) => { const s = [...rels].map((x) => SEM[x]); return s.includes("+") && s.includes("-"); })
    .map(([k, rels]) => { const [a, b] = k.split("|") as [string, string]; return { a, b, relations: [...rels] }; });
  return {
    edges: KG.relationships.length,
    uncited: KG.relationships.filter((r) => !edgeRef(r)).length,
    isolated, unusedByLessons, contradictions,
    draft: KG.nodes.filter((n) => n.draft).map((n) => n.id),
  };
}
