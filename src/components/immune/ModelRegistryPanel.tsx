import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CATEGORY_LABEL,
  MODEL_REGISTRY,
  STATUS_LABEL,
  adapterPromotionGate,
  dryRunAllStubs,
  invokeModelStub,
  isRunnable,
  plannedMolecularStubs,
  registryHonestySummary,
  requestShapePreview,
  validateModelRequest,
  type ModelCategory,
  type ModelInterfaceSpec,
  type ModelInvokeResult,
  type ModelStatus,
} from "@/lib/ai/modelRegistry";

function statusClass(s: ModelStatus) {
  if (s === "implemented") return "res-positive";
  if (s === "interface-only") return "res-safety";
  return "";
}

function ModelCard({
  m,
  expanded,
  onToggle,
  lastResult,
  onDryRun,
}: {
  m: ModelInterfaceSpec;
  expanded: boolean;
  onToggle: () => void;
  lastResult: ModelInvokeResult | null;
  onDryRun: () => void;
}) {
  const preview = useMemo(() => requestShapePreview(m), [m]);
  const runnable = isRunnable(m);
  const shape = useMemo(() => validateModelRequest(m.id, m.exampleRequest), [m]);
  const gate = useMemo(() => adapterPromotionGate(m.id), [m]);

  return (
    <article className="card" data-status={m.status} data-model-id={m.id}>
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span className="chip">{CATEGORY_LABEL[m.category]}</span>
        <span className={`badge rs ${statusClass(m.status)}`} title={m.limitations.join("; ")}>
          {STATUS_LABEL[m.status]}
        </span>
      </div>
      <h3 style={{ fontSize: "1.05rem", marginTop: 10 }}>{m.name}</h3>
      <p className="small muted" style={{ marginTop: 8 }}>{m.intendedUse}</p>
      <p className="xs muted" style={{ marginTop: 8 }}>
        ID <code>{m.id}</code>
        {m.version ? <> · version {m.version}</> : " · no runtime version"}
        {" · "}
        {runnable ? "runnable" : "stub only"}
        {m.maturityNote ? <> · {m.maturityNote}</> : null}
      </p>
      {m.relatedConceptIds && m.relatedConceptIds.length > 0 && (
        <p className="xs muted" style={{ marginTop: 6 }}>
          Related concepts (navigation only): {m.relatedConceptIds.join(", ")}
        </p>
      )}
      <dl className="small" style={{ marginTop: 12, display: "grid", gap: 6 }}>
        <div><dt className="xs muted">Inputs</dt><dd>{m.inputs.join("; ")}</dd></div>
        <div><dt className="xs muted">Outputs (documented)</dt><dd>{m.outputs.join("; ")}</dd></div>
        <div><dt className="xs muted">Limitations</dt><dd>{m.limitations.join("; ")}</dd></div>
      </dl>

      <div className="row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn sm" onClick={onToggle} aria-expanded={expanded}>
          {expanded ? "Hide contract detail" : "Preview request shape"}
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={onDryRun}
          title="Calls the typed stub — never returns scientific predictions"
        >
          Dry-run stub
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <p className="xs muted">Example request (not executed as science)</p>
          <pre className="small" style={{ marginTop: 6, overflow: "auto", maxHeight: 220 }}>{preview}</pre>
          <p className="xs muted" style={{ marginTop: 8 }}>
            Shape check on example: {shape.ok ? "ok" : `issues (${shape.issues.length})`}
          </p>
          {!shape.ok && (
            <ul className="xs" style={{ marginTop: 4 }}>
              {shape.issues.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          <p className="xs muted" style={{ marginTop: 8 }}>Contract fields</p>
          <ul className="small" style={{ marginTop: 4 }}>
            {m.requestFields.map((f) => (
              <li key={f.name}>
                <code>{f.name}</code>
                {f.required ? " · required" : " · optional"}
                {" · "}{f.type}: {f.description}
              </li>
            ))}
          </ul>
          <p className="xs muted" style={{ marginTop: 8 }}>Documented outputs (not produced)</p>
          <ul className="small" style={{ marginTop: 4 }}>
            {m.outputFields.map((f) => (
              <li key={f.name}>
                <code>{f.name}</code>
                {" · "}{f.type}: {f.description}
              </li>
            ))}
          </ul>
          <p className="xs muted" style={{ marginTop: 8 }}>
            Promotion gate: canPromote={String(gate.canPromote)}
          </p>
          <ul className="xs muted" style={{ marginTop: 4 }}>
            {gate.checklist.map((c) => (
              <li key={c.id}>{c.met ? "✓" : "○"} {c.label}</li>
            ))}
          </ul>
        </div>
      )}

      {lastResult && (
        <div
          className="small"
          role="status"
          style={{ marginTop: 12, padding: "8px 10px", border: "1px solid var(--line, #ccc)" }}
          data-kind={lastResult.kind}
        >
          <strong>{lastResult.kind}</strong>
          {" · "}scientificClaimAllowed={String(lastResult.scientificClaimAllowed)}
          <p className="xs muted" style={{ marginTop: 4 }}>{lastResult.reason}</p>
        </div>
      )}
    </article>
  );
}

/** Honesty panel: planned adapters only unless status === implemented. */
export default function ModelRegistryPanel({ compact = false }: { compact?: boolean }) {
  const summary = useMemo(() => registryHonestySummary(), []);
  const molecular = useMemo(() => plannedMolecularStubs(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ModelInvokeResult>>({});
  const [batchNote, setBatchNote] = useState<string | null>(null);
  const [category, setCategory] = useState<ModelCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ModelStatus | "all">("all");

  const visible = useMemo(
    () =>
      MODEL_REGISTRY.filter(
        (m) =>
          (category === "all" || m.category === category) &&
          (statusFilter === "all" || m.status === statusFilter),
      ),
    [category, statusFilter],
  );

  const runStub = (id: string) => {
    const model = MODEL_REGISTRY.find((m) => m.id === id);
    const shape = validateModelRequest(id, model?.exampleRequest);
    const res = invokeModelStub(id, model?.exampleRequest);
    setResults((prev) => ({ ...prev, [id]: res }));
    setBatchNote(
      shape.ok
        ? null
        : `Shape issues on ${id}: ${shape.issues.join("; ")} (stub still refused scientific output).`,
    );
  };

  const runAll = () => {
    const all = dryRunAllStubs();
    const next: Record<string, ModelInvokeResult> = {};
    for (const r of all) next[r.modelId] = r;
    setResults(next);
    const refused = all.filter((r) => r.kind === "not_available").length;
    setBatchNote(
      `Dry-ran ${all.length} adapters: ${refused} returned not_available (no scientific claims). ` +
        `${molecular.length} planned molecular stub(s) included.`,
    );
  };

  return (
    <div className="model-registry">
      {!compact && (
        <p className="lede">
          Advanced analysis adapters are modular <b>contracts</b> for omics, structure, pMHC/epitope, genomics, and agents.
          {" "}
          {summary.implemented === 0
            ? "None are live predictors in this build (implementedModels() is empty) — dry-run always returns typed not_available and never invents scores."
            : `${summary.implemented} adapter(s) marked implemented.`}
          {" "}Also documented on <Link to="/methods">Methods &amp; trust</Link>.
        </p>
      )}
      {compact && (
        <p className="small muted" style={{ marginBottom: 10 }}>
          {summary.total} interface contracts · {summary.implemented} live/implemented ·{" "}
          <Link to="/research" hash="model-registry">Full registry on Research</Link>
        </p>
      )}

      <p className="xs muted" style={{ marginBottom: 10 }}>
        Honesty: {summary.interfaceOnly} interface-only · {summary.planned} planned · {summary.implemented} implemented
        {molecular.length ? ` · ${molecular.length} molecular stubs (planned · not live)` : ""}
        {" · badges say “not live” until a real adapter ships"}
      </p>

      {!compact && (
        <div className="row" style={{ marginBottom: 12, gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="btn sm" onClick={runAll}>
            Dry-run all stubs
          </button>
          <label className="xs muted">
            Category{" "}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ModelCategory | "all")}
            >
              <option value="all">all</option>
              {(Object.keys(CATEGORY_LABEL) as ModelCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </label>
          <label className="xs muted">
            Status{" "}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ModelStatus | "all")}
            >
              <option value="all">all</option>
              <option value="planned">planned</option>
              <option value="interface-only">interface-only</option>
              <option value="implemented">implemented</option>
            </select>
          </label>
          {batchNote && <span className="small muted" role="status">{batchNote}</span>}
        </div>
      )}

      <div className="grid auto">
        {visible.map((m) => (
          <ModelCard
            key={m.id}
            m={m}
            expanded={expandedId === m.id}
            onToggle={() => setExpandedId((cur) => (cur === m.id ? null : m.id))}
            lastResult={results[m.id] ?? null}
            onDryRun={() => runStub(m.id)}
          />
        ))}
      </div>
      {visible.length === 0 && (
        <p className="small muted">No adapters match the current filters.</p>
      )}
    </div>
  );
}
