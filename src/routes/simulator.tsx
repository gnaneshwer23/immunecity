import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT } from "@/data/content";
import { EduBanner, PageHead } from "@/components/immune/ui";
import type { SimParams } from "@/lib/immune/sim";
import InfectionSim from "@/components/immune/InfectionSim";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "System simulator — Immune Super Intelligence" },
      { name: "description", content: "Run an infection over 30 days: tune pathogen growth, innate and adaptive strength, and add steroids, antibiotics or checkpoint blockade." },
      { property: "og:title", content: "System simulator — Immune Super Intelligence" },
      { property: "og:description", content: "A teaching model of infection, immunity, damage and treatment over time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
        kicker="Layer 05 · System simulator"
        title="Watch the system run"
        lede="A teaching model, in normalised units. Pick a host state, then change the pathogen, the arms of immunity and the treatments, and see which outcome follows."
        stats={[
          { v: Object.keys(presets).length, l: "HOST STATES" },
          { v: 10, l: "PARAMETERS" },
          { v: 4, l: "TREATMENTS" },
        ]}
      />
      <EduBanner>Normalised teaching model with hand-set parameters — not calibrated to patient data and not a prediction for any person.</EduBanner>
      <section className="section">
        <h2>Host states</h2>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {Object.entries(presets).map(([k, v]) => (
            <Button key={k} variant={k === key ? "default" : "outline"} size="sm" onClick={() => setKey(k)}>{v.label}</Button>
          ))}
        </div>
        {cur ? <p className="small muted" style={{ marginTop: 10 }}>{cur.note}</p> : null}
      </section>
      <section className="section">
        <InfectionSim key={key} initial={(cur?.p ?? {}) as Partial<SimParams>} />
      </section>
    </div>
  );
}
