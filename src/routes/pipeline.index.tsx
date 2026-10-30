import { createFileRoute, Link } from "@tanstack/react-router";
import { ART } from "@/components/immune/explain";
import { PageHead } from "@/components/immune/ui";
import { Section } from "@/components/immune/page";
import { pipelineDiseases } from "@/lib/immune/pipeline";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/pipeline/")({
  head: () =>
    seoHead({
      title: `Disease pipelines: from mechanism to active trials | ${PRODUCT_NAME}`,
      description:
        "For each immune-mediated disease: curated therapies ordered by mechanism, landmark trials with verified registry IDs, and active phase 2–4 trials from ClinicalTrials.gov.",
      path: "/pipeline",
    }),
  component: PipelineIndex,
});

function PipelineIndex() {
  const diseases = pipelineDiseases();
  return (
    <div className="page">
      <PageHead
        art={ART.therapyArt}
        kicker="Research · Disease pipelines"
        title="Where each disease is heading"
        lede="Pick a disease to see the mechanisms its treatments act on, the trials that established them and what is in active clinical testing now. Educational — not treatment advice or a trial-matching service."
        stats={[
          { v: diseases.length, l: "DISEASES" },
          { v: diseases.reduce((n, d) => n + d.therapies, 0), l: "THERAPY LINKS" },
        ]}
      />
      <Section id="diseases" title="Diseases with curated therapies" lede="Counts come from the curated graph. Active-trial numbers load on each disease page from ClinicalTrials.gov.">
        <ul className="isi-pipe-index">
          {diseases.map((d) => (
            <li key={d.node.id}>
              <Link to="/pipeline/$disease" params={{ disease: d.node.id }} className="card isi-pipe-card">
                <b>{d.node.name}</b>
                <span className="xs muted">
                  {d.therapies} therap{d.therapies === 1 ? "y" : "ies"} · {d.trials} landmark trial{d.trials === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
