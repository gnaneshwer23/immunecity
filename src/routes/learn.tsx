import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CONTENT } from "@/data/content";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { LEGACY, type Cell } from "@/data/legacy";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { getLiveProteins, type LiveProtein } from "@/lib/liveData.functions";

/* One signature marker gene per atlas entry, used for the live UniProt lookup. */
const CELL_GENE: Record<string, string> = {
  neutrophil: "MPO", macrophage: "CD68", dendritic: "FLT3", monocyte: "CD14", eosinophil: "IL5RA",
  basophil: "FCER1A", mast: "KIT", nk: "NCAM1", ilc: "IL7R", tcell: "CD3D", cd4: "CD4", cd8: "CD8A",
  treg: "FOXP3", bcell: "CD19", plasma: "SDC1", memory: "IL7R", complement: "C3",
};

export const Route = createFileRoute("/learn")({
  validateSearch: zodValidator(z.object({ cell: fallback(z.string(), "").default("") })),
  head: () => ({
    meta: [
      { title: "Cell atlas — Immune Super Intelligence" },
      { name: "description", content: "The immune residents: metaphors, mechanistic detail, clinical relevance and where each metaphor breaks." },
      { property: "og:title", content: "Cell atlas — Immune Super Intelligence" },
      { property: "og:description", content: "Meet the immune residents and where their metaphors stop being true." },
    ],
  }),
  component: Learn,
});

const LINEAGES = [
  { id: "all", label: "All residents" },
  { id: "myeloid", label: "Myeloid" },
  { id: "lymphoid", label: "Lymphoid" },
  { id: "innate", label: "Innate lymphoid" },
  { id: "bridge", label: "Bridge" },
];

function CellCard({ c, expanded, onToggle, focusNodes }: { c: Cell; expanded: boolean; onToggle: () => void; focusNodes?: string[] | undefined }) {
  const mapped = (focusNodes || []).filter((id) => byId[id]);
  const gene = CELL_GENE[c.id];
  const lessons = CONTENT.lessons.filter((l) => ((l.cells || []) as string[]).includes(c.id));
  const [protein, setProtein] = useState<LiveProtein | null>(null);
  useEffect(() => {
    if (!expanded || !gene) return;
    let on = true;
    getLiveProteins({ data: { genes: [gene] } }).then((r) => { if (on && r?.[gene]?.protein) setProtein(r[gene]); }).catch(() => {});
    return () => { on = false; };
  }, [expanded, gene]);
  return (
    <article className={`cell-card${expanded ? " expanded" : ""}`}>
      <button className="cell-top" onClick={onToggle} aria-expanded={expanded}>
        <span className={`cell-icon lin-${c.lineage}`} dangerouslySetInnerHTML={{ __html: c.icon }} />
        <span style={{ minWidth: 0 }}>
          <h3>{c.name}</h3>
          <span className="tag">{c.tagline}</span>
          <p>{c.summary}</p>
          <span className="cell-meta">
            <span className="chip">{c.lineageLabel}</span>
            {mapped.length ? (
              <span className="chip">{mapped.length} graph {mapped.length === 1 ? "node" : "nodes"}</span>
            ) : (
              <span className="chip chip-gap" title="No direct concept in the curated graph yet">Not yet in graph</span>
            )}
            {lessons.length ? <span className="chip">{lessons.length} {lessons.length === 1 ? "mechanism" : "mechanisms"}</span> : null}
          </span>
        </span>
      </button>
      {expanded ? (
        <div className="cell-body">
          <div>
            <h4>The story</h4>
            <p className="story">{c.story}</p>
            <h4>In one sentence</h4>
            <p className="small">{c.simpleRole}</p>
            <h4>Mechanistic detail</h4>
            <ul>{c.advanced.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
          <div>
            <h4>Clinical relevance</h4>
            <p className="small">{c.clinical}</p>
            <h4>Where the metaphor breaks</h4>
            <p className="small muted">{c.analogyBreak}</p>
            <h4>In the knowledge graph</h4>
            <div className="row">
              {mapped.length ? mapped.map((id) => <NodeChip key={id} id={id} />) : <span className="muted xs">Not yet mapped to a curated graph concept — treat this entry as teaching content only.</span>}
            </div>
            {mapped.length ? (
              <p className="small" style={{ marginTop: 8 }}>
                <Link to="/graph" search={{ focus: mapped[0]! }}>Trace {c.name} in the knowledge graph →</Link>
              </p>
            ) : null}
            <h4>Mechanisms featuring this cell</h4>
            {lessons.length ? (
              <ul>
                {lessons.map((l) => (
                  <li key={l.id}><Link to="/mechanism/$id" params={{ id: l.id }}>{l.title}</Link>{l.draft ? <span className="muted xs"> · draft</span> : null}</li>
                ))}
              </ul>
            ) : (
              <p className="small muted">No mechanism lesson covers this cell yet.</p>
            )}
            {protein ? (
              <>
                <h4>Signature protein (live from UniProt)</h4>
                <p className="small">
                  {protein.url ? <a href={protein.url} target="_blank" rel="noreferrer">{protein.protein}</a> : protein.protein}
                  {protein.size ? ` · ${protein.size} aa` : ""} <span className="mono muted">({protein.gene})</span>
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Learn() {
  const { cell } = Route.useSearch();
  const navigate = useNavigate({ from: "/learn" });
  const [lineage, setLineage] = useState("all");
  const expanded = cell || null;
  const cells = useMemo(() => LEGACY.cells.filter((c) => lineage === "all" || c.lineage === lineage), [lineage]);

  return (
    <div className="page">
      <PageHead
        kicker="Layer 02 · Cell atlas"
        title="The residents"
        lede={`${LEGACY.cells.length} entries — immune cell types and the complement system beside them — each with an everyday metaphor, the mechanistic detail behind it, and where that metaphor stops being true. Expand a card for the full entry.`}
        stats={[
          { v: LEGACY.cells.length, l: "ATLAS ENTRIES" },
          { v: LINEAGES.length - 1, l: "LINEAGES" },
          { v: Object.keys(LEGACY.cellKG).length, l: "GRAPH MAPPINGS" },
        ]}
      />
      <div className="filters">
        {LINEAGES.map((l) => (
          <button key={l.id} className={`chip${lineage === l.id ? " on" : ""}`} onClick={() => setLineage(l.id)}>{l.label}</button>
        ))}
      </div>
      <h2 className="sr-only">Atlas entries</h2>
      <div className="cells">
        {cells.map((c) => (
          <CellCard
            key={c.id}
            c={c}
            expanded={expanded === c.id}
            onToggle={() => navigate({ search: { cell: expanded === c.id ? "" : c.id }, replace: true, resetScroll: false })}
            focusNodes={LEGACY.cellKG[c.id]}
          />
        ))}
      </div>
    </div>
  );
}
