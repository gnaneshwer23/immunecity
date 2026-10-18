import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { DetailPanel, Facts, PageToc, Section } from "@/components/immune/page";

const TOC = [
  { id: "tissues", label: "Tissue immunology" },
  { id: "metabolism", label: "Immunometabolism" },
  { id: "genetics", label: "Immunogenetics" },
];

export const Route = createFileRoute("/dynamics")({
  head: () => seoHead({ title: "Dynamics: tissues, metabolism, genetics — Immune Super Intelligence", description: "Tissue immunology, immunometabolism and immunogenetics: where immunity happens and what it costs.", path: "/dynamics" }),
  component: Dynamics,
});

type Tissue = (typeof CONTENT.tissues)[number];
type Fuel = (typeof CONTENT.metabolism)[number];

function Dynamics() {
  /* Open with the first item selected so each explorer shows content
     immediately; selection switches, never gates. */
  const [tissue, setTissue] = useState<Tissue>(CONTENT.tissues[0]!);
  const [fuel, setFuel] = useState<Fuel>(CONTENT.metabolism[0]!);

  return (
    <div className="page">
      <PageHead
        kicker="Explore · Immune dynamics"
        title="Where it happens, and what it costs"
        lede="Immunology is tissue-specific and metabolically expensive. The same cell behaves differently in a lymph node and a tumour, and each cell state runs on a different fuel programme."
        stats={[
          { v: CONTENT.tissues.length, l: "COMPARTMENTS" },
          { v: CONTENT.metabolism.length, l: "FUEL PROGRAMMES" },
          { v: CONTENT.genetics.length, l: "ALLELES" },
        ]}
      />
      <PageToc items={TOC} />
      <Section id="tissues" n={1} title="Tissue immunology"
        lede={`${CONTENT.tissues.length} compartments, what they do for immunity, and the disease that follows when they fail. Select one to open its dossier.`}>
        <div className="dyn-grid" role="group" aria-label="Tissue compartments">
          {CONTENT.tissues.map((t) => (
            <button
              className={`dyn-tissue${tissue.name === t.name ? " on" : ""}`}
              key={t.name}
              onClick={() => setTissue(t)}
              aria-pressed={tissue.name === t.name}
            >
              <span className="t-name">{t.name}<span className="t-dot" /></span>
              <span className="t-role">{t.role}</span>
            </button>
          ))}
        </div>
        <DetailPanel key={tissue.name} eyebrow="Compartment dossier" title={tissue.name}
          action={byId[tissue.node] ? <NodeChip id={tissue.node} label="Open in graph" /> : undefined}>
          <p className="small">{tissue.role}</p>
          <Facts items={[
            { label: "Resident & trafficking cells", children: <div className="row">{tissue.keyCells.map((c: string) => <span className="chip" key={c}>{c}</span>)}</div> },
            { label: "When it fails", children: tissue.failure },
          ]} />
        </DetailPanel>
      </Section>
      <Section id="metabolism" n={2} title="Immunometabolism"
        lede="Why a T cell cannot divide and stay quiescent on the same fuel, and how the tumour microenvironment starves the wrong cell. Select a cell state.">
        <div className="fuel-grid" role="group" aria-label="Cell metabolic states">
          {CONTENT.metabolism.map((m) => (
            <button
              className={`fuel-card${fuel.state === m.state ? " on" : ""}`}
              key={m.state}
              onClick={() => setFuel(m)}
              aria-pressed={fuel.state === m.state}
            >
              <span className="f-state">{m.state}</span>
              <span className="f-prog" style={{ display: "block" }}>{m.programme}</span>
            </button>
          ))}
        </div>
        <DetailPanel key={fuel.state} eyebrow={fuel.programme} title={fuel.state}>
          <p className="small muted">{fuel.why}</p>
          <Facts items={[
            { label: "Regulators", children: <span className="mono">{fuel.regulators}</span> },
            { label: "Therapeutic lever", children: fuel.lever },
          ]} />
        </DetailPanel>
      </Section>
      <Section id="genetics" n={3} title="Immunogenetics"
        lede="Alleles that change the threshold, not the mechanism — and one that changed how we screen before prescribing.">
        <div className="allele-grid">
          {CONTENT.genetics.map((g) => (
            <article className="allele-card" key={g.allele}>
              <div className="a-id">{g.allele}</div>
              <p className="small" style={{ margin: "8px 0 6px" }}>{g.association}</p>
              <p className="xs muted">{g.note}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}
