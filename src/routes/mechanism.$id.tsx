import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { LEGACY } from "@/data/legacy";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import AcademyTrack from "@/components/immune/AcademyTrack";

export const Route = createFileRoute("/mechanism/$id")({
  head: ({ params }) => {
    const l = CONTENT.lessons.find((x) => x.id === params.id) || CONTENT.lessons[0]!;
    const title = `${l.title.split(":")[0]} — Mechanism — Immune Super Intelligence`;
    return {
      meta: [
        { title },
        { name: "description", content: l.question },
        { property: "og:title", content: title },
        { property: "og:description", content: l.question },
      ],
    };
  },
  component: Mechanism,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
const normStep = (s: any) => ({
  name: s.name, type: s.type, phase: s.phase, desc: s.desc, fn: s.fn || s.function,
  upstream: s.upstream, downstream: s.downstream, absent: s.absent || s.ifAbsent, clinical: s.clinical,
});
const normPert = (p: any) => ({ q: p.q || p.question, target: p.target, chain: (p.chain || []) as string[], clinical: p.clinical });

function Mechanism() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [selIdx, setSelIdx] = useState(0);
  const [openP, setOpenP] = useState<number | null>(null);
  const lessons = CONTENT.lessons;
  const lesson = useMemo(() => lessons.find((l) => l.id === id) || lessons[0]!, [id, lessons]);

  useEffect(() => { setSelIdx(0); setOpenP(null); }, [lesson.id]);

  const steps = useMemo(() => {
    const raw: any[] = lesson.steps && lesson.steps.length ? lesson.steps : lesson.id === "tcr" ? LEGACY.tcrSteps : [];
    return raw.map(normStep);
  }, [lesson]);
  const perts = useMemo(() => {
    const raw: any[] = lesson.perturbations && lesson.perturbations.length ? lesson.perturbations : lesson.id === "tcr" ? LEGACY.tcrPerturbations : [];
    return raw.map(normPert);
  }, [lesson]);

  const step = steps[selIdx];
  const cellNames = (lesson.cells || []).map((cid: string) => LEGACY.cells.find((c) => c.id === cid)?.name).filter(Boolean) as string[];

  return (
    <div className="page">
      <PageHead
        kicker={`Layer 03 · Mechanism · Module ${lesson.module}`}
        title="Cascades"
        lede="Pick a lesson, then walk its steps. Each step opens the mechanism, what fails if that component is absent, and the clinical read-out."
        stats={[
          { v: lessons.length, l: "LESSONS" },
          { v: steps.length, l: "STEPS IN THIS CASCADE" },
          { v: perts.length, l: "PERTURBATION EXPERIMENTS" },
        ]}
      />
      <AcademyTrack lessonId={lesson.id} />

      <div className="lesson-tabs">
        {lessons.map((l) => (
          <button key={l.id} className={l.id === lesson.id ? "on" : undefined} onClick={() => navigate({ to: "/mechanism/$id", params: { id: l.id } })}>
            <span className="m">{l.module}</span>{l.title.split(":")[0]}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.35rem", marginBottom: 8 }}>{lesson.title}</h2>
        <p className="muted">{lesson.question}</p>
        <div className="row" style={{ marginTop: 12 }}>{cellNames.map((n) => <span className="chip" key={n}>{n}</span>)}</div>
        <div className="row" style={{ marginTop: 8 }}>
          {(lesson.nodes || []).filter((nid: string) => byId[nid]).map((nid: string) => <NodeChip key={nid} id={nid} />)}
        </div>
      </div>

      {steps.length ? (
        <div className="lesson">
          <div className="cascade">
            {steps.map((s, i) => (
              <button
                key={s.name + i}
                className={`step${i === selIdx ? " on" : ""}${s.type === "branch" || s.type === "output" ? " branch" : ""}`}
                onClick={() => setSelIdx(i)}
              >
                <span className="rail"><i>{i + 1}</i><b /></span>
                <span className="box">
                  <span className="ty">{s.type} · {s.phase}</span>
                  <h4>{s.name}</h4>
                  <p>{s.desc}</p>
                </span>
              </button>
            ))}
          </div>
          {step ? (
            <aside className="detail card">
              <h3>{step.name}</h3>
              <span className="ty mono xs muted">{step.type} · {step.phase}</span>
              <p className="small" style={{ marginTop: 8 }}>{step.fn}</p>
              <dl>
                {step.upstream ? <><dt>Upstream</dt><dd>{step.upstream}</dd></> : null}
                {step.downstream && step.downstream.length ? (
                  <><dt>Downstream</dt><dd>{Array.isArray(step.downstream) ? step.downstream.join(" · ") : step.downstream}</dd></>
                ) : null}
                {step.absent ? <><dt>If absent</dt><dd>{step.absent}</dd></> : null}
                {step.clinical ? <><dt>Clinical</dt><dd>{step.clinical}</dd></> : null}
              </dl>
            </aside>
          ) : null}
        </div>
      ) : (
        <p className="empty">No step-by-step cascade recorded for this lesson yet. The linked graph nodes above carry its content.</p>
      )}

      {perts.length ? (
        <section className="section">
          <h2>Perturbation experiments</h2>
          <p className="lede">Break one component and follow the consequence chain to the clinical read-out.</p>
          {perts.map((p, i) => (
            <div className={`perturb${openP === i ? " open" : ""}`} key={p.q}>
              <button onClick={() => setOpenP(openP === i ? null : i)}><span>{p.q}</span></button>
              <div className="pbody">
                <p className="xs mono muted" style={{ marginBottom: 8 }}>Target: {p.target}</p>
                <ol className="pchain">
                  {p.chain.map((c, ci) => <li key={c} style={{ animationDelay: `${ci * 60}ms` }}>{c}</li>)}
                </ol>
                {p.clinical ? <p className="callout" style={{ marginTop: 12 }}><strong>Clinical read-out. </strong>{p.clinical}</p> : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
