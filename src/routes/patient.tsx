import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { EXT_BIOMARKERS, EXT_FLAG_LABELS } from "@/data/extensions";
import { byId } from "@/lib/immune/engine";
import { EduBanner, PageHead, NodeChip } from "@/components/immune/ui";
import { DetailToggle } from "@/components/immune/InlineDetail";
import TherapyDetail from "@/components/immune/TherapyDetail";

export const Route = createFileRoute("/patient")({
  head: () => seoHead({ title: "Patient: precision immunology — Immune Super Intelligence", description: "Select patient features and see which therapies the mechanism supports or cautions against, rule by rule.", path: "/patient" }),
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
        kicker="Research · Patient and biomarkers"
        title="Precision immunology"
        lede="Select comorbidities, biomarkers and clinical state, then see which therapies the mechanism supports or cautions against. Scores are sums of explicit rules, each with its reason."
        stats={[
          { v: CONTENT.rules.length, l: "SCORING RULES" },
          { v: EXT_BIOMARKERS.length, l: "BIOMARKER SLIDERS" },
        ]}
      />
      <EduBanner>Rule-based teaching scores from the graph; each rule shows its reason. Educational illustration — not patient-specific advice.</EduBanner>
      <div className="isi-workspace">
        <div className="card isi-panel isi-panel-sticky">
          <div className="isi-panel-head">
            <div>
              <span className="isi-detail-eyebrow">Step 1</span>
              <h2>Patient features</h2>
            </div>
            {selected.size ? <button className="btn sm" onClick={() => setSelected(new Set())}>Clear all</button> : null}
          </div>
          {GROUPS.map((g) => (
            <fieldset key={g} className="isi-fieldset">
              <legend>{g}</legend>
              <div className="flag-grid">
                {CONTENT.flags.filter((f) => f.group === g).map((f) => (
                  <label key={f.id}>
                    <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <fieldset className="isi-fieldset">
          <legend>Measured biomarkers</legend>
          {EXT_BIOMARKERS.map((b) => {
            const v = bio[b.id] ?? b.def;
            const firing = b.thresholds.some((t) => (t.above != null && v >= t.above) || (t.below != null && v < t.below));
            return (
            <label key={b.id} className="xs isi-slider">
              <span className="isi-slider-top">{b.label} <span className={`mono ${firing ? "bio-active" : "muted"}`}>{v} {b.unit}{firing ? " · rule firing" : ""}</span></span>
              <input type="range" min={b.min} max={b.max} step={b.step} value={bio[b.id] ?? b.def}
                aria-label={b.label}
                onChange={(e) => setBio({ ...bio, [b.id]: Number(e.target.value) })} />
            </label>
            );
          })}
          </fieldset>
          {derived.labels.length ? (
            <p className="xs muted">Active thresholds: {derived.labels.join(" · ")}</p>
          ) : (
            <p className="xs muted">Move a slider past a threshold and the matching rules fire automatically.</p>
          )}
        </div>
        <div className="isi-panel-results" aria-live="polite">
          <div className="isi-panel-head">
            <div>
              <span className="isi-detail-eyebrow">Step 2</span>
              <h2>{anyInput ? `${ranked.length} therapies matched` : "Rule-ranked therapies"}</h2>
            </div>
            {anyInput ? <span className="isi-toolbar-count">{effective.size} feature{effective.size === 1 ? "" : "s"} active</span> : null}
          </div>
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
