/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ZoomIn, ZoomOut, Scan, List, Network } from "lucide-react";
import { KG, TYPES, byId, SEM, deg, out, inn, propagate, human, TISSUES, edgeTissues, type NodeType, type Tissue, type KGEdge } from "@/lib/immune/engine";
import { filterGraphSlice } from "@/lib/immune/graphFilters";
import { PageHead, NodeLink } from "./ui";
import GraphNodeDetail from "./GraphNodeDetail";
import GraphEdgeDetail from "./GraphEdgeDetail";
import GraphTable from "./GraphTable";

const DEFAULT_TYPES: NodeType[] = ["CELL", "MOLECULE", "RECEPTOR", "PATHWAY", "DISEASE", "INTERVENTION"];
const ALL_TYPES = KG.node_types;

/** Curated starters from real graph IDs — highest-degree non-draft per family. */
function buildStartingPoints() {
  const families: { label: string; type: NodeType }[] = [
    { label: "Cells", type: "CELL" },
    { label: "Molecules", type: "MOLECULE" },
    { label: "Receptors", type: "RECEPTOR" },
    { label: "Pathways", type: "PATHWAY" },
    { label: "Diseases", type: "DISEASE" },
    { label: "Therapies", type: "INTERVENTION" },
  ];
  return families
    .map(({ label, type }) => {
      const pick = KG.nodes
        .filter((n) => n.node_type === type && !n.draft)
        .sort((a, b) => deg(b.id) - deg(a.id))[0];
      return pick ? { label, id: pick.id, name: pick.name, type } : null;
    })
    .filter(Boolean) as { label: string; id: string; name: string; type: NodeType }[];
}

const STARTING_POINTS = buildStartingPoints();

export default function GraphView({ focusId, simId, modeParam }: { focusId: string | null; simId: string | null; modeParam: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodeSel = useRef<any>(null);
  const linkSel = useRef<any>(null);
  const labelSel = useRef<any>(null);
  const zoomRef = useRef<any>(null);

  const [pick, setPick] = useState(() => {
    const start = focusId && byId[focusId] ? focusId : null;
    return { ids: new Set<string>(start ? [start] : []), detail: start as string | null };
  });

  const togglePick = useCallback((id: string) => {
    setPick((prev) => {
      const ids = new Set(prev.ids);
      let detail = prev.detail;
      if (ids.has(id)) {
        ids.delete(id);
        if (detail === id) detail = ids.size ? Array.from(ids)[ids.size - 1]! : null;
      } else { ids.add(id); detail = id; }
      return { ids, detail };
    });
  }, []);
  const clearPick = useCallback(() => setPick({ ids: new Set(), detail: null }), []);
  const hideDetail = useCallback(() => setPick((p) => ({ ids: p.ids, detail: null })), []);
  const [active, setActive] = useState<Set<NodeType>>(() => new Set(DEFAULT_TYPES));
  const [edgePick, setEdgePick] = useState<KGEdge | null>(null);
  const [mode, setMode] = useState<"activate" | "inhibit">(() => {
    if (modeParam === "activate" || modeParam === "inhibit") return modeParam;
    const n = simId ? byId[simId] : null;
    return n && n.node_type === "INTERVENTION" ? "activate" : "inhibit";
  });
  useEffect(() => { if (modeParam === "activate" || modeParam === "inhibit") setMode(modeParam); }, [modeParam, simId]);

  const [tissue, setTissue] = useState<Tissue | "">("");
  const [evidenceStatus, setEvidenceStatus] = useState("");
  const { nodes, links } = useMemo(() => {
    const ns = KG.nodes.filter((n) => active.has(n.node_type));
    const ids = new Set(ns.map((n) => n.id));
    const ls = KG.relationships.filter((r) => ids.has(r.subject_id) && ids.has(r.object_id) && (!tissue || edgeTissues(r).includes(tissue)));
    const keep = new Set<string>();
    if (focusId && byId[focusId]) keep.add(focusId);
    const sliced = filterGraphSlice(ns, ls, evidenceStatus, keep);
    return {
      nodes: sliced.nodes.map((n) => ({ ...n })) as any[],
      links: sliced.edges.map((r) => ({ ...r, source: r.subject_id, target: r.object_id })) as any[],
    };
  }, [active, tissue, evidenceStatus, focusId]);

  useEffect(() => {
    const stage = stageRef.current;
    const svgEl = svgRef.current;
    if (!stage || !svgEl) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    const sel = d3.select(svgEl);
    sel.selectAll("*").remove();
    sel.attr("viewBox", `0 0 ${width} ${height}`);
    const root = sel.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 3]).on("zoom", (e) => root.attr("transform", e.transform));
    zoomRef.current = zoom;
    sel.call(zoom);

    const link = root.append("g").selectAll("line").data(links).join("line");
    const hit = root.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "transparent").attr("stroke-width", 16).style("cursor", "pointer")
      .attr("pointer-events", "stroke")
      .on("click", (_e: any, d: any) => setEdgePick(d));
    hit.append("title").text((d: any) => `${byId[d.subject_id]?.name ?? d.subject_id} — ${human(d.relation)} → ${byId[d.object_id]?.name ?? d.object_id}. Click for details.`);
    const node = root.append("g").selectAll("circle").data(nodes).join("circle")
      .attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", (d: any) => `${d.name} — ${TYPES[d.node_type as NodeType].label}${d.draft ? " (draft extension, not curated core)" : ""}. Press Enter to add or remove it from the selection.`)
      .style("cursor", "pointer")
      .on("click", (_e: any, d: any) => togglePick(d.id))
      .on("keydown", (e: any, d: any) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePick(d.id); } });
    node.append("title").text((d: any) => `${d.name} · ${TYPES[d.node_type as NodeType].label}${d.draft ? " · draft extension" : ""}`);
    const label = root.append("g").selectAll("text")
      .data(nodes.filter((d) => deg(d.id) >= 3 || d.id === focusId)).join("text")
      .attr("class", "node-label").attr("text-anchor", "middle").attr("dy", -12).text((d: any) => d.name);

    nodeSel.current = node; linkSel.current = link; labelSel.current = label;

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(70).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(16))
      .on("tick", () => {
        link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
        hit.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y).attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
        node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
        label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
      });
    (node as any).call(
      d3.drag()
        .on("start", (e: any, d: any) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e: any, d: any) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e: any, d: any) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }),
    );
    // Detail slot shrinks the stage — keep viewBox + force center in sync without a full rebuild.
    const onResize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (w < 1 || h < 1) return;
      sel.attr("viewBox", `0 0 ${w} ${h}`);
      sim.force("center", d3.forceCenter(w / 2, h / 2));
      sim.alpha(0.15).restart();
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResize) : null;
    ro?.observe(stage);
    return () => { ro?.disconnect(); sim.stop(); };
  }, [nodes, links, focusId, togglePick]);

  useEffect(() => {
    const ns = nodeSel.current, ls = linkSel.current, lb = labelSel.current;
    if (!ns) return;
    const sel = pick.ids;
    const hasSel = sel.size > 0;
    const near = hasSel
      ? new Set([...sel, ...[...sel].flatMap((id) => [...(out[id] || []).map((r) => r.object_id), ...(inn[id] || []).map((r) => r.subject_id)])])
      : null;
    const bothPicked = (l: any) => sel.has(l.subject_id) && sel.has(l.object_id);
    const onePicked = (l: any) => sel.has(l.subject_id) || sel.has(l.object_id);
    const focusedLink = (l: any) => focusId && (l.subject_id === focusId || l.object_id === focusId);

    ns.attr("r", (d: any) => Math.min(14, 4 + Math.sqrt(deg(d.id))))
      .attr("aria-pressed", (d: any) => (sel.has(d.id) ? "true" : "false"))
      .style("fill", (d: any) => `var(${TYPES[d.node_type as NodeType].c})`)
      .style("stroke", (d: any) => (sel.has(d.id) ? "var(--isi-teal)" : d.id === focusId ? "var(--isi-paper)" : d.draft ? "var(--warn)" : "var(--surface)"))
      .style("stroke-width", (d: any) => (sel.has(d.id) ? 3.5 : d.id === focusId ? 3 : d.draft ? 2 : 1.5))
      .style("stroke-dasharray", (d: any) => (d.draft && !sel.has(d.id) ? "3 2" : null))
      .attr("opacity", (d: any) => (!hasSel ? 1 : sel.has(d.id) ? 1 : near!.has(d.id) ? 0.7 : 0.15));
    if (ls) {
      const isPickedEdge = (l: any) => edgePick && l.subject_id === edgePick.subject_id && l.object_id === edgePick.object_id && l.relation === edgePick.relation;
      ls.attr("stroke", (l: any) => (isPickedEdge(l) || onePicked(l) || focusedLink(l) ? "var(--isi-teal)" : SEM[l.relation] === "-" ? "var(--down)" : SEM[l.relation] === "r+" ? "var(--t-pathway)" : "var(--divider)"))
        .attr("stroke-width", (l: any) => (isPickedEdge(l) ? 3.4 : bothPicked(l) ? 2.8 : onePicked(l) || focusedLink(l) ? 2.2 : l.confidence === "low" ? 0.7 : l.evidence_status === "ESTABLISHED" ? 1.4 : 1))
        .attr("stroke-opacity", (l: any) => (isPickedEdge(l) ? 1 : !hasSel ? 0.55 : onePicked(l) ? 0.95 : focusedLink(l) ? 0.9 : 0.06));
    }
    if (lb) lb.attr("opacity", (d: any) => (!hasSel ? 1 : sel.has(d.id) ? 1 : near!.has(d.id) ? 0.55 : 0.18));
  }, [nodes, links, pick, focusId, edgePick]);

  useEffect(() => {
    const n = focusId ? byId[focusId] : null;
    if (!n) return;
    setActive((prev) => (prev.has(n.node_type) ? prev : new Set(prev).add(n.node_type)));
  }, [focusId]);

  useEffect(() => {
    if (!focusId || !byId[focusId]) return;
    setPick((prev) => (prev.ids.has(focusId) && prev.detail === focusId ? prev : { ids: new Set(prev.ids).add(focusId), detail: focusId }));
  }, [focusId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    KG.nodes.forEach((n) => { c[n.node_type] = (c[n.node_type] || 0) + 1; });
    return c;
  }, []);

  const toggle = (t: NodeType) => setActive((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  const zoomBy = (k: number) => { if (svgRef.current && zoomRef.current) (d3.select(svgRef.current).transition().duration(220) as any).call(zoomRef.current.scaleBy, k); };
  /** Frame every drawn concept in the stage (the old "reset zoom" did nothing visible unless you had zoomed). */
  const zoomFit = () => {
    const stage = stageRef.current, svgEl = svgRef.current, zoom = zoomRef.current;
    const pts = (nodeSel.current?.data() as { x?: number; y?: number }[] | undefined)?.filter(
      (d) => Number.isFinite(d.x) && Number.isFinite(d.y),
    );
    if (!stage || !svgEl || !zoom || !pts?.length) return;
    const xs = pts.map((d) => d.x!), ys = pts.map((d) => d.y!);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = 40, w = stage.clientWidth, h = stage.clientHeight;
    const k = Math.max(0.1, Math.min(3, Math.min((w - pad * 2) / Math.max(x1 - x0, 1), (h - pad * 2) / Math.max(y1 - y0, 1))));
    const t = d3.zoomIdentity.translate(w / 2 - ((x0 + x1) / 2) * k, h / 2 - ((y0 + y1) / 2) * k).scale(k);
    (d3.select(svgEl).transition().duration(300) as any).call(zoom.transform, t);
  };

  const [findQ, setFindQ] = useState("");
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    // Prefer list/detail on first paint for narrow viewports — never force a tiny canvas.
    if (window.matchMedia("(max-width: 900px)").matches) setViewMode("list");
  }, []);
  const findHits = useMemo(() => {
    const s = findQ.trim().toLowerCase();
    if (!s) return [];
    return KG.nodes.filter((n) => n.name.toLowerCase().includes(s) || n.id.toLowerCase().includes(s)).slice(0, 8);
  }, [findQ]);
  const findSearched = findQ.trim().length > 0;
  const findGo = useCallback((id: string) => {
    setFindQ("");
    const n = byId[id];
    if (!n) return;
    setActive((prev) => (prev.has(n.node_type) ? prev : new Set(prev).add(n.node_type)));
    setPick((prev) => ({ ids: new Set(prev.ids).add(id), detail: id }));
    setViewMode("graph");
    // centre the view on the node once the simulation has placed it
    window.setTimeout(() => {
      const stage = stageRef.current, svgEl = svgRef.current, zoom = zoomRef.current;
      const datum = (nodeSel.current?.data() as any[] | undefined)?.find((d) => d.id === id);
      if (!stage || !svgEl || !zoom || !datum) return;
      const k = 1.6;
      const t = d3.zoomIdentity.translate(stage.clientWidth / 2 - datum.x * k, stage.clientHeight / 2 - datum.y * k).scale(k);
      (d3.select(svgEl).transition().duration(450) as any).call(zoom.transform, t);
    }, 350);
  }, []);

  const effects = useMemo(() => (!simId || !byId[simId] ? [] : propagate(simId, mode, 4, 0.72, tissue || null).slice(0, 40)), [simId, mode, tissue]);
  const simNode = simId ? byId[simId] : null;

  return (
    <div className="page graph-explorer">
      <PageHead
        kicker="Explore · Knowledge graph"
        title="The causal map"
        lede="Explore typed immune concepts and directional links. Search or pick a starting point, inspect evidence on each relationship, and use the list view on small screens. An empty filter is not a scientific finding."
      />
      <div className="graph-view-toggle" role="group" aria-label="Explorer view">
        <button
          type="button"
          className={`chip${viewMode === "graph" ? " on" : ""}`}
          aria-pressed={viewMode === "graph"}
          onClick={() => setViewMode("graph")}
        >
          <Network size={14} aria-hidden /> Graph
        </button>
        <button
          type="button"
          className={`chip${viewMode === "list" ? " on" : ""}`}
          aria-pressed={viewMode === "list"}
          onClick={() => setViewMode("list")}
        >
          <List size={14} aria-hidden /> List &amp; detail
        </button>
      </div>
      {viewMode === "list" ? (
        <div className="graph-list-mode">
          <GraphTable
            embedded
            evidenceStatus={evidenceStatus}
            onFocusConcept={(id) => {
              findGo(id);
            }}
          />
          {pick.detail && byId[pick.detail] ? (
            <div className="graph-detail"><GraphNodeDetail id={pick.detail} onClose={hideDetail} /></div>
          ) : null}
          {edgePick ? (
            <div className="graph-detail graph-edge-detail"><GraphEdgeDetail edge={edgePick} onClose={() => setEdgePick(null)} /></div>
          ) : null}
        </div>
      ) : null}
      <div className={`graph-layout${viewMode === "list" ? " graph-layout-hidden" : ""}`}>
        <aside className="graph-panel">
          <div className="card">
            <h2 className="graph-panel-h">Find a concept</h2>
            <div className="search graph-find">
              <input
                value={findQ}
                onChange={(e) => setFindQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && findHits[0]) findGo(findHits[0].id); if (e.key === "Escape") setFindQ(""); }}
                placeholder="Type a cell, drug, pathway…"
                aria-label="Find a concept in the graph"
              />
              {findHits.length ? (
                <div className="search-results">
                  {findHits.map((n) => (
                    <button key={n.id} type="button" onClick={() => findGo(n.id)}>
                      <span className="dot" style={{ background: `var(${TYPES[n.node_type].c})` }} />
                      {n.name}
                      <span className="sr-type">{TYPES[n.node_type].label}</span>
                      {n.draft ? <span className="badge rs rs-draft">draft</span> : null}
                    </button>
                  ))}
                </div>
              ) : findSearched ? (
                <p className="graph-find-empty" role="status">
                  No concepts match “{findQ.trim()}”. Try another spelling — this is a search miss, not evidence of absence.
                </p>
              ) : null}
            </div>
            <p className="xs muted" style={{ marginTop: 6 }}>Jumps to one concept, centres it, and opens its links and sources.</p>
          </div>
          {STARTING_POINTS.length ? (
            <div className="card">
              <h2 className="graph-panel-h">Starting points</h2>
              <div className="graph-starters">
                {STARTING_POINTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="graph-starter"
                    onClick={() => findGo(s.id)}
                  >
                    <span className="graph-starter-family">{s.label}</span>
                    <span className="graph-starter-name">
                      <span className="dot" style={{ background: `var(${TYPES[s.type].c})` }} />
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
              <p className="xs muted" style={{ marginTop: 6 }}>
                Real curated concepts (highest connectivity per family) — not decorative placeholders.
              </p>
            </div>
          ) : null}
          <div className="card">
            <h2 className="graph-panel-h">Concept types</h2>
            <div className="type-list">
              {ALL_TYPES.map((t) => (
                <label key={t}>
                  <input type="checkbox" checked={active.has(t)} onChange={() => toggle(t)} />
                  <span className="dot" style={{ background: `var(${TYPES[t].c})` }} />
                  {TYPES[t].label}
                  <span className="cnt">{counts[t] || 0}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="graph-panel-h">Tissue</h2>
            <select value={tissue} onChange={(e) => setTissue(e.target.value as Tissue | "")} aria-label="Limit links to one tissue" style={{ width: "100%" }}>
              <option value="">All tissues</option>
              {TISSUES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="xs muted" style={{ marginTop: 6 }}>Shows only links recorded in that tissue. Perturbations also skip links recorded elsewhere; links with no tissue apply everywhere.</p>
          </div>
          {KG.evidence_statuses.length ? (
            <div className="card">
              <h2 className="graph-panel-h">Evidence status</h2>
              <select value={evidenceStatus} onChange={(e) => setEvidenceStatus(e.target.value)} aria-label="Limit links to an evidence status" style={{ width: "100%" }}>
                <option value="">All evidence statuses</option>
                {KG.evidence_statuses.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
              </select>
              <p className="xs muted" style={{ marginTop: 6 }}>Filters links by the status recorded on the graph edge. This is not Gate C claim review. An empty result is a filter, not evidence of absence.</p>
            </div>
          ) : null}
          <div className="card">
            <h3>Perturbation</h3>
            {simNode && simId ? (
              <>
                <p className="small" style={{ marginBottom: 8 }}>Starting at <NodeLink id={simId} /></p>
                <div className="row" style={{ marginBottom: 10 }}>
                  <button className={`chip${mode === "inhibit" ? " on" : ""}`} onClick={() => setMode("inhibit")}>Block</button>
                  <button className={`chip${mode === "activate" ? " on" : ""}`} onClick={() => setMode("activate")}>Activate</button>
                </div>
                <div className="sim-results">
                  {effects.length ? effects.map((e) => {
                    const n = byId[e.id];
                    if (!n) return null;
                    const up = e.v > 0;
                    return (
                      <div className="effect" key={e.id}>
                        <span className={`arrow ${up ? "up" : "down"}`}>{up ? "↑" : "↓"}</span>
                        <NodeLink id={e.id} label={n.name} />
                        <span className="bar" style={{ width: Math.min(60, Math.abs(e.v) * 60), color: up ? "var(--up)" : "var(--down)" }} />
                        <span className="xs mono muted">{Math.abs(e.v).toFixed(2)}{e.path.some((r) => typeof r.weight === "number") ? " · measured" : ""}</span>
                      </div>
                    );
                  }) : <p className="xs muted">No downstream effects above threshold.</p>}
                </div>
              </>
            ) : (
              <p className="xs muted">Open any node, then choose “Simulate blocking” or “Simulate giving” to trace its ripple effects through the graph.</p>
            )}
          </div>
        </aside>
        <div className="graph-stage" ref={stageRef}>
          <svg ref={svgRef} role="group" aria-label="Knowledge graph. Move between concepts with Tab and toggle one with Enter." />
          <div className="graph-tools">
            <button className="icon-btn" onClick={() => zoomBy(1.4)} aria-label="Zoom in" title="Zoom in"><ZoomIn size={16} /></button>
            <button className="icon-btn" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out" title="Zoom out"><ZoomOut size={16} /></button>
            <button className="icon-btn" onClick={zoomFit} aria-label="Fit graph to view" title="Fit graph to view"><Scan size={16} /></button>
            {pick.ids.size ? <button className="chip on" onClick={clearPick}>{pick.ids.size} selected · clear</button> : null}
          </div>
          {!nodes.length ? (
            <p className="empty" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              {evidenceStatus
                ? `No ${evidenceStatus.toLowerCase()} links among the selected concept types. This is a filter result, not evidence of absence.`
                : "No concept types are selected. Choose at least one type in the panel to draw the graph."}
            </p>
          ) : null}
          <div className="graph-legend">
            {ALL_TYPES.filter((t) => active.has(t)).map((t) => (
              <span key={t}><span className="dot" style={{ background: `var(${TYPES[t].c})` }} />{TYPES[t].label}</span>
            ))}
          </div>
        </div>
        {(pick.detail && byId[pick.detail]) || edgePick ? (
          <div className="graph-detail-slot">
            {pick.detail && byId[pick.detail] ? (
              <div className="graph-detail"><GraphNodeDetail id={pick.detail} onClose={hideDetail} /></div>
            ) : null}
            {edgePick ? (
              <div className="graph-detail graph-edge-detail"><GraphEdgeDetail edge={edgePick} onClose={() => setEdgePick(null)} /></div>
            ) : null}
          </div>
        ) : null}
      </div>
      {viewMode === "graph" ? (
        <div className="graph-a11y-wrap">
          <GraphTable
            evidenceStatus={evidenceStatus}
            onFocusConcept={(id) => {
              findGo(id);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
