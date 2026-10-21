import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { ART } from "@/components/immune/explain";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { byId, human } from "@/lib/immune/engine";
import { registryTerm } from "@/lib/immune/translational";
import { buildPipeline, isPipelineDisease, type PipelineGroup } from "@/lib/immune/pipeline";
import { getPipelineTrials } from "@/lib/liveData.functions";
import { TRIAL_REGISTRY, ctgStudyUrl } from "@/data/trialRegistry";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/pipeline/$disease")({
  loader: ({ params }) => {
    if (!isPipelineDisease(params.disease)) throw notFound();
    return { id: params.disease };
  },
  head: ({ loaderData, params }) => {
    const n = loaderData ? byId[loaderData.id] : undefined;
    if (!n) return seoHead({ title: `Pipeline unavailable | ${PRODUCT_NAME}`, description: "No pipeline for this disease.", path: `/pipeline/${params.disease}`, noIndex: true });
    return seoHead({
      title: `${n.name} pipeline: mechanisms, therapies and active trials | ${PRODUCT_NAME}`,
      description: `How ${n.name} treatments map to immune mechanisms, the landmark trials behind them and what is in active phase 2–4 testing. Educational, not treatment advice.`,
      path: `/pipeline/${n.id}`,
    });
  },
  notFoundComponent: () => (
    <div className="page">
      <h1>No pipeline for this disease</h1>
      <p className="lede">It has no curated therapies yet. <Link to="/pipeline">Browse disease pipelines</Link>.</p>
    </div>
  ),
  component: PipelinePage,
});

const TOC = [
  { id: "mechanisms", label: "By mechanism" },
  { id: "active", label: "Active trials" },
  { id: "limits", label: "How to read this" },
];

const statusText = (s: string) => s.replace(/_/g, " ").toLowerCase();

function phaseCounts(groups: PipelineGroup[]) {
  const seen = new Map<string, string>();
  for (const g of groups) for (const s of g.studies) seen.set(s.nctId, s.phase ?? "n/a");
  const counts: Record<string, number> = {};
  for (const p of seen.values()) counts[p] = (counts[p] ?? 0) + 1;
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
}

function GroupCard({ g }: { g: PipelineGroup }) {
  return (
    <article className="card isi-pipe-group" id={g.target ? `mech-${g.target.id}` : "mech-other"}>
      <header className="isi-pipe-group-head">
        <h3>{g.target ? <Link to="/atlas/$id" params={{ id: g.target.id }}>{g.target.name}</Link> : "Other mechanisms"}</h3>
        <span className="xs muted">
          {!g.target
            ? "Interventions not mapped to a curated therapy"
            : g.curated.length
              ? "Graph target"
              : "In active testing — not yet linked to this disease in the graph"}
          {" "}· {g.curated.length} curated · {g.studies.length} active
        </span>
      </header>
      {g.curated.length ? (
        <ul className="isi-pipe-curated">
          {g.curated.map((r) => (
            <li key={r.therapy.id}>
              <Link to="/atlas/$id" params={{ id: r.therapy.id }}><b>{r.therapy.name}</b></Link>
              {r.targets[0] ? <span className="xs muted"> {human(r.targets[0].edge.relation)} {r.targets[0].node.name}</span> : null}
              {r.viaClass ? <span className="xs muted"> · via {r.viaClass.name}</span> : null}
              {r.outcome === "failed" ? <span className="xs isi-tx-failed"> · failed or harmful here</span> : null}
              {r.trials.map((t) => (
                <span key={t.id} className="xs">
                  {" · "}<Link to="/atlas/$id" params={{ id: t.id }}>{t.name}</Link>
                  {TRIAL_REGISTRY[t.id]?.studies.map((s) => (
                    <a key={s.nctId} className="isi-nct" href={ctgStudyUrl(s.nctId)} target="_blank" rel="noopener noreferrer">{s.nctId}</a>
                  ))}
                </span>
              ))}
            </li>
          ))}
        </ul>
      ) : null}
      {g.studies.length ? (
        <ul className="isi-active-list">
          {g.studies.slice(0, 8).map((s) => (
            <li key={s.nctId}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
              <span className="xs muted">
                {" "}· {s.nctId} · {s.phase ? `phase ${s.phase} · ` : ""}{statusText(s.status)}{s.sponsor ? ` · ${s.sponsor}` : ""}
                {s.matched.length ? ` · matched: ${s.matched.map((m) => m.name).join(", ")}` : ""}
              </span>
            </li>
          ))}
          {g.studies.length > 8 ? <li className="xs muted">+{g.studies.length - 8} more in this group</li> : null}
        </ul>
      ) : null}
    </article>
  );
}

function PipelinePage() {
  const { id } = Route.useLoaderData();
  const n = byId[id]!;
  const condition = registryTerm(n.name);
  const q = useQuery({
    queryKey: ["pipeline-trials", condition],
    queryFn: () => getPipelineTrials({ data: { condition } }),
    staleTime: 60 * 60 * 1000,
  });
  const live = q.data && !q.data.unavailable ? q.data : null;
  const groups = buildPipeline(id, live?.studies ?? []);
  const curatedGroups = groups.filter((g) => g.curated.length);
  const phases = phaseCounts(groups);

  return (
    <div className="page">
      <PageHead
        art={ART.diseaseArt}
        kicker="Investigate · Disease pipeline"
        title={`${n.name}: from mechanism to active trials`}
        lede={<>Curated therapies grouped by the immune target they act on, with the landmark trials behind them, then what ClinicalTrials.gov lists as active now. <Link to="/atlas/$id" params={{ id }}>Read the {n.name} concept page</Link>.</>}
        stats={[
          { v: curatedGroups.length, l: "MECHANISMS IN GRAPH" },
          { v: curatedGroups.reduce((k, g) => k + g.curated.length, 0), l: "CURATED THERAPIES" },
          { v: q.isPending ? "…" : live ? live.total.toLocaleString("en-GB") : "Unavailable", l: "ACTIVE PHASE 2–4 TRIALS*" },
        ]}
      />
      <PageToc items={TOC} />

      <Section
        id="mechanisms"
        title="Treatments by mechanism"
        lede="Each card is one immune target from the curated graph. Under it: therapies that act on it for this disease, then active registry studies whose intervention is one of those therapies."
      >
        <div className="isi-pipe-groups">
          {groups.filter((g) => g.target).map((g) => <GroupCard key={g.target!.id} g={g} />)}
        </div>
      </Section>

      <Section
        id="active"
        title="Active trials outside the curated mechanisms"
        lede={
          live
            ? <>Showing the {live.studies.length} most relevant of {live.total.toLocaleString("en-GB")} active studies whose registered condition is “{condition}”. Studies are only placed under a mechanism when their intervention names a curated therapy — the rest stay here, unclassified.</>
            : "Live registry data loads from ClinicalTrials.gov."
        }
      >
        {q.isPending ? <p className="small muted" role="status">Checking ClinicalTrials.gov…</p> : null}
        {q.isError || q.data?.unavailable ? <p className="small muted" role="status">The registry is unavailable right now. Curated mechanisms above are unaffected.</p> : null}
        {live ? (
          <>
            {phases.length ? (
              <p className="small">Phase mix of the studies shown: {phases.map(([p, c]) => `${c} × phase ${p}`).join(" · ")}</p>
            ) : null}
            {groups.filter((g) => !g.target).map((g) => <GroupCard key="other" g={g} />)}
            <p className="small">
              <a href={`https://clinicaltrials.gov/search?${new URLSearchParams({ cond: condition })}`} target="_blank" rel="noopener noreferrer">
                Search all {n.name} studies on ClinicalTrials.gov <ExternalLink size={12} aria-hidden />
              </a>
            </p>
          </>
        ) : null}
      </Section>

      <Section id="limits" title="How to read this" lede="What this page can and cannot tell you.">
        <ul className="mkt-principle-list">
          <li>Curated rows come from the reviewed knowledge graph; many links are still awaiting claim review — see Methods.</li>
          <li>*Active = recruiting, not yet recruiting, enrolling by invitation or active; phase 2–4 includes combined phase 1/2 studies.</li>
          <li>Active trials are a live, uncurated registry search. Matching to mechanisms uses exact drug names only, so new agents without a graph entry appear under “Other”.</li>
          <li>Landmark trial IDs are verified against ClinicalTrials.gov; trials that predate registries are labelled on their concept pages.</li>
          <li>This is not clinical decision support and does not assess whether anyone is eligible for a trial.</li>
        </ul>
      </Section>
    </div>
  );
}
