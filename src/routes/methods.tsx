import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SEM } from "@/lib/immune/engine";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { PROMPT_VERSION } from "@/lib/askGrounding";
import { STATUS_INFO, type ReviewStatus } from "@/lib/immune/evidenceStatus";
import ModelRegistryPanel from "@/components/immune/ModelRegistryPanel";
import { IMPLEMENTATION_PHASES } from "@/data/implementation-phases";
import { approvedQuery } from "@/lib/citations.functions";
import { FLAGSHIP_NAME, pageTitle } from "@/lib/brand";
import { seoHead } from "@/lib/seo";
import { MarketingBody, MarketingHero, MarketingSection } from "@/components/immune/marketing";

export const Route = createFileRoute("/methods")({
  head: () =>
    seoHead({
      title: pageTitle("Evidence & Methods"),
      description: `Understand the ${FLAGSHIP_NAME} graph, source curation, evidence statuses, model assumptions and scientific limitations.`,
      path: "/methods",
      type: "article",
    }),
  component: Methods,
});

function LiveEvidencePanel() {
  const { data, isError, isPending, isFetching, dataUpdatedAt, error } = useQuery(approvedQuery);
  const approvedClaim = (data ?? []).filter(
    (c) => c.relationship_id && c.claim_support === "supports",
  ).length;
  const withId = (data ?? []).filter((c) => c.pmid || c.doi).length;
  const fetchedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null;

  if (isError) {
    return (
      <div className="mkt-ev-panel" role="alert">
        <h3 id="live-ev-heading">Live evidence service</h3>
        <p>
          Evidence service unavailable
          {error instanceof Error ? ` (${error.message})` : ""}. This is a service error, not a finding that the graph
          has zero reviewed citations.
        </p>
        {fetchedAt ? <p className="mkt-aside">Last successful fetch: {fetchedAt}</p> : null}
      </div>
    );
  }

  const loading = isPending || (isFetching && !data);

  return (
    <div className="mkt-ev-panel" aria-labelledby="live-ev-heading">
      <h3 id="live-ev-heading">Live evidence service</h3>
      <dl className="mkt-ev-metrics">
        <div>
          <dt>Approved rows</dt>
          <dd>{loading ? "…" : (data?.length ?? 0)}</dd>
        </div>
        <div>
          <dt>With PMID/DOI</dt>
          <dd>{loading ? "…" : withId}</dd>
        </div>
        <div>
          <dt>Claim-supporting</dt>
          <dd>{loading ? "…" : approvedClaim}</dd>
        </div>
      </dl>
      <p className="mkt-aside">
        Fetched at <code>{fetchedAt ?? "—"}</code>. Only rows with <code>relationship_id</code> +{" "}
        <code>claim_support=supports</code> count as link support. Concept-level rows never inflate coverage.{" "}
        <Link to="/evidence">Full Evidence breakdown</Link>
      </p>
    </div>
  );
}

const METHODS_TOC = [
  { href: "#lifecycle", label: "Evidence lifecycle" },
  { href: "#live-ev-heading", label: "Live coverage" },
  { href: "#statuses", label: "Review statuses" },
  { href: "#ontology", label: "Graph ontology" },
  { href: "#models", label: "Model assumptions" },
  { href: "#limitations", label: "Limitations" },
] as const;

const LIFECYCLE = [
  {
    n: "01",
    title: "Claim",
    copy: "A directional relationship ID: REL-subject-relation-object.",
  },
  {
    n: "02",
    title: "Citation",
    copy: "PMID/DOI linked and metadata-checked — identity only, not claim approval.",
  },
  {
    n: "03",
    title: "Review",
    copy: "Human maps the source to the exact claim and sets claim_support.",
  },
  {
    n: "04",
    title: "Limits",
    copy: "Unreviewed stays labelled; sparse approval never implies clinical validation.",
  },
] as const;

function Methods() {
  const snap = graphReleaseSnapshot();
  const signs = Object.entries(SEM).reduce<Record<string, string[]>>((a, [rel, s]) => ((a[s] ||= []).push(rel), a), {});
  const statuses = Object.keys(STATUS_INFO) as ReviewStatus[];

  return (
    <div className="mkt-page methods">
      <MarketingHero
        eyebrow="Evidence & Methods"
        title="See what supports a claim—and where the evidence stops."
        lede={`${FLAGSHIP_NAME} distinguishes a source identifier, metadata verification and scientific assessment of a specific relationship. A citation counts as support only when mapped to that directional claim and reviewed. Educational teaching with references — not clinical decision support.`}
        foot={`Core ${snap.coreNodes} concepts / ${snap.coreRelationships} links · ${snap.draftNodes} draft concepts labelled · snapshot ${snap.snapshotAt}`}
      />

      <MarketingBody className="methods-body">
        <nav className="mkt-toc" aria-label="On this page">
          <span className="mkt-toc-label">On this page</span>
          <ol>
            {METHODS_TOC.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <MarketingSection
          id="lifecycle"
          eyebrow="01 / LIFECYCLE"
          title="Claims, citations, review, limits."
          lede="Trust comes from inspectable process — not decorative badges."
        >
          <ol className="mkt-lifecycle">
            {LIFECYCLE.map((step) => (
              <li key={step.n}>
                <span className="mkt-lifecycle-n">{step.n}</span>
                <strong>{step.title}</strong>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
          <div className="mkt-split">
            <div>
              <h3>Identifier verification ≠ claim approval</h3>
              <ul className="mkt-principle-list">
                <li>
                  <b>ID verification</b> — PubMed / Crossref confirms a PMID or DOI resolves → “Source linked,” not
                  Supported.
                </li>
                <li>
                  <b>Claim approval</b> — a human maps the source to <code>REL-…</code>, sets{" "}
                  <code>claim_support = supports</code>, and marks curation approved.
                </li>
                <li>No mass-approve path. Concept-level cites never inflate relationship coverage.</li>
              </ul>
            </div>
            <LiveEvidencePanel />
          </div>
        </MarketingSection>

        <MarketingSection
          id="statuses"
          eyebrow="02 / REVIEW STATUSES"
          title="Every relationship carries an honest label."
        >
          <ul className="mkt-status-panels">
            {statuses.map((s) => (
              <li key={s}>
                <span className={`badge rs rs-${s}`}>{STATUS_INFO[s].label}</span>
                <p>{STATUS_INFO[s].desc}</p>
              </li>
            ))}
          </ul>
        </MarketingSection>

        <MarketingSection
          id="ontology"
          eyebrow="03 / GRAPH"
          title="Typed concepts. Directional claims."
        >
          <p>
            Every concept is a typed node with a stable ID. Every link is one directional claim — subject, predicate,
            object — with relationship ID <code>REL-subject-predicate-object</code>, a mechanism, a confidence and,
            where known, a tissue.
          </p>
          <p className="mkt-aside">
            Release <code>{snap.snapshotAt}</code>: core v{snap.coreVersion} · {snap.coreNodes}/{snap.coreRelationships}{" "}
            core · extensions {snap.extensionsVersion} add {snap.draftNodes}/{snap.draftRelationships} drafts · runtime{" "}
            {snap.runtimeNodes}/{snap.runtimeRelationships}. Drafts are always labelled and never counted as approved
            evidence.
          </p>
          {snap.versionNotes ? <p className="mkt-aside">{snap.versionNotes}</p> : null}
          <h3 className="mkt-subhead">Relationship signs</h3>
          <ul className="mkt-principle-list">
            <li>
              <b>+</b> carries an effect forward (e.g. {signs["+"]?.slice(0, 4).join(", ")}).
            </li>
            <li>
              <b>−</b> flips it (e.g. {signs["-"]?.slice(0, 4).join(", ")}).
            </li>
            <li>
              <b>r+</b> is descriptive; a positive effect flows from object back to subject (e.g.{" "}
              {signs["r+"]?.slice(0, 3).join(", ")}).
            </li>
            <li>Other predicates are descriptive only and are not used in simulations.</li>
          </ul>
        </MarketingSection>

        <MarketingSection
          id="models"
          eyebrow="04 / MODELS"
          title="Assumptions stay explicit."
        >
          <ul className="mkt-principle-list">
            <li>
              <b>Perturbation (graph):</b> signed spread along + / − / r+ links, decaying 28% per hop, weighted by
              confidence, up to 4 hops. Direction, not real-world magnitude.
            </li>
            <li>
              <b>System simulator:</b> coupled equations in normalised units with hand-set parameters — not fitted to
              patient data.
            </li>
            <li>
              <b>Patient layer:</b> transparent additive rules. Educational illustration — not patient-specific advice.
            </li>
            <li>
              <b>Ask:</b> classify → retrieve graph context → attach reviewed relationship cites when present → optional
              synthesis from that extract only (prompt {PROMPT_VERSION}). Sparse cites mean Ask is graph-retrieved, not
              fully evidence-grounded. Answers can still be wrong.
            </li>
            <li>
              <b>Research / literature / adapters:</b> candidate workflows on <Link to="/research">Research</Link> —
              never auto-promoted into the curated graph. Advanced adapters are planned interfaces; dry-runs report not
              available.
            </li>
          </ul>
          <ModelRegistryPanel compact />
          <h3 className="mkt-subhead">Platform phases</h3>
          <ul className="mkt-phase-list">
            {IMPLEMENTATION_PHASES.map((p) => (
              <li key={p.id}>
                <span className="badge rs">
                  Phase {p.id} · {p.status.replace("_", " ")}
                </span>
                <strong>{p.title}</strong>
                <span>{p.notes}</span>
              </li>
            ))}
          </ul>
        </MarketingSection>

        <MarketingSection id="limitations" eyebrow="05 / LIMITS" title="Where the evidence stops.">
          <ul className="mkt-principle-list">
            <li>
              Most links have not yet been claim-checked; approved relationship claims remain sparse versus runtime link
              count and do not imply clinical validation.
            </li>
            <li>
              Exemplar progress is uneven: TNF→RA on-path edges have approved claim support; PD-1 / PD-L1 is partially
              reviewed; type-I IFN→SLE remains largely scaffold-ish outside a few reviewed edges.
            </li>
            <li>
              The Academy ships a navigable foundation scaffold plus in-development intermediate and advanced scaffolds —
              not a finished curriculum or Gate C coverage claim.
            </li>
            <li>Links simplify dose, timing, species and individual variation; tissue context is sparse.</li>
            <li>
              This product educates with references; it is not medical advice, clinician decision support, or
              patient-specific guidance. See the <Link to="/disclaimer">educational disclaimer</Link>.
            </li>
          </ul>
          <p className="mkt-aside">
            Accessibility: the knowledge graph has a <Link to="/graph">text table view</Link>; keyboard focus is always
            visible; detail drawers close with Escape.
          </p>
        </MarketingSection>
      </MarketingBody>
    </div>
  );
}
