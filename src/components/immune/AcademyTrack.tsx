import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FOUNDATION_TRACK, moduleForLesson, type AcademyModule } from "@/data/academyCurriculum";
import { byId } from "@/lib/immune/engine";
import { NodeChip } from "@/components/immune/ui";

const STORAGE_KEY = "immune-city-academy-foundation-v1";

type LocalProgress = {
  /** Module ids where the learner opened the linked lesson */
  visitedLessonIds: string[];
  /** Quiz item ids answered correctly at least once */
  quizCorrect: string[];
};

function loadProgress(): LocalProgress {
  if (typeof window === "undefined") return { visitedLessonIds: [], quizCorrect: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visitedLessonIds: [], quizCorrect: [] };
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
      <h4>Check understanding</h4>
      <p className="xs muted">Local practice only — not a credential, not SME sign-off, not evidence approval.</p>
      {module.quiz.map((q) => {
        const choice = picked[q.id];
        const already = progress.quizCorrect.includes(q.id);
        const revealed = choice != null;
        const correct = revealed && choice === q.correctIndex;
        return (
          <div key={q.id} className="academy-q">
            <p className="small">{q.prompt}</p>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {q.choices.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${choice === i ? " on" : ""}`}
                  disabled={already}
                  onClick={() => {
                    setPicked((prev) => ({ ...prev, [q.id]: i }));
                    if (i === q.correctIndex) onCorrect(q.id);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            {already || correct ? (
              <p className="xs" style={{ marginTop: 6 }}>
                {already ? "Marked correct (local). " : "Correct. "}
                {q.rationale}
              </p>
            ) : revealed ? (
              <p className="xs muted" style={{ marginTop: 6 }}>
                Not quite. {q.rationale}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Foundation Academy scaffold inside Mechanism (not a new top-level layer). */
export default function AcademyTrack({ lessonId }: { lessonId: string }) {
  const track = FOUNDATION_TRACK;
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

  const totalQuiz = track.modules.reduce((n, m) => n + m.quiz.length, 0);
  const correctQuiz = progress.quizCorrect.filter((id) =>
    track.modules.some((m) => m.quiz.some((q) => q.id === id)),
  ).length;

  return (
    <section className="section academy-track" aria-label="Immunology Academy foundation track">
      <h2>Immunology Academy · foundation track</h2>
      <p className="lede">
        {track.summary} Progress is stored in this browser only — we do not claim course completion, certification, or Gate C evidence coverage.
      </p>
      <p className="xs muted">
        Track status: <strong>{track.status}</strong> · Local quiz checks {correctQuiz}/{totalQuiz} · Lessons opened{" "}
        {progress.visitedLessonIds.filter((id) => track.modules.some((m) => m.lessonId === id)).length}/
        {track.modules.length}
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
                <Link to="/mechanism/$id" params={{ id: m.lessonId }}>
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
          <h3>{hit.module.title}</h3>
          <p className="small muted">{hit.module.evidenceNote}</p>
          <h4>Objectives</h4>
          <ul className="si-list">
            {hit.module.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <h4>Teaching simplifications</h4>
          <ul className="si-list">
            {hit.module.teachingSimplifications.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4>Graph concepts</h4>
          <div className="row" style={{ marginTop: 8 }}>
            {hit.module.graphIds.filter((id) => byId[id]).map((id) => (
              <NodeChip key={id} id={id} />
            ))}
          </div>
          <QuizBlock
            module={hit.module}
            progress={progress}
            onCorrect={(quizId) => {
              setProgress((prev) => {
                if (prev.quizCorrect.includes(quizId)) return prev;
                const next = { ...prev, quizCorrect: [...prev.quizCorrect, quizId] };
                saveProgress(next);
                return next;
              });
            }}
          />
        </div>
      ) : (
        <p className="xs muted">
          This lesson is outside the foundation track. Open{" "}
          <Link to="/mechanism/$id" params={{ id: track.modules[0]!.lessonId }}>
            {track.modules[0]!.title}
          </Link>{" "}
          to continue the Academy path.
        </p>
      )}
    </section>
  );
}
