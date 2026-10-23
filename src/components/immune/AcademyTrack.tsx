import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ACADEMY_TRACKS,
  moduleForLesson,
  type AcademyModule,
  type AcademyTrack,
} from "@/data/academyCurriculum";
import { CONTENT } from "@/data/content";
import { CAPABILITY_STATUS_LABEL } from "@/data/capabilityStatus";
import { byId } from "@/lib/immune/engine";
import { courseMap, reviewDueLessons, statedMisconceptions, type AcademyProgress } from "@/lib/academy/progress";
import { NodeChip } from "@/components/immune/ui";
import LessonDiscussions from "@/components/immune/LessonDiscussions";
import { useAcademyProgress } from "@/components/immune/useAcademyProgress";

function trackStatusLabel(track: AcademyTrack): string {
  if (track.status === "navigable") return "Open to read";
  return "In development";
}

function QuizBlock({
  module,
  progress,
  onCorrect,
}: {
  module: AcademyModule;
  progress: AcademyProgress;
  onCorrect: (quizId: string) => void;
}) {
  const [picked, setPicked] = useState<Record<string, number | null>>({});
  return (
    <div className="academy-quiz">
      <h4 id={`quiz-${module.id}`}>Check understanding</h4>
      <p className="xs muted">Local practice only — not a credential, not SME sign-off, not evidence approval.</p>
      {module.quiz.map((q) => {
        const choice = picked[q.id];
        const already = progress.quizCorrect.includes(q.id);
        const revealed = choice != null;
        const correct = revealed && choice === q.correctIndex;
        return (
          <fieldset key={q.id} className="academy-q" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="small">{q.prompt}</legend>
            <div className="row" role="group" aria-label={q.prompt} style={{ flexWrap: "wrap", gap: 6 }}>
              {q.choices.map((c, i) => {
                const selected = choice === i;
                return (
                  <button
                    key={c}
                    type="button"
                    className={`chip${selected ? " on" : ""}`}
                    disabled={already}
                    aria-pressed={selected || (already && i === q.correctIndex)}
                    onClick={() => {
                      setPicked((prev) => ({ ...prev, [q.id]: i }));
                      if (i === q.correctIndex) onCorrect(q.id);
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {already || correct ? (
              <p className="xs" style={{ marginTop: 6 }} role="status">
                {already ? "Marked correct (local). " : "Correct. "}
                {q.rationale}
              </p>
            ) : revealed ? (
              <p className="xs muted" style={{ marginTop: 6 }} role="status">
                Not quite. {q.rationale}
              </p>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}

function TrackPanel({
  track,
  lessonId,
  progress,
  onCorrect,
}: {
  track: AcademyTrack;
  lessonId: string;
  progress: AcademyProgress;
  onCorrect: (quizId: string) => void;
}) {
  const hit = track.modules.find((m) => m.lessonId === lessonId);
  const totalQuiz = track.modules.reduce((n, m) => n + m.quiz.length, 0);
  const correctQuiz = progress.quizCorrect.filter((id) =>
    track.modules.some((m) => m.quiz.some((q) => q.id === id)),
  ).length;
  const opened = progress.visitedLessonIds.filter((id) => track.modules.some((m) => m.lessonId === id)).length;

  return (
    <div className="academy-track-panel">
      <div className="row" style={{ justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: "1.05rem", margin: 0 }}>{track.title}</h3>
        <span
          className={`badge rs rs-${track.status === "navigable" ? "claim-assessed" : "draft"}`}
          title={track.summary}
        >
          {track.level} · {trackStatusLabel(track)}
        </span>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>{track.summary}</p>
      <p className="xs muted">
        Local quiz checks {correctQuiz}/{totalQuiz} · Lessons opened {opened}/{track.modules.length}
        {track.status === "scaffold" ? ` · ${CAPABILITY_STATUS_LABEL.in_development}` : ""}
      </p>
      <ol className="academy-modules">
        {track.modules.map((m, i) => {
          const open = m.lessonId === lessonId;
          const visited = progress.visitedLessonIds.includes(m.lessonId);
          return (
            <li key={m.id} className={open ? "on" : undefined}>
              <div className="academy-mod-head">
                <span className="xs mono muted">
                  {i + 1}. {visited ? "opened" : "not opened yet"}
                </span>
                <Link to="/mechanism/$id" params={{ id: m.lessonId }} aria-current={open ? "page" : undefined}>
                  {m.title}
                </Link>
              </div>
              <p className="xs muted">{m.objectives[0]}</p>
            </li>
          );
        })}
      </ol>

      {hit ? (
        <div className="card academy-module-card">
          <h3>{hit.title}</h3>
          <p className="small muted">{hit.evidenceNote}</p>
          <h4>Objectives</h4>
          <ul className="si-list">
            {hit.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <h4>Teaching simplifications</h4>
          <ul className="si-list">
            {hit.teachingSimplifications.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4>Prerequisites</h4>
          <p className="xs muted">
            {hit.prerequisiteLessonIds.length
              ? hit.prerequisiteLessonIds
                  .map((id) => courseMap().flatMap((track) => track.modules).find((item) => item.lessonId === id)?.title ?? id)
                  .join("; ")
              : "None recorded on this module."}
          </p>
          <h4>Graph concepts</h4>
          <div className="row" style={{ marginTop: 8 }}>
            {hit.graphIds.filter((id) => byId[id]).map((id) => (
              <NodeChip key={id} id={id} />
            ))}
          </div>
          <MisconceptionCheck lessonId={hit.lessonId} />
          <LessonDiscussions conceptIds={hit.graphIds} />
          <QuizBlock module={hit} progress={progress} onCorrect={onCorrect} />
        </div>
      ) : null}
    </div>
  );
}

function MisconceptionCheck({ lessonId }: { lessonId: string }) {
  const lesson = (CONTENT.lessons as { id?: string; steps?: Array<Record<string, unknown>>; perturbations?: Array<Record<string, unknown>> }[])
    .find((item) => item.id === lessonId);
  const lines = statedMisconceptions(lesson);
  if (!lines.length) return null;
  return (
    <div>
      <h4>Misconception check</h4>
      <p className="xs muted">Quoted from this lesson. No new claim is added.</p>
      <ul className="si-list">
        {lines.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </div>
  );
}

/** Academy scaffolds inside Mechanism (not a finished multi-track curriculum). */
export default function AcademyTrack({ lessonId }: { lessonId: string }) {
  const hit = moduleForLesson(lessonId);
  const { progress, update, storage } = useAcademyProgress();
  const due = reviewDueLessons(progress);

  useEffect(() => {
    if (!hit || storage === "loading") return;
    if (progress.visitedLessonIds.includes(hit.module.lessonId)) return;
    update({ ...progress, visitedLessonIds: [...progress.visitedLessonIds, hit.module.lessonId] });
  }, [hit, storage, progress, update]);

  const onCorrect = (quizId: string) => {
    if (progress.quizCorrect.includes(quizId)) return;
    update({ ...progress, quizCorrect: [...progress.quizCorrect, quizId] });
  };

  return (
    <section className="section academy-track" aria-labelledby="academy-track-heading">
      <h2 id="academy-track-heading">Immunology Academy</h2>
      <p className="lede">
        Foundation is open to read. Intermediate and advanced are still being written. Signed out, progress stays in
        this browser. Signed in, the same record is kept on your account when Academy storage is available. Not
        a certificate, and not a count of reviewed evidence.{" "}
        <Link to="/academy">Academy overview</Link>
      </p>
      <p className="xs muted">
        Progress store: {storage === "account" ? "signed-in account" : storage === "loading" ? "checking" : "this browser"}.
      </p>
      {due.length ? (
        <div>
          <h3>Review due</h3>
          <p className="xs muted">Completed lessons on the existing map. This is a reminder to re-open them, not a new course.</p>
          <ul className="si-list">
            {due.map((item) => (
              <li key={item.lessonId}>
                <Link to="/mechanism/$id" params={{ id: item.lessonId }}>{item.title}</Link>
                <span className="xs muted"> · {item.trackTitle}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid auto" style={{ gap: 16 }}>
        {ACADEMY_TRACKS.map((track) => (
          <TrackPanel
            key={track.id}
            track={track}
            lessonId={lessonId}
            progress={progress}
            onCorrect={onCorrect}
          />
        ))}
      </div>
      {!hit ? (
        <p className="xs muted" style={{ marginTop: 12 }}>
          This lesson is outside the Academy tracks. Open a foundation or intermediate module link above to continue.
        </p>
      ) : null}
    </section>
  );
}
