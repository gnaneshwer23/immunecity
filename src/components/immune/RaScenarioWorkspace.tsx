import { lazy, Suspense, useEffect, useState } from "react";
import { loadAcceptedPracticePacket, loadAdjudicationBundle } from "@/lib/hsi/annotationPracticeStorage";
import styles from "./ContextAnnotationPractice.module.css";

const Investigations = lazy(() => import("@/components/immune/InvestigationPanel"));
const ContextAnnotationPractice = lazy(() => import("@/components/immune/ContextAnnotationPractice"));
const ContextAnnotationAdjudication = lazy(() => import("@/components/immune/ContextAnnotationAdjudication"));

type Step = "investigate" | "label_a" | "label_b" | "adjudicate" | "done";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "investigate", label: "1. Investigate" },
  { id: "label_a", label: "2. Label A" },
  { id: "label_b", label: "3. Label B" },
  { id: "adjudicate", label: "4. Adjudicate" },
  { id: "done", label: "5. Export ready" },
];

function detectStep(): Step {
  const a = loadAcceptedPracticePacket("annotator_a");
  const b = loadAcceptedPracticePacket("annotator_b");
  const adj = loadAdjudicationBundle();
  if (adj?.records.length && adj.records.every((record) => record.finalTags !== null)) return "done";
  if (a && b) return "adjudicate";
  if (a) return "label_b";
  return "investigate";
}

export default function RaScenarioWorkspace() {
  const [step, setStep] = useState<Step>("investigate");

  useEffect(() => {
    setStep(detectStep());
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="ra-scenario-heading">
      <h2 id="ra-scenario-heading">RA anti-TNF research scenario</h2>
      <p className={styles.lede}>
        End-to-end practice path: open a research investigation on the working-set corpus, label passages as Annotator A
        and B (double-blind), adjudicate disagreements, then export. Workflow acceptance is not Gate C. Practice labels
        never enter frozen evaluation.
      </p>

      <nav className={styles.stepper} aria-label="Scenario steps">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={step === item.id ? "step" : undefined}
            className={step === item.id ? styles.stepDone : undefined}
            onClick={() => setStep(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <Suspense fallback={<p role="status">Loading scenario step…</p>}>
        {step === "investigate" ? (
          <div>
            <Investigations />
            <div className={styles.actions}>
              <button type="button" onClick={() => setStep("label_a")}>
                Continue to Annotator A labelling
              </button>
            </div>
          </div>
        ) : null}
        {step === "label_a" ? (
          <ContextAnnotationPractice
            fixedSlot="annotator_a"
            onSubmitted={() => setStep("label_b")}
          />
        ) : null}
        {step === "label_b" ? (
          <ContextAnnotationPractice
            fixedSlot="annotator_b"
            onSubmitted={() => setStep("adjudicate")}
          />
        ) : null}
        {step === "adjudicate" ? <ContextAnnotationAdjudication onComplete={() => setStep("done")} /> : null}
        {step === "done" ? (
          <article className={styles.card}>
            <h3>Scenario complete (practice)</h3>
            <p className={styles.lede}>
              Investigation review, dual practice labels, and adjudication exports are available in this browser. Nothing
              here approved scientific claims, cleared real PMIDs, or promoted rows into evaluation_frozen.
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={() => setStep("investigate")}>
                Revisit investigation
              </button>
              <button type="button" className={styles.secondary} onClick={() => setStep("adjudicate")}>
                Revisit adjudication export
              </button>
            </div>
          </article>
        ) : null}
      </Suspense>
    </section>
  );
}
