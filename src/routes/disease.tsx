import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CONTENT } from "@/data/content";
import { PageHead } from "@/components/immune/ui";

export const Route = createFileRoute("/disease")({
  head: () => ({
    meta: [
      { title: "Disease: hypersensitivity and cancer immunity — Immune Super Intelligence" },
      { name: "description", content: "The four hypersensitivity types and the seven-step cancer immunity cycle, each with its therapeutic lever." },
      { property: "og:title", content: "When mechanism becomes pathology — Immune Super Intelligence" },
      { property: "og:description", content: "Hypersensitivity types and the cancer immunity cycle." },
    ],
  }),
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
      <PageHead
        kicker="Layer 07 · Disease"
        title="When mechanism becomes pathology"
        lede="Four hypersensitivity types describe how a normal effector mechanism turns on the host. The cancer immunity cycle shows the seven steps a tumour must defeat — each one a therapeutic opportunity."
        stats={[
          { v: 4, l: "HYPERSENSITIVITY TYPES" },
          { v: 7, l: "CANCER CYCLE STEPS" },
        ]}
      />
      <nav className="page-toc" aria-label="On this page">
        <a href="#hypersensitivity" className="chip">Hypersensitivity</a>
        <a href="#cancer-cycle" className="chip">Cancer immunity cycle</a>
      </nav>
      <section className="section" id="hypersensitivity">
        <h2>Hypersensitivity</h2>
        <p className="lede">Same immune machinery, four different failure modes distinguished by mechanism and timing. Switch between types to compare.</p>
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
        <div className="dyn-detail" key={hs.type}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ fontSize: "1.15rem" }}>Type {hs.type} — {hs.name}</h3>
            <span className="chip">{hs.test}</span>
          </div>
          <p className="small" style={{ marginTop: 10 }}>{hs.mechanism}</p>
          <div className="dd-grid">
            <div>
              <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>Examples</div>
              <p className="small muted">{hs.examples}</p>
            </div>
            <div>
              <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>Targeted therapy</div>
              <p className="small">{hs.therapy}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="section" id="cancer-cycle">
        <h2>The cancer immunity cycle</h2>
        <p className="lede">Seven steps from antigen release to killing. Tumours escape by breaking one; immunotherapy repairs one. Walk the cycle.</p>
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
        <div className="dyn-detail" key={cycleStep.step}>
          <h3 style={{ fontSize: "1.15rem" }}>Step {cycleStep.step} — {cycleStep.name}</h3>
          <div className="dd-grid">
            <div>
              <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>How it fails</div>
              <p className="small muted">{cycleStep.fail}</p>
            </div>
            <div>
              <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>Therapeutic lever</div>
              <p className="small">{cycleStep.lever}</p>
            </div>
          </div>
          <div className="row" style={{ marginTop: 14, justifyContent: "space-between" }}>
            <button className="btn sm" disabled={step <= 1} onClick={() => setStep(step - 1)}>← Previous step</button>
            <button className="btn sm" disabled={step >= CONTENT.cancerCycle.length} onClick={() => setStep(step + 1)}>Next step →</button>
          </div>
        </div>
      </section>
    </div>
  );
}
