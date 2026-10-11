import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { lazy, Suspense } from "react";
import { PageHead } from "@/components/immune/ui";
import GraphTable from "@/components/immune/GraphTable";

const GraphView = lazy(() => import("@/components/immune/GraphView"));

export const Route = createFileRoute("/graph")({
  validateSearch: zodValidator(
    z.object({
      focus: fallback(z.string(), "").default(""),
      sim: fallback(z.string(), "").default(""),
      mode: fallback(z.string(), "").default(""),
    }),
  ),
  head: () => ({
    meta: [
      { title: "Knowledge graph: the causal map — Immune Super Intelligence" },
      { name: "description", content: "Explore every immune concept and typed causal link, and simulate blocking or activating any node." },
      { property: "og:title", content: "The causal map — Immune Super Intelligence" },
      { property: "og:description", content: "An interactive force graph of immune concepts and their causal links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GraphPage,
});

function Fallback() {
  return (
    <div className="page">
      <PageHead kicker="Layer 04 · Knowledge graph" title="The causal map" lede="Loading the graph…" />
    </div>
  );
}

function GraphPage() {
  const { focus, sim, mode } = Route.useSearch();
  return (
    <>
      <ClientOnly fallback={<Fallback />}>
        <Suspense fallback={<Fallback />}>
          <GraphView focusId={focus || null} simId={sim || null} modeParam={mode} />
        </Suspense>
      </ClientOnly>
      <div className="page graph-a11y-wrap"><GraphTable /></div>
    </>
  );
}
