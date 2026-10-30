import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import ExpertDetails from "@/components/immune/ExpertDetails";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { detectDiscoveryCandidates } from "@/lib/discovery/detect";
import { buildGapDossier, type GapDossierView } from "@/lib/discovery/dossier";
import {
  getDiscoveryGap,
  persistDetectedGapCandidates,
  recordGapReviewDecision,
  recordOpportunityReviewDecision,
  submitGapFeedback,
  toggleGapSubscription,
  verifyPersistedGap,
} from "@/lib/discovery/gaps.functions";
import type { OpportunityReviewDecision } from "@/lib/discovery/opportunityReview";
import { getMyResearchProfile } from "@/lib/discovery/profiles.functions";
import { recommendGapsForProfile, type FeedbackRating } from "@/lib/discovery/recommend";
import { verifyGapCandidate } from "@/lib/discovery/verify";
import { seoHead } from "@/lib/seo";
import {
  detectionSourceLabel,
  opportunityStatusLabel,
  persistenceLabel,
  pilotLabel,
  verificationProvenanceLabel,
} from "@/lib/uxLanguage";

const TOC = [
  { id: "question", label: "Scientific question" },
  { id: "why", label: "Why it matters" },
  { id: "evidence", label: "Evidence & mechanisms" },
  { id: "open", label: "Open questions" },
  { id: "actions", label: "Next actions" },
  { id: "feedback", label: "Feedback" },
  { id: "links", label: "Continue" },
];

export const Route = createFileRoute("/discovery/gaps/$gapId")({
  head: ({ params }) =>
    seoHead({
      title: `Research dossier | ${PRODUCT_NAME}`,
      description:
        "Research candidate dossier with evidence scope, verification, and Atlas/Ask/Workbench links. Educational/research — not CDS.",
      path: `/discovery/gaps/${params.gapId}`,
    }),
  component: DiscoveryGapDossierPage,
});

function DiscoveryGapDossierPage() {
  const { gapId } = Route.useParams();
  const load = useServerFn(getDiscoveryGap);
  const persistFn = useServerFn(persistDetectedGapCandidates);
  const verifyFn = useServerFn(verifyPersistedGap);
  const reviewFn = useServerFn(recordGapReviewDecision);
  const opportunityFn = useServerFn(recordOpportunityReviewDecision);
  const followFn = useServerFn(toggleGapSubscription);
  const feedbackFn = useServerFn(submitGapFeedback);
  const profileFn = useServerFn(getMyResearchProfile);

  const fallbackGap = detectDiscoveryCandidates().find((g) => g.gapKey === gapId) ?? null;
  const [dossier, setDossier] = useState<GapDossierView | null>(
    fallbackGap
      ? buildGapDossier({
          gap: fallbackGap,
          verification: verifyGapCandidate(fallbackGap),
        })
      : null,
  );
  const [err, setErr] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [rationale, setRationale] = useState("");
  const [because, setBecause] = useState<string[]>([]);
  const [becauseDisclaimer, setBecauseDisclaimer] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    load({ data: { gapKey: gapId } })
      .then((res) => {
        if (cancel) return;
        setDossier(res.dossier);
        setErr("");
      })
      .catch((e) => {
        if (!cancel) setErr(e instanceof Error ? e.message : "Gap not found.");
      });
    return () => {
      cancel = true;
    };
  }, [gapId, load]);

  useEffect(() => {
    if (!dossier) return;
    let cancel = false;
    profileFn()
      .then((res) => {
        if (cancel || !res.profile) {
          if (!cancel) {
            setBecause([]);
            setBecauseDisclaimer(null);
          }
          return;
        }
        const p = res.profile;
        const rec = recommendGapsForProfile(
          [
            {
              gapKey: dossier.gapKey,
              title: dossier.title,
              summary: dossier.summary,
              status: dossier.status === "coverage_insufficient" ? "coverage_insufficient" : "candidate",
              pilot: (dossier.pilot as "melanoma_a" | "coverage_b" | null) ?? null,
              subjectId: null,
              objectId: null,
              relationshipId: null,
              diseaseId: null,
              whyItMatters: dossier.whyItMatters,
              searchScope: dossier.searchScope,
              detectionSource: dossier.detectionSource as "melanoma_matrix",
              detectionDetail: {},
              coverageLabel: dossier.coverageLabel,
              autoReviewed: false,
            },
          ],
          {
            displayLabel: p.displayLabel,
            focusDiseases: p.focusDiseases,
            focusDomains: p.focusDomains,
            modalities: p.modalities,
            interests: p.interests,
          },
        )[0];
        if (!cancel) {
          setBecause(rec?.because ?? []);
          setBecauseDisclaimer(rec?.disclaimer ?? null);
        }
      })
      .catch(() => {
        if (!cancel) {
          setBecause([]);
          setBecauseDisclaimer(null);
        }
      });
    return () => {
      cancel = true;
    };
  }, [dossier, profileFn]);

  if (!dossier && err) {
    return (
      <div className="page">
        <PageHead kicker="Research · Research Radar" title="Candidate not found" lede={err} />
        <Link to="/discovery/gaps">Back to research candidates</Link>
      </div>
    );
  }
  if (!dossier) {
    return (
      <div className="page">
        <p className="muted">Loading research dossier…</p>
      </div>
    );
  }

  const oppLabel = opportunityStatusLabel(dossier.opportunityStatus);
  const pilot = pilotLabel(dossier.pilot);

  async function runPersist() {
    setActionMsg("");
    try {
      const res = await persistFn({ data: { gapKeys: [gapId] } });
      setActionMsg(`Saved to your research workspace (${res.upserted}). Reloading…`);
      const next = await load({ data: { gapKey: gapId } });
      setDossier(next.dossier);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Save failed.");
    }
  }

  async function runVerify() {
    setActionMsg("");
    try {
      const res = await verifyFn({ data: { gapKey: gapId } });
      setActionMsg(res.note);
      const next = await load({ data: { gapKey: gapId } });
      setDossier(next.dossier);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Verification failed.");
    }
  }

  async function runReview(decision: "promote_reviewed" | "reject" | "needs_context" | "demote") {
    setActionMsg("");
    try {
      const res = await reviewFn({
        data: { gapKey: gapId, decision, rationale: rationale || "Reviewer decision recorded from dossier." },
      });
      setActionMsg(`Review recorded: ${res.previousStatus} → ${res.newStatus}.`);
      const next = await load({ data: { gapKey: gapId } });
      setDossier(next.dossier);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Review failed.");
    }
  }

  async function runOpportunity(decision: OpportunityReviewDecision) {
    setActionMsg("");
    if (
      decision === "promote_reviewed_opportunity" &&
      !window.confirm(
        "Promote to a reviewed research opportunity? Human scientific decision only — never automatic. Does not approve evidence claims.",
      )
    ) {
      return;
    }
    try {
      const res = await opportunityFn({
        data: {
          gapKey: gapId,
          decision,
          rationale: rationale || "Opportunity review recorded from dossier.",
        },
      });
      setActionMsg(`Opportunity review recorded. ${res.note}`);
      const next = await load({ data: { gapKey: gapId } });
      setDossier(next.dossier);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Opportunity review failed.");
    }
  }

  async function runFollow(follow: boolean) {
    setActionMsg("");
    try {
      const res = await followFn({ data: { gapKey: gapId, follow } });
      setActionMsg(res.following ? "Following this research question in-app." : "Unfollowed.");
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Follow failed.");
    }
  }

  async function runFeedback(rating: FeedbackRating) {
    setActionMsg("");
    try {
      const res = await feedbackFn({ data: { gapKey: gapId, rating } });
      setActionMsg(res.note);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Feedback failed.");
    }
  }

  const primaryAction = !dossier.persisted ? (
    <button type="button" className="btn sm primary" onClick={() => void runPersist()}>
      Save research question
    </button>
  ) : (
    <button type="button" className="btn sm primary" onClick={() => void runVerify()}>
      Verify evidence
    </button>
  );

  return (
    <div className="page isi-dossier-page">
      <PageHead kicker="Research · Research Radar" title={dossier.title} lede={dossier.summary} />
      <PageToc items={TOC} />

      <div className="isi-radar-meta" style={{ marginBottom: 12 }}>
        <span className="isi-gap-badge" data-tone={dossier.badge.tone}>
          {dossier.badge.label}
        </span>
        {dossier.gapClassLabel ? (
          <span className="isi-gap-badge" data-tone="info" data-testid="gap-class-badge">
            {dossier.gapClassLabel}
          </span>
        ) : null}
        <span className="small muted">{persistenceLabel(dossier.persisted)}</span>
        {oppLabel ? <span className="small muted">{oppLabel}</span> : null}
        {dossier.reviewedBy ? (
          <span className="small muted">Reviewed by {dossier.reviewedBy}</span>
        ) : null}
      </div>
      <p className="small muted">{dossier.badge.honesty}</p>
      {dossier.gapClassHonesty ? <p className="small muted">{dossier.gapClassHonesty}</p> : null}

      <div className="isi-dossier-primary-actions">
        {primaryAction}
        <button type="button" className="btn sm" onClick={() => void runFollow(true)}>
          Follow
        </button>
        <button type="button" className="btn sm" onClick={() => void runFollow(false)}>
          Unfollow
        </button>
        <a className="btn sm" href={`/sme?gapKey=${encodeURIComponent(gapId)}`}>
          Open in scientific review
        </a>
      </div>
      {actionMsg ? <p className="small">{actionMsg}</p> : null}

      <Section
        id="question"
        title="Scientific question"
        lede="Framed as ISI uncertainty within documented search scope — not a worldwide literature claim."
      >
        <p className="isi-dossier-lede">{dossier.summary}</p>
        {(dossier.subjectName || dossier.objectName) && (
          <p className="small muted" style={{ marginTop: 8 }}>
            {dossier.subjectName ? <>Mechanisms involve {dossier.subjectName}</> : null}
            {dossier.subjectName && dossier.objectName ? " in relation to " : null}
            {dossier.objectName ? <>{dossier.objectName}</> : null}.
          </p>
        )}
        <p className="small muted" style={{ marginTop: 8 }}>
          {detectionSourceLabel(dossier.detectionSource)}
          {pilot ? ` · ${pilot}` : ""}
        </p>
      </Section>

      <Section id="why" title="Why it matters" lede="Framed as ISI uncertainty — not clinical advice.">
        <p>{dossier.whyItMatters}</p>
        {because.length ? (
          <>
            <p className="small muted" style={{ marginTop: 8 }}>
              Why this matches your research focus
            </p>
            <ul>
              {because.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {becauseDisclaimer ? <p className="small muted">{becauseDisclaimer}</p> : null}
          </>
        ) : null}
        <p className="small muted" style={{ marginTop: 8 }}>
          {dossier.noveltyLimitationNote}
        </p>
      </Section>

      <Section
        id="evidence"
        title="Evidence & mechanisms"
        lede="Documented search scope and provenance checks. Title-only or keyword hits do not equal support."
      >
        <ul>
          <li>Corpus: {dossier.searchScope.corpus}</li>
          <li>Method: {dossier.searchScope.method}</li>
          <li>Date scope: {dossier.searchScope.dateScope}</li>
          <li>{dossier.searchScope.note}</li>
        </ul>

        {dossier.verification ? (
          <div style={{ marginTop: 16 }}>
            <h4 className="isi-dossier-subhead">Check evidence scope</h4>
            <p className="small muted">{dossier.verification.note}</p>
            <ul className="isi-verify-list">
              {dossier.verification.provenance.map((p) => (
                <li key={p.id}>
                  <span className={p.ok ? "isi-verify-ok" : "isi-verify-fail"}>
                    {p.ok ? "OK" : "Issue"} · {verificationProvenanceLabel(p.id)}
                  </span>
                  <span className="small">{p.detail}</span>
                </li>
              ))}
            </ul>
            <p className="small">
              Conflict context: {dossier.verification.conflict.present ? "present" : "none"} —{" "}
              {dossier.verification.conflict.note}
            </p>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>
            No verification report yet — use Verify evidence after saving.
          </p>
        )}

        {dossier.coverageRows.length ? (
          <div style={{ marginTop: 16 }}>
            <h4 className="isi-dossier-subhead">Search coverage</h4>
            <ul className="isi-library-list">
              {dossier.coverageRows.map((c, i) => (
                <li key={`${c.ranAt ?? "cov"}-${i}`}>
                  <p className="small">
                    Attempted: {String(c.searchAttempted)} · Hits:{" "}
                    {c.hitCount === null ? "unknown" : c.hitCount}
                    {c.queryText ? ` · ${c.queryText}` : ""}
                  </p>
                  <p className="small muted">{c.scopeNote}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ExpertDetails
          summary="Evidence intelligence details"
          testId="intel4-expert-panel"
          className="isi-dossier-expert"
        >
          {dossier.intel4 ? (
            <>
              <p className="small" data-testid="intel4-counts">
                v{dossier.intel4.version} · source={dossier.intel4.source} · verified support=
                {dossier.intel4.claimSupport} · insufficient={dossier.intel4.claimInsufficient} ·
                abstained={dossier.intel4.claimAbstained} · demoted from prior support=
                {dossier.intel4.demotedFromPriorSupport}
              </p>
              <p className="small muted">{dossier.intel4.honesty}</p>
              {dossier.intel4.scoutSummary ? (
                <p className="small" data-testid="intel4-scout">
                  Scout: {dossier.intel4.scoutSummary}
                </p>
              ) : null}
              {dossier.intel4.verifierSummary ? (
                <p className="small" data-testid="intel4-verifier">
                  Verifier: {dossier.intel4.verifierSummary}
                </p>
              ) : null}
              {dossier.intel4.crossExamSummary ? (
                <p className="small" data-testid="intel4-xexam">
                  Cross-exam: {dossier.intel4.crossExamSummary}
                </p>
              ) : null}
              {dossier.intel4.routingSummary ? (
                <p className="small" data-testid="intel4-route-summary">
                  Routing: {dossier.intel4.routingSummary}
                </p>
              ) : null}
              {dossier.intel4.opportunitySummary ? (
                <p className="small muted">Opportunity: {dossier.intel4.opportunitySummary}</p>
              ) : null}
              {dossier.intel4.adjudicatorUncertainty ? (
                <p className="small">{dossier.intel4.adjudicatorUncertainty}</p>
              ) : null}
              <p className="small">
                Route risk: {dossier.intel4.routeRisk ?? "n/a"}
                {dossier.intel4.smeQueued ? " · scientific review queued" : ""}
                {dossier.intel4.routeHref ? (
                  <>
                    {" "}
                    · <a href={dossier.intel4.routeHref}>Open review route</a>
                  </>
                ) : null}
              </p>
              <p className="small muted">
                Accuracy vs gold labels: unknown until expert labels exist. Automated approve is disabled.
              </p>
            </>
          ) : (
            <p className="muted">
              Evidence intelligence reassessment is not attached on this load. Open scientific review for human
              appraisal. Candidate ≠ approved claim.
            </p>
          )}
          {dossier.verification ? (
            <p className="small muted" style={{ marginTop: 8 }}>
              AI-assisted path:{" "}
              {dossier.verification.aiAssisted
                ? "labelled draft only"
                : "none (deterministic provenance path)"}
            </p>
          ) : null}
          {dossier.classReason ? (
            <p className="small muted">Class reason: {dossier.classReason}</p>
          ) : null}
          <p className="xs muted" style={{ marginTop: 8 }}>
            {dossier.note}
          </p>
        </ExpertDetails>
      </Section>

      <Section
        id="open"
        title="Open questions"
        lede="What remains uncertain within ISI’s documented scope."
      >
        <ul>
          <li>{dossier.badge.honesty}</li>
          {dossier.gapClassHonesty ? <li>{dossier.gapClassHonesty}</li> : null}
          <li>{dossier.noveltyLimitationNote}</li>
          {!dossier.verification ? (
            <li>Verification has not been run yet for this saved candidate.</li>
          ) : null}
        </ul>
      </Section>

      <Section
        id="actions"
        title="Next actions"
        lede="One primary scientific path. Reviewer decisions append an audited trail — never bulk or automatic approve."
      >
        {dossier.reviews.length ? (
          <ul className="isi-library-list">
            {dossier.reviews.map((r) => (
              <li key={`${r.createdAt}-${r.decision}`}>
                <strong>
                  {r.decision}: {r.previousStatus} → {r.newStatus}
                </strong>
                <p className="small muted">
                  {r.actor} · {r.createdAt}
                </p>
                <p className="small">{r.rationale}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No review decisions yet.</p>
        )}
        <label className="small" style={{ display: "grid", gap: 4, marginTop: 12, maxWidth: "40rem" }}>
          Reviewer rationale
          <textarea
            rows={3}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Required for review actions (min 8 chars)."
          />
        </label>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" className="btn sm primary" onClick={() => void runReview("promote_reviewed")}>
            Confirm as reviewed gap
          </button>
          <button type="button" className="btn sm" onClick={() => void runReview("needs_context")}>
            Needs context
          </button>
          <button type="button" className="btn sm" onClick={() => void runReview("reject")}>
            Reject
          </button>
          <button type="button" className="btn sm" onClick={() => void runReview("demote")}>
            Demote
          </button>
        </div>

        <ExpertDetails
          summary="Opportunity review (expert)"
          testId="opportunity-review-expert"
          className="isi-dossier-expert"
        >
          <p className="xs muted" style={{ marginBottom: 8 }}>
            Current opportunity status: {dossier.opportunityStatus ?? "none"}. Promote only when class is a
            research opportunity and assessment is complete. Never automatic. Evidence claim approval is
            unchanged.
          </p>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }} data-testid="opportunity-review-actions">
            <button
              type="button"
              className="btn sm"
              onClick={() => void runOpportunity("promote_reviewed_opportunity")}
            >
              Confirm reviewed opportunity
            </button>
            <button type="button" className="btn sm" onClick={() => void runOpportunity("reject_opportunity")}>
              Reject opportunity
            </button>
            <button type="button" className="btn sm" onClick={() => void runOpportunity("demote_opportunity")}>
              Demote opportunity
            </button>
          </div>
        </ExpertDetails>
      </Section>

      <Section
        id="feedback"
        title="Your feedback"
        lede="Influences your personalised ranking only — never a novelty or importance claim."
      >
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={() => void runFeedback("useful")}>
            Useful
          </button>
          <button type="button" className="btn sm" onClick={() => void runFeedback("not_relevant")}>
            Not relevant
          </button>
          <button type="button" className="btn sm" onClick={() => void runFeedback("unclear")}>
            Unclear
          </button>
          <Link className="btn sm" to="/discovery/alerts">
            Alerts
          </Link>
        </div>
      </Section>

      <Section
        id="links"
        title="Continue investigating"
        lede="One chatbot — Continue in Ask Immune opens Ask with a prefilled question. Atlas, Evidence, Workbench stay deep links into the same knowledge graph."
      >
        <div className="isi-dossier-links">
          {dossier.links.map((l) => (
            <a key={l.id} className="btn sm" href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        {dossier.askPrefillQuestion ? (
          <p className="small muted" style={{ marginTop: 12 }}>
            Prefill for Ask Immune: {dossier.askPrefillQuestion}
          </p>
        ) : null}
      </Section>
    </div>
  );
}
