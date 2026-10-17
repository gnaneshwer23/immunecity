import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";

export const Route = createFileRoute("/dynamics")({
  head: () => seoHead({ title: "Dynamics: tissues, metabolism, genetics — Immune Super Intelligence", description: "Tissue immunology, immunometabolism and immunogenetics: where immunity happens and what it costs.", path: "/dynamics" }),
  component: Dynamics,
});

type Tissue = (typeof CONTENT.tissues)[number];
type Fuel = (typeof CONTENT.metabolism)[number];

function Dynamics() {
  const [tissue, setTissue] = useState<Tissue | null>(null);
  const [fuel, setFuel] = useState<Fuel | null>(null);

  return (
    <div className="page">
      <PageHead
        kicker="Layer 06 · Dynamics"
        title="Where it happens, and what it costs"
        lede="Immunology is tissue-specific and metabolically expensive. The same cell behaves differently in a lymph node and a tumour, and each cell state runs on a different fuel programme."
        stats={[
          { v: CONTENT.tissues.length, l: "COMPARTMENTS" },
          { v: CONTENT.metabolism.length, l: "FUEL PROGRAMMES" },
          { v: CONTENT.genetics.length, l: "ALLELES" },
        ]}
      />
      <section className="section">
        <p className="lede">The infection simulator now has its own layer: <Link to="/simulator">05 · System simulator</Link>.</p>
      </section>
      <section className="section">
        <h2>Tissue immunology</h2>
        <p className="lede">Twelve compartments, what they do for immunity, and the disease that follows when they fail. Select one to open its dossier.</p>
        <div className="dyn-grid">
          {CONTENT.tissues.map((t) => (
            <button
              className={`dyn-tissue${tissue?.name === t.name ? " on" : ""}`}
              key={t.name}
              onClick={() => setTissue(tissue?.name === t.name ? null : t)}
              aria-pressed={tissue?.name === t.name}
            >
              <span className="t-name">{t.name}<span className="t-dot" /></span>
              <span className="t-role">{t.role}</span>
            </button>
          ))}
        </div>
        {tissue ? (
          <div className="dyn-detail" key={tissue.name}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3 style={{ fontSize: "1.15rem" }}>{tissue.name}</h3>
              {byId[tissue.node] ? <NodeChip id={tissue.node} label="Open in graph" /> : null}
            </div>
            <p className="small" style={{ marginTop: 8 }}>{tissue.role}</p>
            <div className="dd-grid">
              <div>
                <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>Resident &amp; trafficking cells</div>
                <div className="row">{tissue.keyCells.map((c: string) => <span className="chip" key={c}>{c}</span>)}</div>
              </div>
              <div>
                <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>When it fails</div>
                <p className="small">{tissue.failure}</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <section className="section">
        <h2>Immunometabolism</h2>
        <p className="lede">Why a T cell cannot divide and stay quiescent on the same fuel, and how the tumour microenvironment starves the wrong cell. Select a cell state.</p>
        <div className="fuel-grid">
          {CONTENT.metabolism.map((m) => (
            <button
              className={`fuel-card${fuel?.state === m.state ? " on" : ""}`}
              key={m.state}
              onClick={() => setFuel(fuel?.state === m.state ? null : m)}
              aria-pressed={fuel?.state === m.state}
            >
              <span className="f-state">{m.state}</span>
              <span className="f-prog" style={{ display: "block" }}>{m.programme}</span>
            </button>
          ))}
        </div>
        {fuel ? (
          <div className="dyn-detail" key={fuel.state}>
            <h3 style={{ fontSize: "1.15rem" }}>{fuel.state}</h3>
            <div className="dd-grid">
              <div>
                <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>Regulators</div>
                <p className="small mono">{fuel.regulators}</p>
              </div>
              <div>
                <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>Therapeutic lever</div>
                <p className="small">{fuel.lever}</p>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>{fuel.why}</p>
          </div>
        ) : null}
      </section>
      <section className="section">
        <h2>Immunogenetics</h2>
        <p className="lede">Alleles that change the threshold, not the mechanism — and one that changed how we screen before prescribing.</p>
        <div className="allele-grid">
          {CONTENT.genetics.map((g) => (
            <article className="allele-card" key={g.allele}>
              <div className="a-id">{g.allele}</div>
              <p className="small" style={{ margin: "8px 0 6px" }}>{g.association}</p>
              <p className="xs muted">{g.note}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
