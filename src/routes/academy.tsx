import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { PageHead, NodeChip } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";
import {
  ACADEMY_TRACKS,
  type AcademyTrack,
} from "@/data/academyCurriculum";
import { CAPABILITY_STATUS_LABEL } from "@/data/capabilityStatus";
import { byId } from "@/lib/immune/engine";
import { LEARN_PATH, pageTitle, PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/academy")({
  head: () =>
    seoHead({
      title: pageTitle("Immunology Academy"),
      description: `Structured immunology learning tracks on ${PRODUCT_NAME} — foundation navigable, intermediate and advanced labelled scaffolds. Not certification.`,
      path: LEARN_PATH,
    }),
  component: AcademyLanding,
});

const STORAGE_KEY = "immune-city-academy-progress-v2";

type LocalProgress = {
  visitedLessonIds: string[];
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

function trackStatusLabel(track: AcademyTrack): string {
  if (track.status === "navigable") return "navigable";
  return "scaffold · in development";
}

function TrackOverview({ track, progress }: { track: AcademyTrack; progress: LocalProgress }) {
  const opened = progress.visitedLessonIds.filter((id) =>
    track.modules.some((m) => m.lessonId === id),
  ).length;
  const totalQuiz = track.modules.reduce((n, m) => n + m.quiz.length, 0);
  const correctQuiz = progress.quizCorrect.filter((id) =>
    track.modules.some((m) => m.quiz.some((q) => q.id === id)),
  ).length;
  const firstLesson = track.modules[0]?.lessonId;

  return (
    <div className="academy-track-card" id={track.id}>
      <span className={`badge rs rs-${track.status === "navigable" ? "claim-assessed" : "draft"}`}>
        {track.level} · {trackStatusLabel(track)}
      </span>
      <h3>{track.title}</h3>
      <p className="small muted">{track.summary}</p>
      {track.modules.length === 0 ? (
        <p className="xs muted">
          No modules yet. {CAPABILITY_STATUS_LABEL.in_development} — not available as a finished track.
        </p>
      ) : (
        <>
          <p className="xs muted">
            Lessons opened (this browser): {opened}/{track.modules.length}
            {totalQuiz > 0 ? ` · Local quiz checks ${correctQuiz}/${totalQuiz}` : ""}
            {" · Not certification"}
          </p>
          <ol className="academy-mod-list">
            {track.modules.map((m, i) => {
              const visited = progress.visitedLessonIds.includes(m.lessonId);
              return (
                <li key={m.id}>
                  <span className="xs mono muted">
                    {i + 1}. {visited ? "opened" : "not opened yet"}
                  </span>
                  <div>
                    <Link to="/mechanism/$id" params={{ id: m.lessonId }}>
                      {m.title}
                    </Link>
                  </div>
                  <p className="xs muted" style={{ margin: "4px 0 0" }}>
                    {m.objectives[0]}
                  </p>
                  {m.prerequisiteLessonIds.length > 0 ? (
                    <p className="xs muted" style={{ margin: "4px 0 0" }}>
                      Prerequisites: {m.prerequisiteLessonIds.join(", ")}
                    </p>
                  ) : (
                    <p className="xs muted" style={{ margin: "4px 0 0" }}>
                      No prerequisites
                    </p>
                  )}
                  <div className="row" style={{ marginTop: 8, flexWrap: "wrap", gap: 6 }}>
                    {m.graphIds
                      .filter((id) => byId[id])
                      .slice(0, 5)
                      .map((id) => (
                        <NodeChip key={id} id={id} />
                      ))}
                  </div>
                  <p className="xs muted" style={{ marginTop: 6 }}>
                    {m.quiz.length} assessment question{m.quiz.length === 1 ? "" : "s"} · linked mechanisms in lesson
                  </p>
                </li>
              );
            })}
          </ol>
          {firstLesson ? (
            <Button asChild variant="ghost" className="bio-secondary" style={{ marginTop: 8, alignSelf: "flex-start" }}>
              <Link to="/mechanism/$id" params={{ id: firstLesson }}>
                Open first module <ArrowUpRight size={14} />
              </Link>
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function AcademyLanding() {
  const [progress, setProgress] = useState<LocalProgress>({ visitedLessonIds: [], quizCorrect: [] });
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  return (
    <div className="page marketing-page academy-landing">
      <PageHead
        kicker="Immunology Academy"
        title="Learn mechanisms as connected systems."
        lede="Academy is a learning layer over Cell Atlas, Mechanism, Knowledge Graph, Disease, Therapy and Evidence — not a separate thirteenth product. Progress is local to this browser. Not certification."
      />

      <section className="section">
        <h2>Tracks</h2>
        <p>
          Foundation is navigable today. Intermediate reuses existing Mechanism lessons as an honest scaffold.
          Advanced is labelled scaffold only — no modules yet.
        </p>
        <div className="academy-track-cards">
          {ACADEMY_TRACKS.map((track) => (
            <TrackOverview key={track.id} track={track} progress={progress} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Connected platform layers</h2>
        <p>Academy lessons map into the same twelve-layer atlas — open the layer that matches your goal.</p>
        <div className="academy-connect">
          <Link to="/learn">Cell Atlas</Link>
          <Link to="/mechanism/$id" params={{ id: "tlr4" }}>
            Mechanism
          </Link>
          <Link to="/graph">Knowledge graph</Link>
          <Link to="/disease">Disease</Link>
          <Link to="/therapy">Therapy</Link>
          <Link to="/evidence">Evidence</Link>
        </div>
      </section>

      <section className="section mkt-banner" aria-labelledby="academy-cta">
        <div>
          <h2 id="academy-cta">Begin with innate sensing</h2>
          <p>Foundation module 1 walks TLR4 → NF-κB with labelled teaching simplifications.</p>
        </div>
        <Button asChild className="bio-primary">
          <Link to="/mechanism/$id" params={{ id: "tlr4" }}>
            Open TLR4 lesson <ArrowUpRight />
          </Link>
        </Button>
      </section>
    </div>
  );
}
