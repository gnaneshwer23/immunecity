import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ART } from "@/components/immune/explain";
import { ArrowRight, ArrowUpRight, BookOpen, FlaskConical, Microscope, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CausalSpine } from "@/components/immune/CausalSpine";
import { IsiCityBand } from "@/components/immune/IsiCityBand";
import {
  CapabilityChips,
  ExemplarMaturityStrip,
  WontClaimList,
} from "@/components/immune/marketing";
import { CONTENT } from "@/data/content";
import { VISION_MOTTO } from "@/data/vision";
import {
  BRAND_EYEBROW,
  EXPLORE_CTA,
  EXPLORE_PATH,
  HERO_HEADLINE,
  HERO_SUPPORT,
  HERO_TRUST,
  PRODUCT_NAME,
  TAGLINE,
} from "@/lib/brand";
import { approvedQuery, loadEvidenceCoverage } from "@/lib/citations.functions";
import { byId, human } from "@/lib/immune/engine";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { seoHead } from "@/lib/seo";
import { inspect } from "@/lib/immune/inspector";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";

const HOME_DRAFT_TEASERS = [
  {
    title: "Fibre → butyrate → Treg → IBD",
    blurb: "Fibre / microbiota → butyrate → Treg → IBD teaching chain — educational scaffold; claim-level review incomplete.",
    lessonId: "microbiome",
    hash: "draft-pathway",
  },
  {
    title: "Vaccine → germinal centre → memory",
    blurb: "How a vaccine leaves antibodies and memory behind — draft scaffold from the vaccines extension.",
    lessonId: "vaccines",
    hash: "draft-vaccine",
  },
  {
    title: "Shared epitope → ACPA → RA",
    blurb: "HLA class II shared epitope → ACPA → seropositive RA neighbourhood — association teaching, still draft.",
    lessonId: "immunogenetics",
    hash: "draft-hla",
  },
] as const;

const HOME_DRAFT_ROUTES = HOME_DRAFT_TEASERS.filter((t) =>
  CONTENT.routes.some((r) => r.title === t.title && "draft" in r && r.draft),
);


export const Route = createFileRoute("/")({
  loader: () => loadEvidenceCoverage(),
  head: () =>
    seoHead({
      title: `${PRODUCT_NAME} | ${TAGLINE}`,
      description:
        "Immune Super Intelligence — explore mechanisms and a curated causal graph. Ask Immune retrieves graph context and Gate C cites when present; provisional literature stays labelled. Educational beta — not fully evidence-grounded AI; not clinical advice.",
      path: "/",
    }),
  component: Home,
});

const INVESTIGATE_TOOLS = [
  { to: "/simulator", icon: FlaskConical, title: "System simulator", can: "Run a 30-day infection and add treatments to see which outcome follows.", limit: "Hand-set teaching parameters — not calibrated to patients or a prediction." },
  { to: "/reasoning", icon: Network, title: "Scientific reasoning", can: "Trace causal paths, inspect Ask retrieval, and walk exemplar pathways with live maturity.", limit: "Graph-retrieved teaching; fail-closes unsupported citation claims — not fully evidence-grounded AI." },
  { to: "/patient", icon: Microscope, title: "Patient and biomarkers", can: "See how biomarker thresholds map to educational rule flags.", limit: "Draft rules for teaching — no individual medical assessment." },
] as const;

/** Home causal preview: TNF→RA exemplar (documented maturity; live cites still load in the graph). */
const HOME_EXEMPLAR = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-tnf-ra")!;
/** Section D: interferon axis — recognition → signalling → cytokine → activation → outcome. */
const MECHANISM_EXEMPLAR = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-ifn-sle")!;

function InteractiveMechanism() {
  const { data: cites = [], isPending, isError } = useQuery(approvedQuery);
  const report = reportExemplar(MECHANISM_EXEMPLAR, cites);
  const seen = new Set<string>();
  const hops = report.segments.flatMap((seg) =>
    (seg.steps ?? []).map((step, i) => ({ step, rid: seg.relIds[i]!, review: seg.reviews[i]! })),
  ).filter((h) => (seen.has(h.rid) ? false : (seen.add(h.rid), true)));
  return (
    <>
      {isPending ? (
        <p className="home-causal-note" role="status">Loading live review status for each hop…</p>
      ) : isError ? (
        <p className="home-causal-note" role="alert">
          Evidence service unavailable — hop badges below cannot be recomputed from live approvals.
        </p>
      ) : null}
      <ol className="isi-mech" aria-label={`${MECHANISM_EXEMPLAR.title} — inspect each step`}>
        {hops.map(({ step, rid, review }, i) => {
          const subj = byId[step.r.subject_id];
          const obj = byId[step.r.object_id];
          if (!subj || !obj) return null;
          const label = report.edgeReviews.find((x) => x.relId === rid)?.label ?? String(review);
          return (
            <li key={rid} className="isi-mech-step">
              <span className="isi-mech-n">{String(i + 1).padStart(2, "0")}</span>
              <div className="isi-mech-body">
                <button type="button" className="isi-mech-node" onClick={() => inspect({ kind: "concept", id: subj.id })}>{subj.name}</button>
                <button type="button" className="isi-mech-rel" onClick={() => inspect({ kind: "relationship", id: rid })} aria-label={`Inspect evidence: ${subj.name} ${human(step.r.relation)} ${obj.name}`}>
                  {human(step.r.relation)} →
                </button>
                <button type="button" className="isi-mech-node" onClick={() => inspect({ kind: "concept", id: obj.id })}>{obj.name}</button>
              </div>
              <span className={`badge rs rs-${review}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function HomeCausalPathway() {
  const { data: cites = [], isPending, isError } = useQuery(approvedQuery);
  const report = reportExemplar(HOME_EXEMPLAR, cites);
  const maturityLine = isPending
    ? "Loading live review status…"
    : isError
      ? "Evidence service unavailable — hop badges may not reflect approvals (not the same as zero reviewed support)."
      : EXEMPLAR_MATURITY_LABEL[report.maturity];

  return (
    <div className="home-pathway">
      <div className="bio-section-heading">
        <div>
          <span className="bio-section-number">CURATED GRAPH PATHWAY</span>
          <h2 id="demo-heading">{HOME_EXEMPLAR.title}</h2>
        </div>
        <p>
          Real relationships from the curated graph — each hop links to a graph record with its current evidence
          status. Maturity: {maturityLine}
        </p>
      </div>
      <ol className="home-causal-path" aria-label={`${HOME_EXEMPLAR.title} relationships`}>
        {report.segments.flatMap((seg, si) =>
          (seg.steps ?? []).map((step, i) => {
            const rid = seg.relIds[i]!;
            // Segments can share a link; show each relationship once.
            const firstSeen = report.segments.findIndex((s2) => s2.relIds.includes(rid));
            if (firstSeen !== si || seg.relIds.indexOf(rid) !== i) return null;
            const review = seg.reviews[i]!;
            const label = report.edgeReviews.find((x) => x.relId === rid)?.label ?? String(review);
            const subj = byId[step.r.subject_id];
            const obj = byId[step.r.object_id];
            if (!subj || !obj) return null;
            return (
              <li key={`${si}-${rid}-${i}`}>
                <Link
                  className="home-causal-hop"
                  to="/graph"
                  search={{ focus: step.r.subject_id }}
                  title={`Open ${subj.name} in the knowledge graph`}
                >
                  <span className="home-causal-names">
                    <strong>{subj.name}</strong>
                    <span className="home-causal-rel">{human(step.r.relation)}</span>
                    <strong>{obj.name}</strong>
                  </span>
                  <span className={`badge rs rs-${review}`}>{label}</span>
                </Link>
              </li>
            );
          }),
        )}
      </ol>
      <p className="home-causal-note">
        {HOME_EXEMPLAR.purpose} Teaching axis only — not disease-complete. Primary reviewed exemplar.{" "}
        <Link to="/overview">Platform exemplars</Link>
        {" · "}
        <Link to="/methods">Evidence lifecycle</Link>
      </p>
      <ExemplarMaturityStrip cites={cites} pending={isPending} error={isError} />
      {HOME_DRAFT_ROUTES.length ? (
        <div className="home-draft-teaser-list" aria-label="Draft teaching chains">
          {HOME_DRAFT_ROUTES.map((t) => (
            <aside key={t.title} className="home-draft-teaser">
              <span className="badge rs rs-draft">Draft</span>
              <p>
                {t.blurb}{" "}
                <Link to="/overview" hash={t.hash}>
                  Overview
                </Link>
                {" · "}
                <Link to="/mechanism/$id" params={{ id: t.lessonId }}>
                  Lesson
                </Link>
              </p>
            </aside>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const SNAP = graphReleaseSnapshot();

function HomeCoverageGlance() {
  const { coverage: data, coverageError } = Route.useLoaderData();
  if (coverageError || !data) {
    return (
      <p className="home-causal-note" role="alert">
        Live coverage unavailable
        {coverageError ? ` (${coverageError})` : ""}. That is a service error, not proof of zero reviewed
        cites.{" "}
        <Link to="/methods" hash="live-ev-heading">
          Methods coverage
        </Link>
      </p>
    );
  }
  return (
    <p className="home-causal-note" role="status">
      Live Gate C: <b>{data.distinctGateCRels}</b> / {data.runtimeRelationships} distinct
      relationship claims with approved+supports
      {` · contradicts ${data.contradicts} / partial ${data.partial}`}. Coverage stays
      sparse on purpose until curators map claims.{" "}
      <Link to="/methods" hash="live-ev-heading">
        Methods dashboard
      </Link>
      {" · "}
      <Link to="/evidence" hash="coverage">
        Evidence breakdown
      </Link>
    </p>
  );
}

function Home() {
  return (
    <div className="home-page home-page-helix">
      <section className="home-helix-hero" aria-label={PRODUCT_NAME}>
        <div className="home-helix-visual" aria-hidden="true">
          <img className="home-hero-art" src={ART.heroCity} alt="" width={1536} height={1024} />
        </div>
        <div className="home-helix-copy">
          <div className="bio-eyebrow home-helix-eyebrow">
            <span className="status-dot" /> {BRAND_EYEBROW}
          </div>
          <p className="home-brand-signal">{PRODUCT_NAME}</p>
          <h1>{HERO_HEADLINE}</h1>
          <p className="hero-description">{HERO_SUPPORT}</p>
          <div className="bio-actions">
            <Button asChild className="bio-primary home-helix-primary">
              <Link to="/ask">
                Ask Immune <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary home-helix-secondary">
              <Link to={EXPLORE_PATH}>
                {EXPLORE_CTA} <ArrowRight />
              </Link>
            </Button>
          </div>
          <p className="home-helix-foot">{HERO_TRUST}</p>
        </div>
      </section>

      <div className="bio-content home-sections">
        <nav className="isi-three" aria-label="Three ways in">
          <Link to="/ask"><img src={ART.cellsArt} alt="" loading="lazy" width={1024} height={768} /><b>Ask Immune</b><span>Graph + Gate C cites when present; provisional PubMed/Europe PMC labelled unreviewed; fail-closes unsupported citation claims. Not fully evidence-grounded AI.</span></Link>
          <Link to="/atlas"><img src={ART.moleculesArt} alt="" loading="lazy" width={1024} height={768} /><b>Knowledge Atlas</b><span>Explore cells, molecules, diseases and therapies — one page each.</span></Link>
          <Link to="/research" hash="library"><img src={ART.researchArt} alt="" loading="lazy" width={1024} height={768} /><b>Research</b><span>Journal metadata, candidate claims and a partial workbench spine — nothing auto-approved.</span></Link>
        </nav>
        {/* B — What ISI enables */}
        <section className="bio-section" aria-labelledby="enables-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">01 / SCIENTIFIC EXPLORATION</span>
              <h2 id="enables-heading">Not isolated facts — connected mechanisms.</h2>
            </div>
            <p>A search returns a fact. ISI shows what it connects to, in which direction, and how well it is supported.</p>
          </div>
          <div className="home-compare">
            <div className="home-compare-col home-compare-flat">
              <span className="home-compare-label">A typical search</span>
              <p className="home-compare-q">"What does TNF do?"</p>
              <ul>
                <li>A list of papers and definitions</li>
                <li>No direction: cause and effect look the same</li>
                <li>No path to disease, target or therapy</li>
                <li>Evidence quality left for you to judge</li>
              </ul>
            </div>
            <div className="home-compare-col home-compare-connected">
              <span className="home-compare-label">In ISI</span>
              <HomeCausalPathway />
            </div>
          </div>
        </section>

        {/* C — Architecture */}
        <section className="bio-section" aria-labelledby="home-spine-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">02 / THE IMMUNE SYSTEM ARCHITECTURE</span>
              <h2 id="home-spine-heading">Fifteen causal stages, from trigger to discovery.</h2>
            </div>
            <p>
              Twelve layers organise the parts (cells, molecules, tissues, disease, therapy); fifteen stages order the
              reasoning from trigger to discovery. The chain is an educational model — individual links carry their own
              evidence status. See all twelve layers on <Link to="/overview">Overview</Link>.
            </p>
          </div>
          <CausalSpine compact />
          <IsiCityBand />
        </section>

        {/* D — Explore a mechanism */}
        <section className="bio-section" aria-labelledby="mech-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">03 / EXPLORE A MECHANISM</span>
              <h2 id="mech-heading">{MECHANISM_EXEMPLAR.title}</h2>
            </div>
            <p>
              Real graph links, in order. Select a concept to open its details, or an arrow to inspect the evidence for
              that link. Status badges show what has and has not been reviewed.
            </p>
          </div>
          <InteractiveMechanism />
          <p className="home-causal-note">
            <Link to="/mechanism">Walk more mechanisms</Link>{" · "}<Link to="/graph">Open the full graph</Link>
          </p>
        </section>

        {/* E — Research intelligence */}
        <section className="bio-section isi-split" aria-labelledby="research-heading">
          <div>
            <span className="bio-section-number">04 / RESEARCH INTELLIGENCE</span>
            <h2 id="research-heading">From a paper to a reviewable claim.</h2>
            <p className="lede">
              The Research Library searches live Crossref metadata across Nature Portfolio immunology journals
              (no affiliation implied). Proposing an article starts a local candidate — never Gate C. Ask Immune may
              also surface provisional PubMed/Europe PMC hits as unreviewed. The workbench spine
              (Question→…→Export) is partial; claim-ledger candidates do not write the curated graph.
            </p>
            <div className="bio-actions">
              <Button asChild className="bio-primary">
                <Link to="/research" hash="library"><BookOpen /> Browse the Research Library</Link>
              </Button>
              <Button asChild variant="ghost" className="bio-secondary">
                <Link to="/research" hash="workbench">Open workbench</Link>
              </Button>
            </div>
          </div>
          <ol className="isi-ladder" aria-label="How research material is labelled">
            <li><b>Source material</b><span>Journal metadata (Crossref) or provisional PubMed/Europe PMC hits — identity only until reviewed.</span></li>
            <li><b>Candidate claim</b><span>A person-drafted statement mapped to a relationship ID — still unreviewed.</span></li>
            <li><b>Counterevidence path</b><span>Contradicts / partial assessments stay separate from Gate C support (Neon may still have none).</span></li>
            <li><b>Hypothesis / export</b><span>Workbench drafts and curation handoff — never auto-promoted to the curated graph.</span></li>
          </ol>
        </section>

        {/* F — Investigate and simulate */}
        <section className="bio-section" aria-labelledby="investigate-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">05 / INVESTIGATE AND SIMULATE</span>
              <h2 id="investigate-heading">Test ideas — with the limits in plain sight.</h2>
            </div>
            <p>Each tool says what it can do and what it is not.</p>
          </div>
          <div className="isi-tools">
            {INVESTIGATE_TOOLS.map((t) => (
              <Link key={t.to} to={t.to} className="isi-tool">
                <t.icon aria-hidden size={20} />
                <h3>{t.title}</h3>
                <p>{t.can}</p>
                <p className="isi-tool-limit">{t.limit}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="bio-section" aria-labelledby="trust-heading">
          <div className="bio-section-heading">
            <div>
              <span className="bio-section-number">06 / EVIDENCE &amp; TRUST</span>
              <h2 id="trust-heading">Review status stays visible.</h2>
            </div>
            <p>
              Graph today: {SNAP.coreNodes} core concepts and {SNAP.coreRelationships} core links, plus{" "}
              {SNAP.draftNodes} draft concepts and {SNAP.draftRelationships} draft links awaiting review.
            </p>
          </div>
          <HomeCoverageGlance />
          <ul className="home-limit-list">
            <li>
              <strong>Reviewed when mapped</strong>
              <span>Citations support a relationship only after claim-level review — not concept-level padding.</span>
            </li>
            <li>
              <strong>Unreviewed stays labelled</strong>
              <span>Teaching edges remain visible with honest status; Gate C coverage is still sparse overall.</span>
            </li>
            <li>
              <strong>Ask Immune (partial)</strong>
              <span>
                Graph context + Gate C approved cites when present; provisional PubMed/Europe PMC labelled unreviewed;
                citation checks fail-closed; counterevidence bucket stays empty when Neon has no contradicts — not fully
                evidence-grounded AI.
              </span>
            </li>
            <li>
              <strong>Rate limit</strong>
              <span>Neon-backed Ask rate buckets are live (in-memory fallback only if Neon is unreachable).</span>
            </li>
          </ul>
          <CapabilityChips className="home-cap-chips" />
          <WontClaimList />
          <p className="home-trust-link">
            <Link to="/methods" hash="live-ev-heading">Live coverage</Link>
            <Link to="/ask">Ask Immune</Link>
            <Link to="/research" hash="workbench">Research workbench</Link>
            <Link to="/curation">Curation (admin)</Link>
            <Link to="/disclaimer">Educational disclaimer</Link>
          </p>
        </section>


        <section className="bio-banner home-final-cta" aria-labelledby="cta-heading">
          <div>
            <div className="bio-eyebrow">{VISION_MOTTO.join(" · ")}</div>
            <h2 id="cta-heading">Explore immunology through connected mechanisms.</h2>
            <p>
              Start with a cell, pathway or scientific question—and follow the relationships that connect it to the
              wider immune system.
            </p>
          </div>
          <nav className="isi-final-links" aria-label="Start exploring">
            <Link to="/ask">Ask Immune <ArrowRight size={16} /></Link>
            <Link to="/mechanism">Investigate a mechanism <ArrowRight size={16} /></Link>
            <Link to="/graph">Open the knowledge graph <ArrowRight size={16} /></Link>
            <Link to="/methods" hash="live-ev-heading">See live coverage <ArrowRight size={16} /></Link>
            <Link to="/research" hash="library">Browse research <ArrowRight size={16} /></Link>
          </nav>
        </section>
      </div>
    </div>
  );
}
