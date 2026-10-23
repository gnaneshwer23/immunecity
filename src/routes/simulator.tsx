import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT } from "@/data/content";
import { EduBanner, PageHead } from "@/components/immune/ui";
import type { SimParams } from "@/lib/immune/sim";
import { NOT_A_PATIENT_PREDICTION, TEACHING_MODELS } from "@/lib/immune/teachingModels";
import InfectionSim from "@/components/immune/InfectionSim";
import TeachingModelPanel from "@/components/immune/TeachingModelPanel";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/immune/page";

export const Route = createFileRoute("/simulator")({
  head: () => seoHead({ title: "System simulator — Immune Super Intelligence", description: "Run an infection over 30 days: tune pathogen growth, innate and adaptive strength, and add steroids, antibiotics or checkpoint blockade.", path: "/simulator" }),
  component: Simulator,
});

type Preset = { label: string; p: Record<string, number>; note: string };

function Simulator() {
  const presets = (CONTENT["simPresets"] ?? {}) as Record<string, Preset>;
  const [key, setKey] = useState<string>("normal");
  const cur = presets[key];
  return (
    <div className="page">
      <PageHead
        kicker="Investigate · System simulator"
        title="Watch the system run"
        lede="A teaching model in normalised units. Pick a host state, then change the pathogen, the arms of immunity and the treatments, and see which outcome follows."
        stats={[
          { v: Object.keys(presets).length, l: "HOST STATES" },
          { v: 10, l: "PARAMETERS" },
          { v: 4, l: "TREATMENTS" },
        ]}
      />
      <EduBanner>
        Normalised teaching model with hand-set parameters — not calibrated to patient data and not a prediction for any person. {NOT_A_PATIENT_PREDICTION}
      </EduBanner>
      <Section id="host" n={1} title="Choose a host state"
        lede="Each preset sets the starting parameters for a different kind of host. You can change every parameter in the next step.">
        <div className="row" role="group" aria-label="Host states" style={{ flexWrap: "wrap", gap: 8 }}>
          {Object.entries(presets).map(([k, v]) => (
            <Button key={k} variant={k === key ? "default" : "outline"} size="sm" onClick={() => setKey(k)}>{v.label}</Button>
          ))}
        </div>
        {cur ? <p className="small muted" style={{ marginTop: 10 }}>{cur.note}</p> : null}
      </Section>
      <aside className="isi-assumptions" aria-label="Model assumptions">
        <b>Simulated, not observed.</b> Curves come from a simple equation model, not from experiments.
        <ul>
          <li>Units are normalised (0–1 scale), not cell counts or titres.</li>
          <li>Parameters are hand-set for teaching and are not fitted to data.</li>
          <li>Treatments act as single multipliers; real pharmacology, timing and side-effects are not modelled.</li>
          <li>Comparisons show direction of change only — differences in size are not meaningful.</li>
        </ul>
      </aside>
      <Section id="run" n={2} title="Run the infection"
        lede="Tune the pathogen, the arms of immunity and the treatments, then compare runs. Read the curves as direction of change, not magnitude.">
        <InfectionSim key={key} initial={(cur?.p ?? {}) as Partial<SimParams>} />
      </Section>
      <Section id="teaching-models" n={3} title="Other teaching sketches"
        lede="Separate classroom sketches. Each one shows its parameters, units, assumptions, and limits. Values are teaching assumptions. This is not a patient prediction.">
        <div className="grid auto" style={{ gap: 16 }}>
          {TEACHING_MODELS.map((model) => <TeachingModelPanel key={model.id} model={model} />)}
        </div>
      </Section>
    </div>
  );
}
