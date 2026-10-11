import { MODEL_REGISTRY, type ModelInterfaceSpec, type ModelStatus } from "@/lib/ai/modelRegistry";

const STATUS_LABEL: Record<ModelStatus, string> = {
  planned: "Planned interface",
  "interface-only": "Interface only",
  implemented: "Implemented",
};

function statusClass(s: ModelStatus) {
  if (s === "implemented") return "res-positive";
  if (s === "interface-only") return "res-safety";
  return "";
}

function ModelCard({ m }: { m: ModelInterfaceSpec }) {
  return (
    <article className="card" data-status={m.status}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span className="chip">{m.category}</span>
        <span className={`badge rs ${statusClass(m.status)}`}>{STATUS_LABEL[m.status]}</span>
      </div>
      <h3 style={{ fontSize: "1.05rem", marginTop: 10 }}>{m.name}</h3>
      <p className="small muted" style={{ marginTop: 8 }}>{m.intendedUse}</p>
      <p className="xs muted" style={{ marginTop: 8 }}>
        ID <code>{m.id}</code>
        {m.version ? <> · version {m.version}</> : " · no runtime version"}
      </p>
      <dl className="small" style={{ marginTop: 12, display: "grid", gap: 6 }}>
        <div><dt className="xs muted">Inputs</dt><dd>{m.inputs.join("; ")}</dd></div>
        <div><dt className="xs muted">Outputs</dt><dd>{m.outputs.join("; ")}</dd></div>
        <div><dt className="xs muted">Limitations</dt><dd>{m.limitations.join("; ")}</dd></div>
      </dl>
    </article>
  );
}

/** Honesty panel: planned adapters only unless status === implemented. */
export default function ModelRegistryPanel({ compact = false }: { compact?: boolean }) {
  const implemented = MODEL_REGISTRY.filter((m) => m.status === "implemented");
  return (
    <div className="model-registry">
      {!compact && (
        <p className="lede">
          Advanced analysis adapters are documented as interfaces.{" "}
          {implemented.length === 0
            ? "None are wired into production inference in this build."
            : `${implemented.length} adapter(s) marked implemented.`}
        </p>
      )}
      <div className="grid auto">
        {MODEL_REGISTRY.map((m) => (
          <ModelCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}
