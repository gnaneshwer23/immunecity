import { createFileRoute, Link } from "@tanstack/react-router";
import { ART } from "@/components/immune/explain";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "atlas", label: "Atlas" },
  { id: "graph", label: "Graph" },
  { id: "mechanisms", label: "Mechanisms" },
  { id: "biology", label: "Biology explorers" },
  { id: "overview", label: "Overview" },
];

const BIOLOGY = [
  { to: "/dynamics" as const, title: "Immune dynamics", desc: "Tissues, metabolism and genetics as connected context." },
  { to: "/disease" as const, title: "Disease explorer", desc: "Hypersensitivity and the cancer immunity cycle." },
  { to: "/therapy" as const, title: "Therapy explorer", desc: "Interventions, targets and linked trials." },
  { to: "/learn" as const, title: "Cell atlas", desc: "Immune cells, roles and where metaphors break." },
] as const;

export const Route = createFileRoute("/explore")({
  head: () =>
    seoHead({
      title: `Explore the immune system | ${PRODUCT_NAME}`,
      description:
        "Explore curated immunology concepts, the knowledge graph, mechanisms and biological explorers. Educational resource — not clinical decision support.",
      path: "/explore",
    }),
  component: ExploreHub,
});

function ExploreHub() {
  return (
    <div className="page">
      <PageHead
        art={ART.moleculesArt}
        kicker="Explore"
        title="Explore immune biology as a connected system."
        lede="Start from concepts, the knowledge graph, or a mechanism cascade. Every path stays inside the curated map — review status is labelled; nothing here invents science."
      />
      <PageToc items={TOC} />

      <Section
        id="atlas"
        title="Knowledge atlas"
        lede="One page per concept across domains — cells, molecules, pathways, disease and therapy."
      >
        <p>
          <Link className="btn primary" to="/atlas">
            Open the Knowledge Atlas
          </Link>
        </p>
      </Section>

      <Section
        id="graph"
        title="Knowledge graph"
        lede="Typed concepts and directional causal links you can inspect hop by hop."
      >
        <p>
          <Link className="btn primary" to="/graph">
            Open the knowledge graph
          </Link>
        </p>
      </Section>

      <Section
        id="mechanisms"
        title="Mechanisms and pathways"
        lede="Step-by-step cascades with perturbations — teaching walks, not clinical protocols."
      >
        <p>
          <Link className="btn primary" to="/mechanism">
            Browse mechanisms
          </Link>
        </p>
      </Section>

      <Section id="biology" title="Biology explorers" lede="Focused views for dynamics, disease, therapy and cells.">
        <ul className="isi-library-list">
          {BIOLOGY.map((item) => (
            <li key={item.to}>
              <Link to={item.to}>
                <strong>{item.title}</strong>
              </Link>
              <p className="isi-radar-why">{item.desc}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="overview"
        title="System overview"
        lede="Causal spine and the twelve science layers — the model behind Explore, not a separate product."
      >
        <p>
          <Link className="btn" to="/overview">
            See the twelve layers
          </Link>
          {" · "}
          <Link to="/ask">Ask Immune</Link>
          {" · "}
          <Link to="/academy">Academy</Link>
        </p>
      </Section>
    </div>
  );
}
