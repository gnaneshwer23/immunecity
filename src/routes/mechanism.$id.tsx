import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CONTENT } from "@/data/content";
import { LEGACY } from "@/data/legacy";
import { byId } from "@/lib/immune/engine";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { Facts, Section } from "@/components/immune/page";
import AcademyTrack from "@/components/immune/AcademyTrack";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/mechanism/$id")({
  loader: ({ params }) => {
    if (!CONTENT.lessons.some((x) => x.id === params.id)) throw notFound();
    return null;
  },
  head: ({ params }) => {
    const l = CONTENT.lessons.find((x) => x.id === params.id);
    if (!l) {
      return seoHead({ title: "Mechanism not found — Immune Super Intelligence", description: "This mechanism is not available. Browse the existing immune mechanism lessons.", path: `/mechanism/${params.id}`, noIndex: true });
    }
    const title = `${l.title.split(":")[0]} — Mechanism — Immune Super Intelligence`;
    return seoHead({ title, description: l.question, path: `/mechanism/${params.id}` });
  },
  component: Mechanism,
  notFoundComponent: MechanismNotFound,
});

function MechanismNotFound() {
  return (
    <div className="page">
      <PageHead kicker="Learn · Mechanisms · not found" title="Mechanism not found" lede="This address does not match any lesson. Choose one of the cascades below." />
      <ul className="section">
        {CONTENT.lessons.map((l) => (
          <li key={l.id}>
            <Link to="/mechanism/$id" params={{ id: l.id }}>{l.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
        kicker={`Learn · Mechanisms · Module ${lesson.module}${lesson.draft ? " · draft extension" : ""}`}
        title={lesson.title}
        lede={lesson.question}
        stats={[
          { v: steps.length, l: "STEPS IN THIS CASCADE" },
          { v: perts.length, l: "PERTURBATION EXPERIMENTS" },
          { v: lessons.length, l: "LESSONS IN THE TRACK" },
        ]}
      />
      {lesson.draft ? (
        <p className="isi-note" role="note">
          <span className="badge rs rs-draft">draft extension</span> Added to close a coverage gap; not curated core until expert review.
        </p>
      ) : null}
      <nav className="lesson-tabs" role="tablist" aria-label="Mechanism lessons">
        {lessons.map((l) => {
          const selected = l.id === lesson.id;
          return (
            <button
              key={l.id}
              role="tab"
              type="button"
              aria-selected={selected}
              className={selected ? "on" : undefined}
              onClick={() => navigate({ to: "/mechanism/$id", params: { id: l.id } })}
            >
              <span className="m">{l.module}</span>
              {l.title.split(":")[0]}
              {l.draft ? (
                <span className="badge rs rs-draft" style={{ marginLeft: 4 }}>
                  draft
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <Section id="cascade" n={1} title="Walk the cascade"
        lede="Select a step for its function, upstream and downstream links, what fails if it is absent, and the clinical read-out."
        aside={
          <Facts items={[
            ...(cellNames.length ? [{ label: "Cells involved", children: <div className="row">{cellNames.map((n) => <span className="chip" key={n}>{n}</span>)}</div> }] : []),
            ...((lesson.nodes || []).some((nid: string) => byId[nid]) ? [{ label: "Graph concepts", children: <div className="row">{(lesson.nodes || []).filter((nid: string) => byId[nid]).map((nid: string) => <NodeChip key={nid} id={nid} />)}</div> }] : []),
          ]} />
        }>
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
                  <strong className="step-name">{s.name}</strong>
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
      </Section>

      {perts.length ? (
        <Section id="perturbations" n={2} title="Perturbation experiments"
          lede="Break one component and follow the consequence chain to the clinical read-out.">
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
        </Section>
      ) : null}

      <Section id="track" n={perts.length ? 3 : 2} title="Where this fits in the track"
        lede="This lesson's place in the Academy foundation track, with your local progress and the next lessons to open.">
        <AcademyTrack lessonId={lesson.id} />
      </Section>
    </div>
  );
}
