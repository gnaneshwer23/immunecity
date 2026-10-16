import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ACADEMY_TRACKS,
  moduleForLesson,
  type AcademyModule,
  type AcademyTrack,
} from "@/data/academyCurriculum";
import { CAPABILITY_STATUS_LABEL } from "@/data/capabilityStatus";
import { byId } from "@/lib/immune/engine";
import { NodeChip } from "@/components/immune/ui";

const STORAGE_KEY = "immune-city-academy-progress-v2";

type LocalProgress = {
  /** Module lesson ids where the learner opened the linked lesson */
  visitedLessonIds: string[];
  /** Quiz item ids answered correctly at least once */
  quizCorrect: string[];
};

function loadProgress(): LocalProgress {
  if (typeof window === "undefined") return { visitedLessonIds: [], quizCorrect: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Migrate foundation-only v1 if present
      const legacy = localStorage.getItem("immune-city-academy-foundation-v1");
      if (legacy) {
        const parsed = JSON.parse(legacy) as LocalProgress;
        return {
          visitedLessonIds: Array.isArray(parsed.visitedLessonIds) ? parsed.visitedLessonIds : [],
          quizCorrect: Array.isArray(parsed.quizCorrect) ? parsed.quizCorrect : [],
        };
      }
      return { visitedLessonIds: [], quizCorrect: [] };
    }
    const parsed = JSON.parse(raw) as LocalProgress;
    return {
      visitedLessonIds: Array.isArray(parsed.visitedLessonIds) ? parsed.visitedLessonIds : [],
      quizCorrect: Array.isArray(parsed.quizCorrect) ? parsed.quizCorrect : [],
    };
  } catch {
    return { visitedLessonIds: [], quizCorrect: [] };
  }
}

function saveProgress(p: LocalProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function trackStatusLabel(track: AcademyTrack): string {
  if (track.status === "navigable") return "navigable scaffold";
  return "in development · scaffold only";
}

function QuizBlock({
  module,
  progress,
  onCorrect,
}: {
  module: AcademyModule;
  progress: LocalProgress;
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
  progress: LocalProgress;
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
          <h4>Graph concepts</h4>
          <div className="row" style={{ marginTop: 8 }}>
            {hit.graphIds.filter((id) => byId[id]).map((id) => (
              <NodeChip key={id} id={id} />
            ))}
          </div>
          <QuizBlock module={hit} progress={progress} onCorrect={onCorrect} />
        </div>
      ) : null}
    </div>
  );
}

/** Academy scaffolds inside Mechanism (not a finished multi-track curriculum). */
export default function AcademyTrack({ lessonId }: { lessonId: string }) {
  const hit = moduleForLesson(lessonId);
  const [progress, setProgress] = useState<LocalProgress>(() => loadProgress());

  useEffect(() => {
    if (!hit) return;
    setProgress((prev) => {
      if (prev.visitedLessonIds.includes(hit.module.lessonId)) return prev;
      const next = {
        ...prev,
        visitedLessonIds: [...prev.visitedLessonIds, hit.module.lessonId],
      };
      saveProgress(next);
      return next;
    });
  }, [hit]);

  const onCorrect = (quizId: string) => {
    setProgress((prev) => {
      if (prev.quizCorrect.includes(quizId)) return prev;
      const next = { ...prev, quizCorrect: [...prev.quizCorrect, quizId] };
      saveProgress(next);
      return next;
    });
  };

  return (
    <section className="section academy-track" aria-labelledby="academy-track-heading">
      <h2 id="academy-track-heading">Immunology Academy</h2>
      <p className="lede">
        Foundation is a navigable teaching scaffold; intermediate is an honest in-development scaffold over existing
        Mechanism lessons; advanced is labelled empty. Progress stays in this browser — not certification, not Gate C
        evidence coverage.{" "}
        <Link to="/academy">Academy overview</Link>
      </p>
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
