import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ART } from "@/components/immune/explain";
import { byId } from "@/lib/immune/engine";

const topics = [
  { key: "cells", tab: "Immune cells", title: "Start with the cells that shape immunity.", image: ART.cellsArt, alt: "Illustrated immune cells and their surrounding environment", text: "Open a cell concept, then follow its mapped relationships to molecules and disease context. Inspect the evidence on each relationship.", ids: ["C003", "M001"] },
  { key: "mechanisms", tab: "Mechanisms", title: "Follow a signal through the system.", image: ART.moleculesArt, alt: "Scientific illustration of molecular interactions", text: "Explore receptors, signalling pathways and molecular mediators. Direction, context and review status help you interpret each connection.", ids: ["R011", "P001", "M001"] },
  { key: "disease", tab: "Disease context", title: "Put the mechanism in context.", image: ART.diseaseArt, alt: "Illustrated disease and immune-system context", text: "Enter a disease neighbourhood and explore its existing graph connections. A mapped relationship is a starting point for investigation, not a patient-specific conclusion.", ids: ["D001", "D012"] },
] as const;

export default function HomeExploreNavigator() {
  const [selected, setSelected] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const topic = topics[selected]!;
  function move(index: number) { setSelected(index); document.getElementById(`home-topic-${topics[index]!.key}`)?.focus(); }
  return <section id="landing-explore" className="precision-section landing-explore" aria-labelledby="landing-explore-title">
    <div className="landing-section-heading"><div><p className="precision-eyebrow">01 / Find your starting point</p><h2 id="landing-explore-title">Big questions.<br />Clear ways in.</h2></div><p>Choose a starting point and see where the biology connects. The same Atlas, graph and evidence tools stay with you throughout.</p></div>
    <div role="tablist" aria-label="Explore immunology by topic" className="landing-topic-tabs">
      {topics.map((t, i) => <button key={t.key} id={`home-topic-${t.key}`} role="tab" type="button" disabled={!ready} aria-selected={selected === i} tabIndex={selected === i ? 0 : -1} aria-controls="home-topic-panel" onClick={() => setSelected(i)} onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); move((i + 1) % topics.length); }
        if (e.key === "ArrowLeft") { e.preventDefault(); move((i + topics.length - 1) % topics.length); }
        if (e.key === "Home") { e.preventDefault(); move(0); }
        if (e.key === "End") { e.preventDefault(); move(topics.length - 1); }
      }}><span>0{i + 1}</span>{t.tab}<ArrowRight size={16} /></button>)}
    </div>
    <div role="tabpanel" id="home-topic-panel" aria-labelledby={`home-topic-${topic.key}`} className="landing-topic-panel">
      <figure><img src={topic.image} alt={topic.alt} width={1024} height={768} loading="lazy" decoding="async" /><figcaption>Scientific illustration · not a research image</figcaption></figure>
      <div className="landing-topic-copy"><span className="landing-pill">{topic.tab}</span><h3>{topic.title}</h3><p>{topic.text}</p><div className="landing-concept-links">{topic.ids.map((id) => byId[id] ? <Link key={id} to="/atlas/$id" params={{ id }}>{byId[id]!.name}<ArrowRight size={16} /></Link> : null)}</div><Link className="precision-text-link" to="/atlas">Browse the full Atlas <ArrowRight size={16} /></Link></div>
    </div>
  </section>;
}
