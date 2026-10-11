import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import cellImage from "@/assets/immune-cell.jpg";
import { ASK_NAME, CANONICAL_URL, PRODUCT_LINE, PRODUCT_NAME } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: PRODUCT_LINE },
      { name: "description", content: "Educational beta: a curated causal map of immunology, illustrative mechanism walks, and Ask that teaches from graph context with reviewed citations when present." },
      { property: "og:title", content: PRODUCT_LINE },
      { property: "og:description", content: "Explore a curated immunology knowledge graph, illustrative mechanisms, and Ask that educates with references. Educational beta — not patient-specific advice." },
      { property: "og:url", content: CANONICAL_URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: CANONICAL_URL }],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="home-page">
      <section className="bio-hero" aria-label={PRODUCT_NAME}>
        <img className="bio-hero-image" src={cellImage} alt="Scientific illustration of a cluster of translucent immune cells" width={1536} height={1024} fetchPriority="high" />
        <div className="bio-hero-inner">
          <div className="bio-eyebrow"><span className="status-dot" /> Educational scientific exploration beta</div>
          <h1>{PRODUCT_NAME}</h1>
          <p className="hero-subtitle">An AI-native map of<br />the immune system.</p>
          <p className="hero-description">Educating with references from a curated causal graph — not clinical decision support.</p>
          <div className="bio-actions">
            <Button asChild className="bio-primary"><Link to="/overview">Enter the atlas <ArrowUpRight /></Link></Button>
            <Button asChild variant="ghost" className="bio-secondary"><Link to="/reasoning">{ASK_NAME} <ArrowRight /></Link></Button>
          </div>
          <div className="bio-hero-note">IMMUNOLOGY · CURATED GRAPH · EDUCATIONAL BETA</div>
        </div>
      </section>
    </div>
  );
}
