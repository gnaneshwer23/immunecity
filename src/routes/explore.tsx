import { createFileRoute, Link } from "@tanstack/react-router";
import { ART } from "@/components/immune/explain";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { byId } from "@/lib/immune/engine";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "path", label: "Suggested path" },
  { id: "atlas", label: "Atlas" },
  { id: "graph", label: "Graph" },
  { id: "mechanisms", label: "Mechanisms" },
  { id: "biology", label: "Related explorers" },
  { id: "overview", label: "Overview" },
];

/** Curated exemplars already in the KG — never invent science. */
const FEATURED = ["M001", "C003", "P001", "D001", "I001"] as const;

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
  const snap = graphReleaseSnapshot();
  const featured = FEATURED.map((id) => byId[id]).filter(Boolean);

  return (
    <div className="page">
      <PageHead
        art={ART.moleculesArt}
        kicker="Explore"
        title="Explore immune biology as a connected system."
        lede="Start from concepts, the knowledge graph, or a mechanism cascade. Every path stays inside the curated map — review status is labelled; nothing here invents science."
        stats={[
          { v: String(snap.coreNodes), l: "CORE CONCEPTS" },
          { v: String(snap.coreRelationships), l: "CORE LINKS" },
          { v: snap.coreVersion, l: "GRAPH VERSION" },
        ]}
      />
      <PageToc items={TOC} />

      <Section
        id="path"
        title="One journey through the map"
        lede="Atlas → graph neighbours → mechanism lesson. Related explorers sit below the spine."
      >
        <ol className="isi-ladder" aria-label="Suggested Explore path">
          <li>
            <strong>Atlas</strong> — open a concept page for cells, molecules, pathways, disease or therapy.
          </li>
          <li>
            <strong>Graph</strong> — inspect directional causal links hop by hop.
          </li>
          <li>
            <strong>Mechanisms</strong> — walk a teaching cascade (for example Foundation TLR4).
          </li>
        </ol>
        <p className="isi-tool-limit" style={{ marginTop: 12 }}>
          <Link className="btn primary" to="/atlas">
            Start in the Knowledge Atlas
          </Link>
          {" · "}
          <Link to="/ask">Ask Immune</Link>
        </p>
      </Section>

      <Section
        id="atlas"
        title="Knowledge atlas"
        lede="One page per concept across domains — cells, molecules, pathways, disease and therapy."
      >
        {featured.length ? (
          <p className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 12 }} aria-label="Featured concepts">
            {featured.map((n) => (
              <NodeChip key={n!.id} id={n!.id} />
            ))}
          </p>
        ) : null}
        <p>
          <Link className="btn primary" to="/atlas">
            Open the Knowledge Atlas
          </Link>
          {" · "}
          <Link to="/atlas">Browse all concepts</Link>
        </p>
      </Section>

      <Section
        id="graph"
        title="Knowledge graph"
        lede="Typed concepts and directional causal links you can inspect hop by hop — the same map behind Ask and Research."
      >
        <p>
          <Link className="btn primary" to="/graph" search={{ focus: "M001" }}>
            Open the knowledge graph
          </Link>
          {" · "}
          <Link to="/graph" search={{ focus: "M001" }}>
            Example focus: TNF
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
          {" · "}
          <Link to="/mechanism/$id" params={{ id: "tlr4" }}>
            Foundation: TLR4 → NF-κB
          </Link>
        </p>
      </Section>

      <Section id="biology" title="Related explorers" lede="Focused views for dynamics, disease, therapy and cells.">
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
        title="Why the map is layered"
        lede="The twelve science layers are the model behind Explore — not a separate product."
      >
        <p>
          <Link className="btn" to="/overview">
            See the twelve layers
          </Link>
        </p>
      </Section>
    </div>
  );
}
