import { ART } from "@/components/immune/explain";
import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT } from "@/data/content";
import { PageHead } from "@/components/immune/ui";
import { DetailPanel, Facts, PageToc, Section } from "@/components/immune/page";

const TOC = [
  { id: "hypersensitivity", label: "Hypersensitivity" },
  { id: "cancer-cycle", label: "Cancer immunity cycle" },
];

export const Route = createFileRoute("/disease")({
  head: () => seoHead({ title: "Disease: hypersensitivity and cancer immunity — Immune Super Intelligence", description: "The four hypersensitivity types and the seven-step cancer immunity cycle, each with its therapeutic lever.", path: "/disease" }),
  component: Disease,
});

function Disease() {
  /* Both sections open with a selection so first-time visitors see full
     content immediately; the selectors switch, never gate. */
  const [hsIdx, setHsIdx] = useState(0);
  const [step, setStep] = useState(1);
  const hs = CONTENT.hypersensitivity[hsIdx]!;
  const cycleStep = CONTENT.cancerCycle.find((s) => s.step === step)!;

  return (
    <div className="page">
      <PageHead art={ART.diseaseArt}
        kicker="Explore · Disease explorer"
        title="When mechanism becomes pathology"
        lede="Four hypersensitivity types describe how a normal effector mechanism turns on the host. The cancer immunity cycle shows the seven steps a tumour must defeat — each one a therapeutic opportunity."
        stats={[
          { v: CONTENT.hypersensitivity.length, l: "HYPERSENSITIVITY TYPES" },
          { v: CONTENT.cancerCycle.length, l: "CANCER CYCLE STEPS" },
        ]}
      />
      <PageToc items={TOC} />
      <Section id="hypersensitivity" n={1} title="Hypersensitivity"
        lede="Same immune machinery, four different failure modes distinguished by mechanism and timing. Switch between types to compare.">
        <div className="hs-grid" role="tablist" aria-label="Hypersensitivity types">
          {CONTENT.hypersensitivity.map((h, i) => (
            <button
              className={`hs-card${hsIdx === i ? " on" : ""}`}
              key={h.type}
              role="tab"
              aria-selected={hsIdx === i}
              onClick={() => setHsIdx(i)}
            >
              <span className="hs-num">{h.type}</span>
              <span className="hs-name">{h.name}</span>
            </button>
          ))}
        </div>
        <DetailPanel key={hs.type} eyebrow={`Type ${hs.type}`} title={hs.name} action={<span className="chip">{hs.test}</span>}>
          <p className="small">{hs.mechanism}</p>
          <Facts items={[
            { label: "Examples", children: <span className="muted">{hs.examples}</span> },
            { label: "Targeted therapy", children: hs.therapy },
          ]} />
        </DetailPanel>
      </Section>
      <Section id="cancer-cycle" n={2} title="The cancer immunity cycle"
        lede="Seven steps from antigen release to killing. Tumours escape by breaking one; immunotherapy repairs one. Walk the cycle.">
        <div className="cycle-rail" role="tablist" aria-label="Cancer immunity cycle steps">
          {CONTENT.cancerCycle.map((s) => (
            <button
              className={`cycle-step${step === s.step ? " on" : ""}`}
              key={s.step}
              role="tab"
              aria-selected={step === s.step}
              onClick={() => setStep(s.step)}
            >
              <span className="cs-node">{s.step}</span>
              <span className="cs-name">{s.name}</span>
            </button>
          ))}
        </div>
        <DetailPanel key={cycleStep.step} eyebrow={`Step ${cycleStep.step} of ${CONTENT.cancerCycle.length}`} title={cycleStep.name}>
          <Facts items={[
            { label: "How it fails", children: <span className="muted">{cycleStep.fail}</span> },
            { label: "Therapeutic lever", children: cycleStep.lever },
          ]} />
          <div className="isi-detail-nav">
            <button className="btn sm" disabled={step <= 1} onClick={() => setStep(step - 1)}>← Previous step</button>
            <button className="btn sm" disabled={step >= CONTENT.cancerCycle.length} onClick={() => setStep(step + 1)}>Next step →</button>
          </div>
        </DetailPanel>
      </Section>
    </div>
  );
}
