import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { KG, SPINE_QUESTION, spineLabel } from "@/lib/immune/engine";

type SpineNode = { id: string; name: string; spine_steps?: string[] };

/** Nodes from the KG grouped by the spine steps they participate in. */
export function spineStageIndex(): Record<string, SpineNode[]> {
  const idx: Record<string, SpineNode[]> = {};
  for (const step of KG.core_spine) idx[step] = [];
  for (const n of KG.nodes as unknown as SpineNode[]) {
    for (const s of n.spine_steps ?? []) idx[s]?.push(n);
  }
  return idx;
}

export function CausalSpine({ compact = false }: { compact?: boolean }) {
  const steps = KG.core_spine;
  const index = useMemo(spineStageIndex, []);
  const [active, setActive] = useState<string>(steps[0] ?? "TRIGGER");
  const members = index[active] ?? [];
  const examples = members.slice(0, compact ? 3 : 6);
  const activeNum = steps.indexOf(active) + 1;

  return (
    <div className={`causal-spine${compact ? " is-compact" : ""}`}>
      <ol className="spine-steps" aria-label="Causal spine — 15 stages">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              className="spine-step"
              aria-pressed={s === active}
              onClick={() => setActive(s)}
            >
              <span className="spine-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="spine-label">{spineLabel(s)}</span>
            </button>
          </li>
        ))}
        <li className="spine-loop" aria-label="Discovery feeds new questions back to Trigger">
          <RotateCcw aria-hidden="true" /> <span>Discovery feeds new questions</span>
        </li>
      </ol>

      <div className="spine-detail" aria-live="polite">
        <span className="mkt-section-label">
          Stage {activeNum} · {spineLabel(active)}
        </span>
        <h3>{SPINE_QUESTION[active] ?? spineLabel(active)}</h3>
        {members.length > 0 ? (
          <>
            <p className="spine-count">
              {`${members.length} graph concept${members.length === 1 ? "" : "s"} participate at this stage.`}
            </p>
            <ul className="spine-examples">
              {examples.map((n) => (
                <li key={n.id}>
                  <Link to="/graph" search={{ focus: n.id, sim: "", mode: "" }}>
                    {n.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="spine-count">No curated concepts mapped to this stage yet — an open gap.</p>
        )}
        {examples[0] && (
          <Link className="spine-trace" to="/graph" search={{ focus: examples[0].id, sim: "", mode: "" }}>
            Trace in graph →
          </Link>
        )}
      </div>
    </div>
  );
}
