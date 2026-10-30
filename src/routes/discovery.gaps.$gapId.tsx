import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
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
import { recommendGapsForProfile, type FeedbackRating } from "@/lib/discovery/recommend";
import { verifyGapCandidate } from "@/lib/discovery/verify";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "why", label: "Why it matters" },
  { id: "scope", label: "Search scope" },
  { id: "verification", label: "Verification" },
  { id: "intel4", label: "Evidence Intel 4.0" },
  { id: "coverage", label: "Search coverage" },
  { id: "feedback", label: "Feedback" },
  { id: "review", label: "Review trail" },
  { id: "links", label: "Continue" },
];

export const Route = createFileRoute("/discovery/gaps/$gapId")({
  head: ({ params }) =>
    seoHead({
      title: `Gap ${params.gapId} | ${PRODUCT_NAME}`,
      description:
        "Research gap dossier with ISI search scope, verification, and Atlas/Ask/Workbench links. Educational/research — not CDS.",
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

  if (!dossier && err) {
    return (
      <div className="page">
        <PageHead kicker="Investigate · Research Radar" title="Gap not found" lede={err} />
        <Link to="/discovery/gaps">Back to gaps</Link>
      </div>
    );
  }
  if (!dossier) {
    return (
      <div className="page">
        <p className="muted">Loading gap dossier…</p>
      </div>
    );
  }

  const recommend = recommendGapsForProfile(
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
      displayLabel: null,
      focusDiseases: ["D012"],
      focusDomains: ["checkpoint"],
      modalities: ["pd1"],
      interests: {},
    },
  )[0];

  async function runPersist() {
    setActionMsg("");
    try {
      const res = await persistFn({ data: { gapKeys: [gapId] } });
      setActionMsg(`Persisted (${res.upserted}). Reloading…`);
      const next = await load({ data: { gapKey: gapId } });
      setDossier(next.dossier);
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Persist failed.");
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
      setActionMsg(`Status ${res.previousStatus} → ${res.newStatus} (v${res.versionN}).`);
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
        "Promote to reviewed_opportunity? Human scientific decision only — never automatic. Does not approve Gate C.",
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
      setActionMsg(
        `Opportunity ${res.previousOpportunityStatus} → ${res.newOpportunityStatus} (v${res.versionN}). ${res.note}`,
      );
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
      setActionMsg(
        res.following
          ? "Following in-app (email deferred; Researcher Pro — billing not activated)."
          : "Unfollowed.",
      );
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

  return (
    <div className="page">
      <PageHead kicker="Investigate · Research Radar" title={dossier.title} lede={dossier.summary} />
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
        <span className="small muted">
          Detection: {dossier.detectionSource}
          {dossier.pilot ? ` · ${dossier.pilot}` : ""}
          {dossier.opportunityStatus && dossier.opportunityStatus !== "none"
            ? ` · opportunity: ${dossier.opportunityStatus}`
            : ""}
        </span>
        <span className="small muted">
          {dossier.persisted ? "Persisted in Neon" : "Detection only"}
          {dossier.reviewedBy ? ` · reviewed by ${dossier.reviewedBy}` : ""}
        </span>
      </div>
      <p className="small muted">{dossier.badge.honesty}</p>
      {dossier.gapClassHonesty ? <p className="small muted">{dossier.gapClassHonesty}</p> : null}
      {dossier.classReason ? <p className="small muted">Class reason: {dossier.classReason}</p> : null}
      <p className="small muted">{dossier.noveltyLimitationNote}</p>
      <p className="small muted">Auto-approve: false · {dossier.note}</p>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <button type="button" className="btn sm" onClick={() => void runPersist()}>
          Persist candidate
        </button>
        <button type="button" className="btn sm" onClick={() => void runVerify()}>
          Run verification
        </button>
        <button type="button" className="btn sm" onClick={() => void runFollow(true)}>
          Follow (Researcher Pro — billing not activated)
        </button>
        <button type="button" className="btn sm" onClick={() => void runFollow(false)}>
          Unfollow
        </button>
      </div>
      {actionMsg ? <p className="small">{actionMsg}</p> : null}

      <Section id="why" title="Why it matters" lede="Framed as ISI uncertainty — not clinical advice.">
        <p>{dossier.whyItMatters}</p>
        {(recommend?.because ?? []).length ? (
          <>
            <p className="small muted" style={{ marginTop: 8 }}>
              Recommended because… (profile interest stub on this dossier — signed-in Radar uses your real profile + feedback)
            </p>
            <ul>
              {recommend!.because.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            {recommend?.disclaimer ? <p className="small muted">{recommend.disclaimer}</p> : null}
          </>
        ) : null}
      </Section>

      <Section id="scope" title="Documented search scope" lede="Coverage honesty for this candidate.">
        <ul>
          <li>Corpus: {dossier.searchScope.corpus}</li>
          <li>Method: {dossier.searchScope.method}</li>
          <li>Date scope: {dossier.searchScope.dateScope}</li>
          <li>{dossier.searchScope.note}</li>
        </ul>
      </Section>

      <Section
        id="verification"
        title="Scientific verification (engineering)"
        lede="Deterministic provenance checks. Optional AI drafts are labelled and never change status."
      >
        {dossier.verification ? (
          <>
            <p className="small muted">{dossier.verification.note}</p>
            <ul className="isi-verify-list">
              {dossier.verification.provenance.map((p) => (
                <li key={p.id}>
                  <span className={p.ok ? "isi-verify-ok" : "isi-verify-fail"}>
                    {p.ok ? "OK" : "Issue"} · {p.id}
                  </span>
                  <span className="small">{p.detail}</span>
                </li>
              ))}
            </ul>
            <p className="small">
              Conflict context: {dossier.verification.conflict.present ? "present" : "none"} —{" "}
              {dossier.verification.conflict.note}
            </p>
            <p className="small muted">
              AI-assisted:{" "}
              {dossier.verification.aiAssisted
                ? "labelled draft_only"
                : "none (deterministic path)"}
            </p>
          </>
        ) : (
          <p className="muted">No verification report yet.</p>
        )}
      </Section>

      <Section
        id="intel4"
        title="Evidence Intel 4.0"
        lede="Claim verifier + cross-examination scaffolds. Title-only and keyword hits do not equal support. Accuracy vs gold labels is unknown until SME labels exist."
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
              {dossier.intel4.smeQueued ? " · SME queued" : ""}
              {dossier.intel4.routeHref ? (
                <>
                  {" "}
                  ·{" "}
                  <a href={dossier.intel4.routeHref}>Open review route</a>
                </>
              ) : null}
            </p>
            <p className="small muted">
              Accuracy vs gold: null (no_gold_labels) — never invent accuracy %. Auto-approve: false.
            </p>
          </>
        ) : (
          <p className="muted">
            Intel 4.0 reassessment not attached on this load. Run{" "}
            <code>bun run discovery:intel4-validate</code> for the five deep dossiers, or open SME for
            human review. No silent KG writes; candidate ≠ approved.
          </p>
        )}
      </Section>

      <Section
        id="coverage"
        title="Search coverage records"
        lede="hitCount stays null when unknown — never coerced to zero."
      >
        {dossier.coverageRows.length ? (
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
        ) : (
          <p className="muted">No coverage rows yet — persist or run verification to append one.</p>
        )}
      </Section>

      <Section
        id="feedback"
        title="Your feedback"
        lede="Stored in research_gap_feedback. Influences your personalised ranking only — never a novelty or importance claim."
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
        id="review"
        title="Review trail"
        lede="Scientific reviewer decisions append research_gap_reviews + versions. No bulk/auto approve."
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
          <button type="button" className="btn sm" onClick={() => void runReview("promote_reviewed")}>
            Promote reviewed_gap
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
        <h4 style={{ fontSize: "0.95rem", marginTop: 16, marginBottom: 6 }}>
          Opportunity review (Gate C unchanged)
        </h4>
        <p className="xs muted" style={{ marginBottom: 8 }}>
          Current opportunity status: <code>{dossier.opportunityStatus ?? "none"}</code>. Promote only when
          class is <code>research_opportunity</code> and status is assessed/draft. Never auto.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }} data-testid="opportunity-review-actions">
          <button
            type="button"
            className="btn sm"
            onClick={() => void runOpportunity("promote_reviewed_opportunity")}
          >
            Promote reviewed_opportunity
          </button>
          <button type="button" className="btn sm" onClick={() => void runOpportunity("reject_opportunity")}>
            Reject opportunity
          </button>
          <button type="button" className="btn sm" onClick={() => void runOpportunity("demote_opportunity")}>
            Demote opportunity
          </button>
          <a className="btn sm" href={`/sme?gapKey=${encodeURIComponent(gapId)}`}>
            Open in SME workspace
          </a>
        </div>
      </Section>

      <Section id="links" title="Continue investigating" lede="One chatbot — Continue in Ask Immune opens the main Ask page with a prefilled question. Atlas, Evidence, Workbench and Pipeline stay deep links into the same knowledge graph.">
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
