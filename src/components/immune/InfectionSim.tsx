import { useMemo, useState } from "react";
import { run, type SimParams, type Interventions, type SimPoint } from "@/lib/immune/sim";

const PARAMS: { k: keyof SimParams; label: string; min: number; max: number; step: number }[] = [
  { k: "inoculum", label: "Starting dose of pathogen", min: 0.001, max: 0.3, step: 0.001 },
  { k: "growth", label: "Pathogen growth rate", min: 0.2, max: 3, step: 0.05 },
  { k: "innate", label: "Innate strength (neutrophils)", min: 0, max: 2, step: 0.05 },
  { k: "adaptive", label: "Adaptive strength (T and B cells)", min: 0, max: 2, step: 0.05 },
  { k: "cytokineGain", label: "Cytokine gain", min: 0, max: 3, step: 0.05 },
  { k: "regulation", label: "Regulation (Tregs, IL-10)", min: 0, max: 2, step: 0.05 },
  { k: "memory", label: "Prior memory (vaccination)", min: 0, max: 1, step: 0.01 },
  { k: "lag", label: "Days until adaptive response", min: 1, max: 12, step: 0.5 },
  { k: "exhaustion", label: "T-cell exhaustion tendency (chronic antigen)", min: 0, max: 3, step: 0.05 },
  { k: "rechallenge", label: "Re-infection day (0 = none)", min: 0, max: 28, step: 1 },
];
const DEFAULTS: SimParams = { inoculum: 0.02, growth: 1.2, innate: 1, adaptive: 1, cytokineGain: 1, regulation: 1, memory: 0, lag: 5, exhaustion: 1, rechallenge: 0 };

const TREATS: { k: keyof Interventions; label: string }[] = [
  { k: "antibiotic", label: "Antibiotic / antiviral" },
  { k: "steroid", label: "Steroid" },
  { k: "anticytokine", label: "Anti-cytokine (e.g. anti-IL-6)" },
  { k: "checkpoint", label: "Checkpoint inhibitor" },
];
type TreatState = Record<keyof Interventions, { on: boolean; strength: number; day: number }>;
const TREAT0 = Object.fromEntries(TREATS.map((t) => [t.k, { on: false, strength: 0.6, day: 3 }])) as TreatState;

const SERIES: { k: keyof Omit<SimPoint, "t">; label: string; c: string }[] = [
  { k: "P", label: "Pathogen", c: "var(--t-pathogen)" },
  { k: "N", label: "Innate cells", c: "var(--t-cell)" },
  { k: "C", label: "Cytokines", c: "var(--t-molecule)" },
  { k: "A", label: "Adaptive cells", c: "var(--t-intervention)" },
  { k: "R", label: "Regulation", c: "var(--t-pathway)" },
  { k: "D", label: "Tissue damage", c: "var(--t-disease)" },
  { k: "E", label: "T-cell exhaustion", c: "var(--t-biomarker)" },
  { k: "M", label: "Memory pool", c: "var(--t-trial)" },
];

const OUTCOME = {
  cleared: "Cleared: the infection resolves without severe damage.",
  immunopathology: "Cleared, but the immune response itself caused heavy tissue damage.",
  persistent: "Persistent: the pathogen is held down but not removed.",
  overwhelming: "Overwhelming: the pathogen outgrows the response.",
};

const W = 640, H = 260, PAD = 28;

export default function InfectionSim({ initial }: { initial?: Partial<SimParams> } = {}) {
  const [p, setP] = useState<SimParams>({ ...DEFAULTS, ...initial });
  const [tx, setTx] = useState<TreatState>(TREAT0);
  const { series, summary } = useMemo(() => {
    const iv: Interventions = {};
    TREATS.forEach(({ k }) => { if (tx[k].on) iv[k] = { strength: tx[k].strength, day: tx[k].day }; });
    return run(p, iv);
  }, [p, tx]);
  const [base, setBase] = useState<SimPoint[] | null>(null);
  const yMax = Math.max(1, ...[...series, ...(base ?? [])].map((s) => Math.max(s.P, s.N, s.C, s.A, s.R, s.D, s.E, s.M)));
  const x = (t: number) => PAD + (t / 30) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / yMax) * (H - PAD * 2);

  return (
    <div className="card">
      <p className="small" style={{ marginBottom: 10 }}><strong>{OUTCOME[summary.outcome]}</strong>{summary.clear != null ? ` Cleared on day ${summary.clear.toFixed(1)}.` : ""}</p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Infection course over 30 days">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="currentColor" opacity={0.3} />
        {[0, 5, 10, 15, 20, 25, 30].map((t) => (
          <text key={t} x={x(t)} y={H - 8} fontSize={10} textAnchor="middle" fill="currentColor" opacity={0.6}>day {t}</text>
        ))}
        {SERIES.map((s) => (
          <polyline key={s.k} fill="none" stroke={s.c} strokeWidth={2} points={series.map((pt) => `${x(pt.t)},${y(pt[s.k])}`).join(" ")} />
        ))}
        {base ? SERIES.map((s) => (
          <polyline key={"b" + s.k} fill="none" stroke={s.c} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.6} points={base.map((pt) => `${x(pt.t)},${y(pt[s.k] ?? 0)}`).join(" ")} />
        )) : null}
      </svg>
      <div className="row" style={{ margin: "8px 0 16px" }}>
        {SERIES.map((s) => <span key={s.k} className="xs"><span style={{ display: "inline-block", width: 10, height: 10, background: s.c, borderRadius: 2, marginRight: 4 }} />{s.label}</span>)}
      </div>

      <div className="grid auto">
        <div>
          <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Infection and immunity</h3>
          {PARAMS.map((d) => (
            <label key={d.k} className="xs" style={{ display: "block", marginBottom: 8 }}>
              {d.label} <span className="mono muted">{(p[d.k] ?? 0).toFixed(d.step < 0.01 ? 3 : 2)}</span>
              <input type="range" min={d.min} max={d.max} step={d.step} value={p[d.k] ?? 0} style={{ width: "100%" }}
                onChange={(e) => setP({ ...p, [d.k]: Number(e.target.value) })} />
            </label>
          ))}
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" type="button" onClick={() => { setP(DEFAULTS); setTx(TREAT0); }}>Reset</button>
            <button className="btn" type="button" onClick={() => setBase(base ? null : series)}>{base ? "Clear comparison" : "Pin this run to compare"}</button>
          </div>
          {base ? <p className="xs muted" style={{ marginTop: 6 }}>Dashed lines show the pinned run.</p> : null}
        </div>
        <div>
          <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>Treatments</h3>
          {TREATS.map((t) => {
            const s = tx[t.k];
            const set = (v: Partial<typeof s>) => setTx({ ...tx, [t.k]: { ...s, ...v } });
            return (
              <div key={t.k} style={{ marginBottom: 12 }}>
                <label className="small"><input type="checkbox" checked={s.on} onChange={(e) => set({ on: e.target.checked })} /> {t.label}</label>
                {s.on ? (
                  <>
                    <label className="xs" style={{ display: "block" }}>Strength <span className="mono muted">{s.strength.toFixed(2)}</span>
                      <input type="range" min={0} max={1} step={0.05} value={s.strength} style={{ width: "100%" }} onChange={(e) => set({ strength: Number(e.target.value) })} />
                    </label>
                    <label className="xs" style={{ display: "block" }}>Start on day <span className="mono muted">{s.day}</span>
                      <input type="range" min={0} max={20} step={0.5} value={s.day} style={{ width: "100%" }} onChange={(e) => set({ day: Number(e.target.value) })} />
                    </label>
                  </>
                ) : null}
              </div>
            );
          })}
          <p className="xs muted">A teaching model in normalised units, not a clinical prediction.</p>
        </div>
      </div>
    </div>
  );
}
