import { createFileRoute, Link } from "@tanstack/react-router";
import { courseMap, reviewDueLessons, type AcademyProgress } from "@/lib/academy/progress";
import { useAcademyProgress } from "@/components/immune/useAcademyProgress";
import { ArrowUpRight } from "lucide-react";
import { NodeChip } from "@/components/immune/ui";
import { Button } from "@/components/ui/button";
import {
  LearningOutboundLink,
  MarketingBody,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  StatusChip,
} from "@/components/immune/marketing";
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
      description: `Structured immunology learning tracks on ${PRODUCT_NAME} — foundation available now; intermediate and advanced in development. Not a certification programme.`,
      path: LEARN_PATH,
    }),
  component: AcademyLanding,
});

function AcademyLanding() {
  const { progress, storage } = useAcademyProgress();
  const map = courseMap();
  const due = reviewDueLessons(progress);

  const foundation = ACADEMY_TRACKS.find((t) => t.level === "foundation")!;
  const incomplete = ACADEMY_TRACKS.filter((t) => t.level !== "foundation");
  const lessonTitleById = Object.fromEntries(
    ACADEMY_TRACKS.flatMap((t) => t.modules.map((m) => [m.lessonId, m.title] as const)),
  );

  return (
    <div className="mkt-page academy-landing">
      <MarketingHero
        eyebrow="Immunology Academy"
        title="Learn mechanisms as connected systems."
        lede="Academy is the learning overlay for Immune Super Intelligence — linked to the cell atlas, mechanisms, knowledge graph, disease, therapy and evidence layers. Completing a module is teaching progress, not claim review. Signed out, progress stays in this browser. Signed in, it is kept on your account when Academy storage is available."
        actions={
          <>
            <Button asChild className="bio-primary">
              <Link to="/mechanism/$id" params={{ id: "tlr4" }}>
                Start Foundation module 1 <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to="/ask">Ask Immune</Link>
            </Button>
          </>
        }
        foot="Foundation available · Intermediate and Advanced in development · Not a certification programme"
      />

      <MarketingBody>
        <MarketingSection
          id="course-map"
          eyebrow="Course map"
          title="What is navigable, and what is unfinished."
          lede="Prerequisites are the lesson titles already on the curriculum. Unfinished tracks are labelled. No extra modules are added here."
        >
          <p className="mkt-aside">
            Progress is kept in {storage === "account" ? "your account" : storage === "loading" ? "…" : "this browser"}.
          </p>
          {due.length ? (
            <div>
              <h3>Review due</h3>
              <p className="mkt-aside">Completed lessons only. Re-open them when you want. This is not a new course.</p>
              <ul className="mkt-scaffold-mods">
                {due.map((item) => (
                  <li key={item.lessonId}>
                    <Link to="/mechanism/$id" params={{ id: item.lessonId }}>{item.title}</Link>
                    <span> · {item.trackTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mkt-aside">No review is due until you finish a lesson’s existing questions.</p>
          )}
          <ol className="mkt-course-modules">
            {map.map((track) => (
              <li key={track.id} className="mkt-course-mod">
                <div className="mkt-course-mod-body">
                  <div className="mkt-course-mod-head">
                    <span>{track.title}</span>
                    <span className="mkt-course-mod-state">{track.unfinished ? "Unfinished" : "Navigable"}</span>
                  </div>
                  {track.modules.length === 0 ? (
                    <p>No modules on this track yet.</p>
                  ) : (
                    <ul>
                      {track.modules.map((module) => (
                        <li key={module.id}>
                          <Link to="/mechanism/$id" params={{ id: module.lessonId }}>{module.title}</Link>
                          <span className="mkt-aside">
                            {module.prerequisites.length
                              ? ` · Prerequisites: ${module.prerequisites.map((item) => item.title).join("; ")}`
                              : " · No prerequisites"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </MarketingSection>

        <MarketingSection
          id="foundation"
          eyebrow="Foundation"
          title={foundation.title}
          lede={foundation.summary}
        >
          <div className="mkt-course">
            <div className="mkt-course-meta">
              <StatusChip label="Available" tone="primary" />
              <span className="mkt-course-progress">
                Lessons opened (this browser):{" "}
                {
                  progress.visitedLessonIds.filter((id) =>
                    foundation.modules.some((m) => m.lessonId === id),
                  ).length
                }
                /{foundation.modules.length}
              </span>
            </div>
            <ol className="mkt-course-modules">
              {foundation.modules.map((m, i) => {
                const visited = progress.visitedLessonIds.includes(m.lessonId);
                return (
                  <li key={m.id} className="mkt-course-mod">
                    <span className="mkt-course-mod-n">{String(i + 1).padStart(2, "0")}</span>
                    <div className="mkt-course-mod-body">
                      <div className="mkt-course-mod-head">
                        <Link to="/mechanism/$id" params={{ id: m.lessonId }}>
                          {m.title}
                        </Link>
                        <span className="mkt-course-mod-state">{visited ? "Opened" : "Not opened"}</span>
                      </div>
                      <p>{m.objectives[0]}</p>
                      <p className="mkt-aside">
                        {m.quiz.length} assessment question{m.quiz.length === 1 ? "" : "s"}
                        {m.prerequisiteLessonIds.length
                          ? ` · Prerequisites: ${m.prerequisiteLessonIds
                              .map((id) => lessonTitleById[id] ?? id)
                              .join("; ")}`
                          : " · No prerequisites"}
                      </p>
                      <div className="mkt-course-chips">
                        {m.graphIds
                          .filter((id) => byId[id])
                          .slice(0, 5)
                          .map((id) => (
                            <NodeChip key={id} id={id} fromLesson={m.lessonId} />
                          ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </MarketingSection>

        <MarketingSection
          id="scaffolds"
          eyebrow="In development"
          title="Intermediate and Advanced are not finished yet."
          lede="These tracks are labelled in development — not presented as finished courses."
        >
          <div className="mkt-scaffold-list">
            {incomplete.map((track) => (
              <IncompleteTrack key={track.id} track={track} progress={progress} />
            ))}
          </div>
        </MarketingSection>

        <MarketingSection
          id="extra-reading"
          eyebrow="Extra reading"
          title="Draft domain lessons outside the Foundation track."
          lede="Extension lessons for deeper reading — draft teaching, not Foundation modules."
        >
          <ul className="mkt-draft-reading">
            {(
              [
                {
                  id: "microbiome",
                  title: "Microbiome and barrier",
                  blurb: "Fibre / SCFA → Treg → IBD neighbourhood — review incomplete.",
                },
                {
                  id: "vaccines",
                  title: "Vaccines: building memory on purpose",
                  blurb: "Platform → germinal centre → memory and correlates — draft.",
                },
                {
                  id: "immunogenetics",
                  title: "Immunogenetics: HLA and risk alleles",
                  blurb: "Shared epitope → ACPA → RA and related HLA associations — draft.",
                },
              ] as const
            ).map((item) => (
              <li key={item.id}>
                <span className="badge rs rs-draft">Draft</span>
                <Link to="/mechanism/$id" params={{ id: item.id }}>
                  {item.title}
                </Link>
                <span>{item.blurb}</span>
              </li>
            ))}
          </ul>
          <p className="mkt-aside">
            More draft domains on <Link to="/overview" hash="draft-domains">Overview</Link>
            {" · "}
            Claim coverage on <Link to="/methods" hash="live-ev-heading">Methods</Link>
            {" · "}
            Foundation above remains the primary path.
          </p>
        </MarketingSection>

        <MarketingSection
          id="connect"
          eyebrow="Connected layers"
          title="Lessons map into the same atlas."
          lede="Open the layer that matches your goal. Academy is a learning overlay — not a thirteenth atlas layer."
        >
          <div className="mkt-link-row">
            <Link to="/learn">Cell Atlas</Link>
            <Link to="/mechanism/$id" params={{ id: "tlr4" }}>
              Mechanism
            </Link>
            <Link to="/graph">Knowledge graph</Link>
            <Link to="/disease">Disease</Link>
            <Link to="/therapy">Therapy</Link>
            <Link to="/evidence">Evidence</Link>
            <LearningOutboundLink />
          </div>
        </MarketingSection>

        <MarketingCta
          title="Begin with innate sensing."
          lede="Foundation module 1 walks TLR4 → NF-κB with clear teaching simplifications."
        >
          <Button asChild className="bio-primary">
            <Link to="/mechanism/$id" params={{ id: "tlr4" }}>
              Open TLR4 lesson <ArrowUpRight />
            </Link>
          </Button>
        </MarketingCta>
      </MarketingBody>
    </div>
  );
}

function IncompleteTrack({ track, progress }: { track: AcademyTrack; progress: AcademyProgress }) {
  const empty = track.modules.length === 0;
  const opened = progress.visitedLessonIds.filter((id) =>
    track.modules.some((m) => m.lessonId === id),
  ).length;

  return (
    <article className={`mkt-scaffold${empty ? " is-empty" : ""}`} id={track.id}>
      <div className="mkt-scaffold-head">
        <StatusChip label={`${track.level} · in development`} tone="warn" />
        <h3>{track.title}</h3>
      </div>
      <p>{track.summary}</p>
      {empty ? (
        <p className="mkt-empty">
          No modules yet. {CAPABILITY_STATUS_LABEL.in_development} — not available as a finished track.
        </p>
      ) : (
        <>
          <p className="mkt-aside">
            Reuses Mechanism lessons ({opened}/{track.modules.length} opened in this browser). Not a certification
            programme.
          </p>
          <ul className="mkt-scaffold-mods">
            {track.modules.map((m) => (
              <li key={m.id}>
                <Link to="/mechanism/$id" params={{ id: m.lessonId }}>
                  {m.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}
