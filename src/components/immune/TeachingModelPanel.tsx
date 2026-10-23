import { useMemo, useState } from "react";
import { runTeachingModel, type TeachingModel } from "@/lib/immune/teachingModels";

export default function TeachingModelPanel({ model }: { model: TeachingModel }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(model.parameters.map((item) => [item.id, item.value])),
  );
  const [sensitivity, setSensitivity] = useState(1);
  const trace = useMemo(() => runTeachingModel(model, values, sensitivity), [model, values, sensitivity]);
  const last = trace.points[trace.points.length - 1]?.value ?? 0;

  return (
    <article className="card" aria-labelledby={`model-${model.id}`}>
      <h3 id={`model-${model.id}`} style={{ marginTop: 0 }}>{model.title}</h3>
      <p className="small"><strong>{model.disclaimer}</strong></p>
      <p className="small" role="status">
        {trace.readout}: {last.toFixed(2)} {trace.unit}. Sensitivity {sensitivity.toFixed(2)} on {model.sensitivityParamId}.
      </p>
      <div className="grid auto">
        {model.parameters.map((item) => (
          <label key={item.id} className="field">
            {item.label}
            <span className="xs muted"> {item.unit} · {item.origin}</span>
            <input
              type="range"
              min={item.min}
              max={item.max}
              step={item.step}
              value={values[item.id] ?? item.value}
              aria-label={`${item.label} (${item.unit})`}
              onChange={(e) => setValues((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
            />
            <span className="xs mono">{(values[item.id] ?? item.value).toFixed(2)} {item.unit}</span>
          </label>
        ))}
        <label className="field">
          Sensitivity
          <span className="xs muted"> unitless teaching scale · Teaching assumption</span>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.05}
            value={sensitivity}
            aria-label={`Sensitivity for ${model.title}`}
            onChange={(e) => setSensitivity(Number(e.target.value))}
          />
          <span className="xs mono">{sensitivity.toFixed(2)}</span>
        </label>
      </div>
      <h4>Assumptions</h4>
      <ul className="si-list">
        {model.assumptions.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <h4>Limits</h4>
      <ul className="si-list">
        {model.limits.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </article>
  );
}
