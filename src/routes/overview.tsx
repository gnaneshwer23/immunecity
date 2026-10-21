import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { KG, TYPES, SPINE_DESC, byId, human, nodesOf, spineLabel, type NodeType } from "@/lib/immune/engine";
import { graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { CONTENT } from "@/data/content";
import { NAV_GROUPS } from "@/components/immune/nav";
import { Button } from "@/components/ui/button";
import {
  MarketingBody,
  MarketingCta,
  MarketingHero,
  MarketingSection,
  WontClaimList,
} from "@/components/immune/marketing";
import {
  ASK_PUBLIC_LINE,
  ATLAS_CTA,
  ATLAS_PATH,
  FLAGSHIP_NAME,
  LEARN_PATH,
  PRODUCT_NAME,
  pageTitle,
} from "@/lib/brand";
import { approvedQuery } from "@/lib/citations.functions";
import {
  EXEMPLAR_MATURITY_LABEL,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
} from "@/lib/immune/exemplarPathways";
import { KNOWLEDGE_DOMAINS } from "@/lib/immune/domainCoverage";
import { seoHead } from "@/lib/seo";

type DraftRoute = {
  title: string;
  chain: string[];
  desc: string;
  draft?: boolean;
};

function draftRoute(title: string): DraftRoute | null {
  const r = CONTENT.routes.find((x) => x.title === title);
  if (!r || !("draft" in r) || !r.draft) return null;
  return r as DraftRoute;
}

/** Draft teaching chains — not reviewed exemplars; claim review incomplete. */
const DRAFT_TEACHING_CHAINS = (
  [
    {
      id: "draft-pathway",
      title: "Fibre → butyrate → Treg → IBD",
      lessonId: "microbiome",
      lessonLabel: "Microbiome mechanism lesson",
      lede: "Draft microbiome teaching path — claim review incomplete. Not a reviewed exemplar.",
    },
    {
      id: "draft-vaccine",
      title: "Vaccine → germinal centre → memory",
      lessonId: "vaccines",
      lessonLabel: "Vaccines mechanism lesson",
      lede: "Draft vaccine path from germinal-centre maturation to memory and titre. Not a finished Academy course.",
    },
    {
      id: "draft-hla",
      title: "Shared epitope → ACPA → RA",
      lessonId: "immunogenetics",
      lessonLabel: "Immunogenetics mechanism lesson",
      lede: "Draft immunogenetics bridge into the RA neighbourhood — association teaching, not mechanism-complete.",
    },
  ] as const
).flatMap((def) => {
  const route = draftRoute(def.title);
  return route ? [{ ...def, route }] : [];
});

const SPINE_TYPE: Record<string, NodeType> = {
  TRIGGER: "PATHOGEN",
  RECOGNITION: "RECEPTOR",
  SIGNALLING: "PATHWAY",
  RESPONSE: "CELL",
  CONSEQUENCE: "MOLECULE",
  FAILURE: "PATHWAY",
  DISEASE: "DISEASE",
  BIOMARKER: "BIOMARKER",
  TARGET: "RECEPTOR",
  THERAPY: "INTERVENTION",
  TRIAL: "TRIAL",
  PATIENT: "COMPARTMENT",
  DATA: "DATA",
  MODEL: "AI_METHOD",
  DISCOVERY: "DISCOVERY",
};

export const Route = createFileRoute("/overview")({
  head: () =>
    seoHead({
      title: pageTitle("Platform"),
      description: `Explore immune cells, mechanisms, disease biology, therapies and evidence through ${FLAGSHIP_NAME} — the ${PRODUCT_NAME} flagship atlas. Causal spine, twelve layers and an educational model with references.`,
      path: "/overview",
    }),
  component: Overview,
});

function DraftChainBlock({
  route,
  lessonId,
  lessonLabel,
}: {
  route: DraftRoute;
  lessonId: string;
  lessonLabel: string;
}) {
  return (
    <>
      <div className="mkt-draft-teaser">
        <span className="badge rs rs-draft">Draft</span>
        <p>{route.desc}</p>
      </div>
      <div
        className="mkt-chain"
        role="group"
        aria-label={`Draft chain: ${route.chain.map((id) => byId[id]?.name ?? id).join(" leads to ")}`}
      >
        {route.chain.map((id, i) => {
          const node = byId[id];
          if (!node) return null;
          const t = TYPES[node.node_type];
          return (
            <Fragment key={id}>
              {i > 0 ? <span className="mkt-chain-arrow" aria-hidden="true" /> : null}
              <Link className="mkt-chain-node" to="/graph" search={{ focus: id }}>
                <span className="mkt-chain-meta">
                  {String(i + 1).padStart(2, "0")} · {t.label}
                  {node.draft ? " · draft" : ""}
                </span>
                <span className="mkt-chain-name">
                  <span className="dot" style={{ background: `var(${t.c})` }} />
                  {node.name}
                </span>
              </Link>
            </Fragment>
          );
        })}
      </div>
      <p className="mkt-aside">
        Teaching path.{" "}
        <Link to="/mechanism/$id" params={{ id: lessonId }}>
          {lessonLabel}
        </Link>
        {" · "}
        <Link to="/graph" search={{ focus: route.chain[0] ?? "" }}>
          Open in graph
        </Link>
      </p>
    </>
  );
}

function Overview() {
  const [activeRoute, setActiveRoute] = useState(0);
  const [spineStep, setSpineStep] = useState<string | null>(KG.core_spine[0] ?? null);
  const featured = CONTENT.routes.slice(0, 4);
  const selected = featured[activeRoute];
  const snap = graphReleaseSnapshot();
  const layers = NAV_GROUPS.flatMap((g) => g.items.filter((l) => l.path !== "/"));
  const primaryExemplar = EXEMPLAR_PATHWAYS.find((p) => p.id === "ex-tnf-ra") ?? EXEMPLAR_PATHWAYS[0]!;
  const { data: approvedCites = [], isPending: citesPending, isError: citesError } = useQuery(approvedQuery);
  const primaryReport = reportExemplar(primaryExemplar, approvedCites);
  const pathwayMaturityLine = citesPending
    ? "Loading review status…"
    : citesError
      ? "Evidence service unavailable — status may be stale."
      : EXEMPLAR_MATURITY_LABEL[primaryReport.maturity];

  function selectSpineStage(step: string) {
    setSpineStep(step);
    document.getElementById("spine")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mkt-page overview-page">
      <MarketingHero
        eyebrow={`Platform · ${FLAGSHIP_NAME}`}
        title="One connected view of immunology."
        lede={`${FLAGSHIP_NAME} brings cells, mechanisms, disease biology, therapies and evidence into a shared causal map. Orient here, then open a layer or the live graph.`}
        actions={
          <>
            <Button asChild className="bio-primary">
              <Link to={ATLAS_PATH}>
                {ATLAS_CTA} <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to="/ask">Ask Immune</Link>
            </Button>
            <Button asChild variant="ghost" className="bio-secondary">
              <Link to={LEARN_PATH}>Explore the Academy</Link>
            </Button>
          </>
        }
        aside={
          <div className="spine-glance" aria-label="The 15-step causal spine at a glance">
            <div className="spine-glance-head">
              <span>Causal spine</span>
              <span>{KG.core_spine.length} steps</span>
            </div>
            <ol>
              {KG.core_spine.map((step, i) => (
                <li key={step}>
                  <a href="#spine" onClick={(e) => { e.preventDefault(); selectSpineStage(step); }}>
                    <span className="sg-n">{String(i + 1).padStart(2, "0")}</span>
                    {spineLabel(step)}
                  </a>
                </li>
              ))}
            </ol>
            <dl className="spine-glance-stats">
              <div><dt>Core concepts</dt><dd>{snap.coreNodes}</dd></div>
              <div><dt>Core links</dt><dd>{snap.coreRelationships}</dd></div>
              <div><dt>Layers</dt><dd>{layers.length}</dd></div>
            </dl>
          </div>
        }
        foot={`Release ${snap.snapshotAt} · ${snap.coreNodes} core concepts · ${snap.coreRelationships} core links · ${layers.length} atlas layers · drafts labelled`}
      />

      <MarketingBody>
        <MarketingSection
          id="enter"
          eyebrow="Start here"
          title="Three ways in."
          lede="One atlas — choose how you want to begin."
        >
          <div className="mkt-enter-rail" role="list">
            <Link className="mkt-enter" to={LEARN_PATH} role="listitem">
              <span className="mkt-enter-kicker">Learn</span>
              <strong>Academy &amp; mechanisms</strong>
              <span>Walk teaching cascades, then inspect the linked graph concepts.</span>
            </Link>
            <Link className="mkt-enter" to="/graph" role="listitem">
              <span className="mkt-enter-kicker">Explore</span>
              <strong>Causal knowledge graph</strong>
              <span>Filter typed concepts and follow directional relationships.</span>
            </Link>
            <Link className="mkt-enter" to="/ask" role="listitem">
              <span className="mkt-enter-kicker">Investigate</span>
              <strong>Ask Immune</strong>
              <span>{ASK_PUBLIC_LINE}</span>
            </Link>
          </div>
        </MarketingSection>

        <MarketingSection
          id="pathway"
          eyebrow="Exemplar pathway"
          title={primaryExemplar.title}
          lede={`Primary reviewed exemplar from the curated graph. Review labels reflect approved claim cites when available. ${pathwayMaturityLine}`}
        >
          <ol className="mkt-path" aria-label={`${primaryExemplar.title} relationships`}>
            {primaryReport.segments.flatMap((seg, si) =>
              (seg.steps ?? []).map((step, i) => {
                const rid = seg.relIds[i]!;
                // Segments can share a link; show each relationship once.
                if (primaryReport.segments.findIndex((s2) => s2.relIds.includes(rid)) !== si || seg.relIds.indexOf(rid) !== i) return null;
                const review = seg.reviews[i]!;
                const label = primaryReport.edgeReviews.find((x) => x.relId === rid)?.label ?? String(review);
                const subj = byId[step.r.subject_id];
                const obj = byId[step.r.object_id];
                if (!subj || !obj) return null;
                return (
                  <li key={`${si}-${rid}-${i}`}>
                    <Link className="mkt-path-hop" to="/graph" search={{ focus: step.r.subject_id }}>
                      <span className="mkt-path-names">
                        <strong>{subj.name}</strong>
                        <span className="mkt-path-rel">{human(step.r.relation)}</span>
                        <strong>{obj.name}</strong>
                      </span>
                      <span className={`badge rs rs-${review}`}>{label}</span>
                    </Link>
                  </li>
                );
              }),
            )}
          </ol>
          <p className="mkt-aside">
            {primaryExemplar.purpose} Teaching axis — not a complete disease model.{" "}
            <Link to="/methods">Evidence methods</Link>
            {EXEMPLAR_PATHWAYS.length > 1 ? (
              <>
                {" · "}
                {EXEMPLAR_PATHWAYS.filter((p) => p.id !== primaryExemplar.id).map((p, i) => {
                  const r = reportExemplar(p, approvedCites);
                  return (
                    <Fragment key={p.id}>
                      {i > 0 ? " · " : null}
                      <span>
                        {p.title}:{" "}
                        {citesPending
                          ? "loading…"
                          : citesError
                            ? "status unavailable"
                            : EXEMPLAR_MATURITY_LABEL[r.maturity]}
                      </span>
                    </Fragment>
                  );
                })}
              </>
            ) : null}
          </p>
        </MarketingSection>

        {DRAFT_TEACHING_CHAINS.map((chain, idx) => (
          <MarketingSection
            key={chain.id}
            id={chain.id}
            eyebrow="Draft pathway"
            title={chain.route.title}
            lede={chain.lede}
          >
            <DraftChainBlock
              route={chain.route}
              lessonId={chain.lessonId}
              lessonLabel={chain.lessonLabel}
            />
          </MarketingSection>
        ))}

        <MarketingSection
          id="draft-domains"
          eyebrow="Draft domains"
          title="Extension domains still under claim review."
          lede="Teaching paths already in the atlas — each stays Draft until claim cites are reviewed. Not finished Academy courses."
        >
          <ul className="mkt-domain-strip" aria-label="Draft knowledge domains">
            {KNOWLEDGE_DOMAINS.map((d) => (
              <li key={d.id}>
                <Link to="/mechanism/$id" params={{ id: d.lessonId }}>
                  <span className="badge rs rs-draft">Draft</span>
                  <strong>{d.label}</strong>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mkt-aside">
            Coverage detail: <Link to="/methods" hash="live-ev-heading">Methods</Link>
            {" · "}
            <Link to="/evidence" hash="coverage">Evidence explorer</Link>
            {" · "}
            Extra reading on <Link to={LEARN_PATH} hash="extra-reading">Academy</Link>
          </p>
        </MarketingSection>

        <MarketingSection
          id="spine"
          eyebrow="Causal spine"
          title="Fifteen stages from trigger to discovery."
          lede="Select a stage to preview curated example concepts. Drafts are excluded from the preview."
        >
          <div className="mkt-spine" role="tablist" aria-label="Causal spine stages">
            {KG.core_spine.map((step, i) => (
              <button
                type="button"
                role="tab"
                key={step}
                aria-selected={spineStep === step}
                className={`mkt-spine-step${spineStep === step ? " active" : ""}`}
                onClick={() => setSpineStep(spineStep === step ? null : step)}
              >
                <span className="mkt-spine-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="mkt-spine-label">{spineLabel(step)}</span>
              </button>
            ))}
            <span className="mkt-spine-loop" aria-hidden="true">
              <span className="mkt-spine-num">↺</span>
              <span className="mkt-spine-label">FEEDBACK</span>
            </span>
          </div>
          {spineStep ? (() => {
            const type = SPINE_TYPE[spineStep];
            const examples = type ? nodesOf(type).filter((n) => !n.draft).slice(0, 8) : [];
            const t = type ? TYPES[type] : null;
            return (
              <div className="mkt-spine-detail" role="tabpanel">
                <div className="mkt-spine-detail-head">
                  <strong>{spineLabel(spineStep)}</strong>
                  <span>
                    {SPINE_DESC[spineStep] ?? ""}
                    {t ? ` — shown as “${t.label}” concepts in the graph` : ""}
                  </span>
                </div>
                <div className="mkt-spine-nodes">
                  {examples.map((n) => (
                    <Link key={n.id} className="mkt-spine-node" to="/graph" search={{ focus: n.id }}>
                      <span className="dot" style={{ background: t ? `var(${t.c})` : undefined }} />
                      {n.name}
                    </Link>
                  ))}
                  {examples.length === 0 ? (
                    <span className="mkt-empty">No curated concepts at this stage yet.</span>
                  ) : null}
                </div>
              </div>
            );
          })() : (
            <p className="mkt-empty">Select a spine stage to preview example concepts.</p>
          )}
        </MarketingSection>

        <MarketingSection
          id="chain"
          eyebrow="Signal chain"
          title="One signal. A chain of consequences."
          lede="Trace a teaching route from trigger toward treatment context."
        >
          <div className="mkt-chain-tabs" role="tablist" aria-label="Featured mechanisms">
            {featured.map((r, i) => (
              <button
                key={r.title}
                type="button"
                role="tab"
                id={`route-tab-${i}`}
                className={`mkt-chain-tab${activeRoute === i ? " active" : ""}`}
                aria-selected={activeRoute === i}
                aria-controls="route-panel"
                onClick={() => setActiveRoute(i)}
              >
                {r.title}
              </button>
            ))}
          </div>
          {selected ? (
            <div className="mkt-chain-panel" id="route-panel" role="tabpanel" aria-labelledby={`route-tab-${activeRoute}`}>
              <p>{selected.desc}</p>
              <div
                className="mkt-chain"
                role="group"
                aria-label={`Causal chain: ${selected.chain.map((id: string) => byId[id]?.name ?? id).join(" leads to ")}`}
              >
                {selected.chain.map((id: string, i: number) => {
                  const node = byId[id];
                  if (!node) return null;
                  const t = TYPES[node.node_type];
                  return (
                    <Fragment key={id}>
                      {i > 0 ? <span className="mkt-chain-arrow" aria-hidden="true" /> : null}
                      <Link className="mkt-chain-node" to="/graph" search={{ focus: id }}>
                        <span className="mkt-chain-meta">
                          {String(i + 1).padStart(2, "0")} · {t.label}
                        </span>
                        <span className="mkt-chain-name">
                          <span className="dot" style={{ background: `var(${t.c})` }} />
                          {node.name}
                        </span>
                      </Link>
                    </Fragment>
                  );
                })}
              </div>
              <p className="mkt-aside">
                {selected.chain.length} concepts · evidence status shown in the graph
                {"draft" in selected && selected.draft ? (
                  <>
                    {" · "}
                    <span className="badge rs rs-draft">Draft</span>
                  </>
                ) : null}
                {" · "}
                <Link to="/graph" search={{ focus: selected.chain[0] ?? "" }}>
                  Trace this pathway
                </Link>
              </p>
            </div>
          ) : null}
        </MarketingSection>

        <MarketingSection
          id="layers"
          eyebrow="Atlas layers"
          title="Different lenses. One immune system."
          lede="Twelve layers organise the atlas. Academy is a learning overlay — not a thirteenth layer."
        >
          <ul className="mkt-layer-grid">
            {layers.map((layer) => (
              <li key={layer.path}>
                <Link to={layer.path} className="mkt-layer">
                  <span className="mkt-layer-num">{layer.n}</span>
                  <span>
                    <strong>{layer.title}</strong>
                    <small>{layer.desc}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </MarketingSection>

        <MarketingSection
          id="honesty"
          eyebrow="Limits"
          title="What this platform is — and is not."
          lede="Labels describe what ships today, not what is planned."
        >
          <WontClaimList />
          <p className="mkt-aside">
            <Link to="/methods" hash="live-ev-heading">Live coverage</Link>
            {" · "}
            <Link to="/disclaimer">Educational disclaimer</Link>
            {" · "}
            <Link to="/ask">Ask Immune</Link>
          </p>
        </MarketingSection>

        <MarketingCta
          title="Open the live atlas."
          lede="Start in the graph, ask a question, or review claim coverage on Methods."
        >
          <Button asChild className="bio-primary">
            <Link to={ATLAS_PATH}>
              {ATLAS_CTA} <ArrowUpRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to="/ask">Ask Immune</Link>
          </Button>
          <Button asChild variant="ghost" className="bio-secondary">
            <Link to="/methods" hash="live-ev-heading">Live coverage</Link>
          </Button>
        </MarketingCta>
      </MarketingBody>
    </div>
  );
}
