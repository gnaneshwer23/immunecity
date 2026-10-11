import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Activity, Plus } from "lucide-react";
import { KG, TYPES, SPINE_DESC, byId, nodesOf, type NodeType } from "@/lib/immune/engine";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { CONTENT } from "@/data/content";
import { NAV_GROUPS } from "@/components/immune/nav";

const GROUP_COLORS = ["--t-cell", "--t-pathway", "--t-intervention", "--t-discovery"];

const SPINE_TYPE: Record<string, NodeType> = {
  TRIGGER: "PATHOGEN", RECOGNITION: "RECEPTOR", SIGNALLING: "PATHWAY", RESPONSE: "CELL",
  CONSEQUENCE: "MOLECULE", FAILURE: "PATHWAY", DISEASE: "DISEASE", BIOMARKER: "BIOMARKER",
  TARGET: "RECEPTOR", THERAPY: "INTERVENTION", TRIAL: "TRIAL", PATIENT: "COMPARTMENT",
  DATA: "DATA", MODEL: "AI_METHOD", DISCOVERY: "DISCOVERY",
};
import { Button } from "@/components/ui/button";
import cellImage from "@/assets/immune-cell.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Immune City — Where Immunology Meets Advanced AI" },
      { name: "description", content: "Educational scientific exploration beta: a curated causal map of immunology, illustrative mechanism walks, and Ask that retrieves graph context — not clinical decision support." },
      { property: "og:title", content: "Immune City — Where Immunology Meets Advanced AI" },
      { property: "og:description", content: "Explore a curated immunology knowledge graph, illustrative mechanisms, and Ask with retrieved context. Educational beta — not clinical CDS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const [activeRoute, setActiveRoute] = useState(0);
  const [spineStep, setSpineStep] = useState<string | null>(null);
  const featured = CONTENT.routes.slice(0, 4);
  const selected = featured[activeRoute];
  const snap = graphReleaseSnapshot();
  const STATS = [
    { v: snap.coreNodes, l: "CORE CONCEPTS" },
    { v: snap.draftNodes, l: "DRAFT CONCEPTS" },
    { v: snap.coreRelationships, l: "CORE RELATIONSHIPS" },
    { v: snap.runtimeRelationships, l: "RUNTIME LINKS" },
  ];
  return (
    <div className="home-page">
      <section className="bio-hero" aria-label="Immune City">
        <img className="bio-hero-image" src={cellImage} alt="Scientific illustration of a cluster of translucent immune cells" width={1536} height={1024} fetchPriority="high" />
        <div className="bio-hero-inner">
          <div className="bio-eyebrow"><span className="status-dot" /> Educational scientific exploration beta</div>
          <h1>Immune City</h1>
          <p className="hero-subtitle">An AI-native map of<br />the immune system.</p>
          <p className="hero-description">Explore a curated causal graph, follow illustrative mechanisms, and ask questions that retrieve graph context — plus reviewed relationship cites when they exist. Not clinical advice or decision support.</p>
          <div className="bio-actions">
            <Button asChild className="bio-primary"><Link to="/graph">Explore the graph <ArrowUpRight /></Link></Button>
            <Button asChild variant="ghost" className="bio-secondary"><Link to="/reasoning">Mechanism reasoning <ArrowRight /></Link></Button>
          </div>
          <div className="bio-hero-note">IMMUNOLOGY · CURATED GRAPH · EDUCATIONAL BETA</div>
        </div>
        <div className="cell-marker">
          <Button asChild variant="ghost" size="icon" className="marker-button" title="Explore cells in the knowledge graph"><Link to="/graph" search={{ focus: KG.nodes.find(n => n.node_type === "CELL")?.id ?? "" }} aria-label="Explore immune cells"><Plus /></Link></Button>
          <span className="cell-marker-label">The cellular world</span>
        </div>
      </section>

      <div className="bio-ticker" aria-hidden="true">
        <div className="bio-ticker-track">
          {[0, 1].map(copy => (
            <Fragment key={copy}>
              {["Signal transduction", "Cytokine cascades", "Clonal expansion", "Immune memory", "Checkpoint blockade", "Tissue residence", "Causal inference", "Curated evidence"].map(t => (
                <span className="bio-ticker-item" key={`${copy}-${t}`}>{t}</span>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <section className="bio-stats" aria-label="Knowledge collection">
        {STATS.map(s => <div className="bio-stat" key={s.l}><b>{s.v}</b><span>{s.l}</span></div>)}
      </section>

      <div className="bio-content">
        <p className="lede" style={{ marginTop: 28, marginBottom: 0, maxWidth: "42rem" }}>
          Release <code>{snap.snapshotAt}</code> · core vs draft counts from the shared graph snapshot · claim-level approved support is still sparse overall · Academy foundation track is a teaching scaffold on Mechanism ·{" "}
          <Link to="/methods">Methods &amp; trust</Link> · <Link to="/evidence">Evidence coverage</Link>
        </p>
        <section className="bio-section" aria-label="Platform pillars">
          <div className="bio-section-heading">
            <div><span className="bio-section-number">00 / PLATFORM</span><h2>Immunology. Evidence. Advanced AI.</h2></div>
            <p>One atlas with three explicit jobs — curated immunology, relationship-level evidence under human review, and Ask that retrieves from the graph rather than inventing the atlas.</p>
          </div>
          <div className="platform-pillars">
            <Link className="platform-pillar" to="/learn">
              <span className="platform-pillar-kicker">Immunology</span>
              <h3>Causal knowledge layer</h3>
              <p>Cells, cytokines, pathways, tissues, disease and therapy — organised on a 15-step scientific spine, with draft extensions labelled separately.</p>
            </Link>
            <Link className="platform-pillar" to="/evidence">
              <span className="platform-pillar-kicker">Evidence</span>
              <h3>Reviewed scientific support</h3>
              <p>Relationship-level citations and coverage honesty — most runtime links are not yet claim-approved; live counts live on Evidence.</p>
            </Link>
            <Link className="platform-pillar" to="/reasoning">
              <span className="platform-pillar-kicker">Advanced AI</span>
              <h3>Graph-retrieved Ask &amp; walks</h3>
              <p>Ask retrieves graph context and reviewed relationship cites when they exist; mechanism walks stay labelled illustrative — not fully evidence-grounded AI.</p>
            </Link>
          </div>
        </section>

        <section className="bio-section">
          <div className="bio-section-heading"><div><span className="bio-section-number">01 / THE CAUSAL SPINE</span><h2>From trigger to discovery.</h2></div><ArrowDown size={24} /></div>
          <p className="lede" style={{ marginTop: -8 }}>The primary scientific journey — fifteen stages from the first signal to discovery feedback.</p>
          <div className="spine-rail" role="tablist" aria-label="Causal spine stages">
            {KG.core_spine.map((step, i) => (
              <button type="button" role="tab" aria-selected={spineStep === step} className={`spine-step${spineStep === step ? " active" : ""}`} key={step} onClick={() => setSpineStep(spineStep === step ? null : step)}>
                <span className="spine-node"><span className="spine-num">{String(i + 1).padStart(2, "0")}</span></span>
                <span className="spine-text"><span className="spine-label">{step}</span><span className="spine-desc">{SPINE_DESC[step] ?? ""}</span></span>
                {i < KG.core_spine.length - 1 && <span className="spine-link"><span className="spine-pulse" style={{ animationDelay: `${i * 0.4}s` }} /></span>}
              </button>
            ))}
            <div className="spine-step spine-loop">
              <span className="spine-node"><span className="spine-num">↺</span></span>
              <span className="spine-text"><span className="spine-label">FEEDBACK</span><span className="spine-desc">Every loop closes</span></span>
            </div>
          </div>
          {spineStep && (() => {
            const type = SPINE_TYPE[spineStep];
            const examples = type ? nodesOf(type).filter(n => !n.draft).slice(0, 6) : [];
            const t = type ? TYPES[type] : null;
            return (
              <div className="spine-detail" role="tabpanel">
                <div className="spine-detail-head">
                  <span className="spine-detail-title"><span className="dot" style={{ background: t ? `var(${t.c})` : undefined }} />{spineStep}</span>
                  <span className="spine-detail-desc">{SPINE_DESC[spineStep] ?? ""}{t ? ` — shown as “${t.label}” concepts in the graph` : ""}</span>
                </div>
                <div className="spine-detail-nodes">
                  {examples.map(n => (
                    <Link key={n.id} className="explore-node" to="/graph" search={{ focus: n.id }}>
                      <span className="dot" style={{ background: t ? `var(${t.c})` : undefined }} />{n.name}
                    </Link>
                  ))}
                  {examples.length === 0 && <span className="spine-detail-empty">No curated concepts at this stage yet.</span>}
                </div>
              </div>
            );
          })()}
        </section>

        <section className="bio-section">
          <div className="bio-section-heading">
            <div><span className="bio-section-number">02 / CONNECT THE DOTS</span><h2>One signal. A chain of consequences.</h2></div>
            <p>Trace a mechanism from its trigger to a treatment and the trial behind it.</p>
          </div>
          <div className="explore-tabs" role="tablist" aria-label="Featured mechanisms">
            {featured.map((r, i) => <Button key={r.title} variant="ghost" className="explore-tab" role="tab" id={`route-tab-${i}`} aria-selected={activeRoute === i} aria-controls="route-panel" onClick={() => setActiveRoute(i)}>{r.title}</Button>)}
          </div>
          {selected && <div className="explore-body" id="route-panel" role="tabpanel" aria-labelledby={`route-tab-${activeRoute}`}>
            <p>{selected.desc}</p>
            <div className="chain-diagram" role="img" aria-label={`Causal chain: ${selected.chain.map((id: string) => byId[id]?.name ?? id).join(" leads to ")}`}>
              {selected.chain.map((id: string, i: number) => {
                const node = byId[id];
                if (!node) return null;
                const t = TYPES[node.node_type];
                return (
                  <Fragment key={id}>
                    {i > 0 && (
                      <svg className="chain-connector" viewBox="0 0 64 40" aria-hidden="true">
                        <line x1="2" y1="20" x2="62" y2="20" className="chain-line" />
                        <path d="M52 13 L62 20 L52 27" className="chain-arrowhead" />
                        <circle r="3.5" className="chain-pulse" style={{ animationDelay: `${i * 0.55}s` }}>
                          <animateMotion dur="2.4s" begin={`${i * 0.55}s`} repeatCount="indefinite" path="M2 20 L62 20" />
                        </circle>
                      </svg>
                    )}
                    <Link className="chain-card" to="/graph" search={{ focus: id }} style={{ ["--cc" as string]: `var(${t.c})` }}>
                      <span className="chain-stage">{String(i + 1).padStart(2, "0")} · {t.label}</span>
                      <span className="chain-name"><span className="dot" style={{ background: `var(${t.c})` }} />{node.name}</span>
                      <span className="chain-bar" />
                    </Link>
                  </Fragment>
                );
              })}
            </div>
            <div className="explore-footer"><span>{selected.chain.length} concepts · Evidence status shown in the graph</span><Link to="/graph" search={{ focus: selected.chain[0] ?? "" }}>Trace this pathway <ArrowUpRight size={15} /></Link></div>
          </div>}
        </section>

        <section className="bio-section">
          <div className="bio-section-heading">
            <div><span className="bio-section-number">03 / EXPLORE THE SYSTEM</span><h2>Different lenses. One immune system.</h2></div>
            <p>Move between cellular biology, clinical mechanisms, and the evidence that connects them.</p>
          </div>
          <div className="bio-groups">
            {NAV_GROUPS.map((g, gi) => (
              <div className="bio-group" key={g.label} style={{ ["--gc" as string]: `var(${GROUP_COLORS[gi]})` }}>
                <div className="bio-group-head"><span className="bio-group-dot" /><span className="bio-group-label">{g.label}</span><span className="bio-group-count">{g.items.filter(l => l.path !== "/").length} layers</span></div>
                <div className="bio-group-items">
                  {g.items.filter(l => l.path !== "/").map(l => (
                    <Link key={l.path} to={l.path} className="bio-layer">
                      <span className="bio-layer-num">{l.n}</span>
                      <span className="bio-layer-body"><h3>{l.title}</h3><p>{l.desc}</p></span>
                      <ArrowUpRight size={18} className="bio-layer-arrow" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bio-banner">
          <div><div className="bio-eyebrow"><Activity size={16} /> INFECTION DYNAMICS</div><h2 style={{ marginTop: 14 }}>Change the conditions. Follow the response.</h2><p>Pathogen growth, immune strength, and treatment timing meet in an interactive model of infection.</p></div>
          <Button asChild className="bio-primary"><Link to="/simulator">Open the simulator <ArrowUpRight /></Link></Button>
        </section>
      </div>
    </div>
  );
}
