import { seoHead } from "@/lib/seo";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { lazy, Suspense } from "react";
import { PageHead } from "@/components/immune/ui";

const GraphView = lazy(() => import("@/components/immune/GraphView"));

export const Route = createFileRoute("/graph")({
  validateSearch: zodValidator(
    z.object({
      focus: fallback(z.string(), "").default(""),
      sim: fallback(z.string(), "").default(""),
      mode: fallback(z.string(), "").default(""),
    }),
  ),
  head: () => seoHead({ title: "Knowledge graph: the causal map — Immune Super Intelligence", description: "Explore every immune concept and typed causal link, and simulate blocking or activating any node.", path: "/graph" }),
  component: GraphPage,
});

function Fallback() {
  return (
    <div className="page graph-explorer">
      <PageHead
        kicker="Layer 04 · Immune City · Knowledge graph"
        title="The causal map"
        lede="Loading the graph…"
      />
      <p className="empty" role="status">
        Preparing the explorer — typed concepts and directional links from the curated graph.
      </p>
    </div>
  );
}

function GraphPage() {
  const { focus, sim, mode } = Route.useSearch();
  return (
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <GraphView focusId={focus || null} simId={sim || null} modeParam={mode} />
      </Suspense>
    </ClientOnly>
  );
}
