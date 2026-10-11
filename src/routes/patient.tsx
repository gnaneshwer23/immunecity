import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { EXT_BIOMARKERS, EXT_FLAG_LABELS } from "@/data/extensions";
import { byId } from "@/lib/immune/engine";
import { EduBanner, PageHead, NodeChip } from "@/components/immune/ui";
import { DetailToggle } from "@/components/immune/InlineDetail";
import TherapyDetail from "@/components/immune/TherapyDetail";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "Patient: precision immunology — Immune City" },
      { name: "description", content: "Select patient features and see which therapies the mechanism supports or cautions against, rule by rule." },
      { property: "og:title", content: "Precision immunology — Immune City" },
      { property: "og:description", content: "Rank immunotherapies against comorbidities, biomarkers and clinical state." },
    ],
  }),
  component: Patient,
});

const GROUPS = ["Comorbidity", "Biomarker", "Clinical state", "Life stage & immune status"];
type Rule = (typeof CONTENT.rules)[number];

const RULES_BY_DRUG: Record<string, Rule[]> = {};
CONTENT.rules.forEach((r) => r.drugs.forEach((d: string) => (RULES_BY_DRUG[d] ||= []).push(r)));
const CANDIDATES = Object.keys(RULES_BY_DRUG).filter((id) => byId[id]);

function Patient() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bio, setBio] = useState<Record<string, number>>(() => Object.fromEntries(EXT_BIOMARKERS.map((b) => [b.id, b.def])));
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  /* Slider values become rule flags at their thresholds, so every score change
     names the biomarker and cut-off that fired. */
  const derived = useMemo(() => {
    const flags = new Set<string>();
    const labels: string[] = [];
    EXT_BIOMARKERS.forEach((b) => {
      const v = bio[b.id] ?? b.def;
      b.thresholds.forEach((t) => {
        if ((t.above != null && v >= t.above) || (t.below != null && v < t.below)) { flags.add(t.flag); labels.push(t.label); }
      });
    });
    return { flags, labels };
  }, [bio]);

  const effective = useMemo(() => new Set([...selected, ...derived.flags]), [selected, derived]);

  const ranked = useMemo(() =>
    CANDIDATES.map((id) => {
      const hits = RULES_BY_DRUG[id]!
        .filter((r) => effective.has(r.flag))
        .map((r) => ({ ...r, flagLabel: CONTENT.flags.find((f) => f.id === r.flag)?.label || EXT_FLAG_LABELS[r.flag] || r.flag }));
      const score = hits.reduce((s, h) => s + h.effect, 0);
      return { id, name: byId[id]!.name, score, hits };
    }).filter((d) => d.hits.length > 0).sort((a, b) => b.score - a.score),
  [effective]);

  const anyInput = selected.size > 0 || derived.flags.size > 0;

  return (
    <div className="page">
      <PageHead
        kicker="Layer 10 · Patient"
        title="Precision immunology"
        lede="Select the features this patient carries — comorbidities, biomarkers, clinical state — and see which therapies the mechanism supports, and which it cautions against. Scores are sums of explicit rules, each with its reason."
        stats={[
          { v: CONTENT.rules.length, l: "SCORING RULES" },
          { v: EXT_BIOMARKERS.length, l: "BIOMARKER SLIDERS" },
        ]}
      />
      <EduBanner>Rule-based teaching scores built from the graph; each rule shows its reason. Educational illustration — not patient-specific advice.</EduBanner>
      <div className="g2 grid" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: "1.05rem" }}>Patient features</h3>
            {selected.size ? <button className="btn sm" onClick={() => setSelected(new Set())}>Clear all</button> : null}
          </div>
          {GROUPS.map((g) => (
            <div key={g} style={{ marginBottom: 14 }}>
              <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>{g}</div>
              <div className="flag-grid">
                {CONTENT.flags.filter((f) => f.group === g).map((f) => (
                  <label key={f.id}>
                    <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="xs mono muted" style={{ marginBottom: 6, textTransform: "uppercase" }}>Measured biomarkers</div>
          {EXT_BIOMARKERS.map((b) => {
            const v = bio[b.id] ?? b.def;
            const firing = b.thresholds.some((t) => (t.above != null && v >= t.above) || (t.below != null && v < t.below));
            return (
            <label key={b.id} className="xs" style={{ display: "block", marginBottom: 8 }}>
              {b.label} <span className={`mono ${firing ? "bio-active" : "muted"}`}>{v} {b.unit}{firing ? " · rule firing" : ""}</span>
              <input type="range" min={b.min} max={b.max} step={b.step} value={bio[b.id] ?? b.def} style={{ width: "100%" }}
                aria-label={b.label}
                onChange={(e) => setBio({ ...bio, [b.id]: Number(e.target.value) })} />
            </label>
            );
          })}
          {derived.labels.length ? (
            <p className="xs muted">Active thresholds: {derived.labels.join(" · ")}</p>
          ) : (
            <p className="xs muted">Move a slider past a threshold and the matching rules fire automatically.</p>
          )}
        </div>
        <div>
          <h3 style={{ fontSize: "1.05rem", marginBottom: 10 }}>{anyInput ? `${ranked.length} therapies matched` : "Ranked therapies"}</h3>
          {!anyInput ? <p className="empty card">Select at least one patient feature, or move a biomarker slider past a threshold, to rank therapies against the rule set.</p> : null}
          {anyInput && !ranked.length ? <p className="empty card">No rule in the atlas touches these features yet.</p> : null}
          {ranked.map((d) => (
            <div className="rank" key={d.id}>
              <div>
                <strong>{d.name}</strong>
                <div className="row" style={{ marginTop: 6, gap: 6 }}><NodeChip id={d.id} label="Graph" /></div>
                {d.hits.map((h) => (
                  <div className={`msg ${h.effect > 0 ? "pos" : "neg"}`} key={h.flag + h.msg}>
                    {h.effect > 0 ? "▲" : "▼"} <strong>{h.flagLabel}</strong> — {h.msg}
                  </div>
                ))}
              </div>
              <span className={`score ${d.score > 0 ? "s-pos" : d.score < 0 ? "s-neg" : "s-neu"}`}>{d.score > 0 ? "+" : ""}{d.score}</span>
              <div className="rank-bar" aria-hidden="true">
                <i className={d.score >= 0 ? "pos" : "neg"} style={{ width: `${Math.min(100, Math.abs(d.score) * 25)}%` }} />
              </div>
              <div className="rank-detail">
                <DetailToggle open={openId === d.id} onToggle={() => setOpenId(openId === d.id ? null : d.id)} />
                {openId === d.id ? <TherapyDetail id={d.id} hits={d.hits} /> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
