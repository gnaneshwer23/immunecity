import { createFileRoute } from "@tanstack/react-router";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research frontier — Immune City" },
      { name: "description", content: "Open questions in immunology — CAR-T for autoimmunity, EBV and MS, AI-discovered targets — and the curation roadmap." },
      { property: "og:title", content: "Research frontier — Immune City" },
      { property: "og:description", content: "Where immunology is moving, and what the atlas still needs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Research,
});

type Frontier = { title: string; node: string; status: string; text: string };
type Road = { text: string; related: string[] };

function Research() {
  const frontier = (CONTENT["frontier"] ?? []) as Frontier[];
  const roadmap = (CONTENT["roadmap"] ?? []) as Road[];
  return (
    <div className="page">
      <PageHead
        kicker="Layer 12 · Research"
        title="The edge of the map"
        lede="Findings that are reshaping the field, with an honest label for how settled each one is."
        stats={[
          { v: frontier.length, l: "FRONTIER TOPICS" },
          { v: roadmap.length, l: "ROADMAP STEPS" },
        ]}
      />
      <section className="section">
        <h2>Frontier</h2>
        <div className="grid auto">
          {frontier.map((f) => (
            <article className="card frontier-card" data-status={f.status} key={f.title}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="chip">{f.status}</span>
                {byId[f.node] ? <NodeChip id={f.node} label="Graph" /> : null}
              </div>
              <h3 style={{ fontSize: "1.05rem", marginTop: 10 }}>{f.title}</h3>
              <p className="small muted" style={{ marginTop: 8 }}>{f.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Roadmap</h2>
        <p className="lede">What the atlas still needs to become a complete causal model.</p>
        <ol className="small roadmap-tl">
          {roadmap.map((r, i) => (
            <li key={r.text}>
              <span className="rm-num">{String(i + 1).padStart(2, "0")}</span>
              {r.text} {r.related.filter((id) => byId[id]).map((id) => <NodeChip key={id} id={id} />)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
