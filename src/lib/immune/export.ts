/* Export helpers: turn the current graph view or a simulator run into
   downloadable files (Cytoscape JSON, GraphML, CSV). All browser-side. */
import type { KGEdge, KGNode } from "./engine";
import type { SimParams, Interventions, SimPoint } from "./sim";
import { graphReleaseSnapshot } from "./graphRelease";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: (string | number | null | undefined)[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\n");

export function download(filename: string, content: string, mime = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/* ---------- graph ---------- */

export function graphToCytoscape(nodes: KGNode[], links: KGEdge[]) {
  const release = graphReleaseSnapshot();
  return JSON.stringify(
    {
      meta: {
        product: "Immune City",
        graphVersion: release.coreVersion,
        extensionsVersion: release.extensionsVersion,
        snapshot: release.snapshotAt,
        exportedNodeCount: nodes.length,
        exportedLinkCount: links.length,
      },
      elements: {
        nodes: nodes.map((n) => ({ data: { id: n.id, name: n.name, type: n.node_type, description: n.desc, draft: !!n.draft } })),
        edges: links.map((r, i) => ({
          data: {
            id: `e${i}`, source: r.subject_id, target: r.object_id, relation: r.relation,
            mechanism: r.mechanism, confidence: r.confidence, evidence: r.evidence_status,
            location: r.location ?? "", weight: r.weight ?? null, draft: !!r.draft,
          },
        })),
      },
    },
    null,
    2,
  );
}

export function graphToGraphML(nodes: KGNode[], links: KGEdge[]) {
  const keys = [
    `<key id="name" for="all" attr.name="name" attr.type="string"/>`,
    `<key id="type" for="node" attr.name="type" attr.type="string"/>`,
    `<key id="relation" for="edge" attr.name="relation" attr.type="string"/>`,
    `<key id="confidence" for="edge" attr.name="confidence" attr.type="string"/>`,
    `<key id="evidence" for="edge" attr.name="evidence" attr.type="string"/>`,
  ].join("");
  const ns = nodes.map((n) => `<node id="${esc(n.id)}"><data key="name">${esc(n.name)}</data><data key="type">${n.node_type}</data></node>`).join("");
  const es = links
    .map(
      (r, i) =>
        `<edge id="e${i}" source="${esc(r.subject_id)}" target="${esc(r.object_id)}"><data key="relation">${esc(r.relation)}</data><data key="confidence">${r.confidence}</data><data key="evidence">${esc(r.evidence_status)}</data></edge>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns">${keys}<graph edgedefault="directed">${ns}${es}</graph></graphml>`;
}

export function graphToCSV(nodes: KGNode[], links: KGEdge[]) {
  const nodeRows = csv([["id", "name", "type", "description", "draft"], ...nodes.map((n) => [n.id, n.name, n.node_type, n.desc, n.draft ? "yes" : ""])]);
  const linkRows = csv([
    ["subject_id", "relation", "object_id", "mechanism", "confidence", "evidence_status", "location", "weight", "draft"],
    ...links.map((r) => [r.subject_id, r.relation, r.object_id, r.mechanism, r.confidence, r.evidence_status, r.location ?? "", r.weight ?? "", r.draft ? "yes" : ""]),
  ]);
  return { nodes: nodeRows, links: linkRows };
}

/* ---------- simulator ---------- */

export function simToCSV(series: SimPoint[]) {
  return csv([["day", "pathogen", "innate", "cytokines", "adaptive", "regulation", "damage", "exhaustion", "memory"],
    ...series.map((s) => [s.t, s.P, s.N, s.C, s.A, s.R, s.D, s.E, s.M].map((v) => (typeof v === "number" ? +v.toFixed(4) : v)))]);
}

export function simSummaryJSON(params: SimParams, iv: Interventions, summary: Record<string, unknown>) {
  return JSON.stringify({ model: "Immune City infection teaching model (normalised units)", params, interventions: iv, summary }, null, 2);
}
