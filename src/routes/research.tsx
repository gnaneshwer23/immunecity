import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT } from "@/data/content";
import { byId } from "@/lib/immune/engine";
import { GRAPH_CORE_VERSION } from "@/lib/immune/graphRelease";
import { createHypothesisDraft, hypothesisCompleteness, type HypothesisDraft } from "@/lib/research/hypothesisDraft";
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
  const [draft, setDraft] = useState<HypothesisDraft>(() =>
    createHypothesisDraft({ claim: "" }, GRAPH_CORE_VERSION),
  );
  const completeness = hypothesisCompleteness(draft);
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
        <h2>Hypothesis draft (candidate)</h2>
        <p className="lede">Local research artefact template — status is always <b>candidate</b>. Nothing here is written to the curated graph.</p>
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <label className="field">Claim<textarea rows={2} value={draft.claim} onChange={(e) => setDraft({ ...draft, claim: e.target.value })} /></label>
          <label className="field">Mechanism<textarea rows={2} value={draft.mechanism} onChange={(e) => setDraft({ ...draft, mechanism: e.target.value })} /></label>
          <label className="field">Predicted observation<textarea rows={2} value={draft.predictedObservation} onChange={(e) => setDraft({ ...draft, predictedObservation: e.target.value })} /></label>
          <label className="field">Falsification test<textarea rows={2} value={draft.falsificationTest} onChange={(e) => setDraft({ ...draft, falsificationTest: e.target.value })} /></label>
          <label className="field">Alternative / disconfirming path<textarea rows={2} value={draft.alternativePath} onChange={(e) => setDraft({ ...draft, alternativePath: e.target.value })} /></label>
          <label className="field">Supporting concept/relationship IDs (comma-separated)
            <input
              value={draft.supportingIds.join(", ")}
              onChange={(e) => setDraft({ ...draft, supportingIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </label>
          <p className="xs muted">
            Graph v{draft.graphVersion} · status {draft.status} · template {completeness.ok ? "structurally complete" : `missing: ${completeness.missing.join(", ")}`}
          </p>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${draft.hypothesis_id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export candidate JSON
          </button>
        </div>
      </section>
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
