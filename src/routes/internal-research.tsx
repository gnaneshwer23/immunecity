import { lazy, Suspense, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { loadInternalResearchProgramme } from "@/lib/research/internalProgramme.functions";
import type { SyntheticProgramme } from "@/lib/research/syntheticProgramme";
import { seoHead } from "@/lib/seo";

const Programme = lazy(() => import("@/components/immune/SyntheticConditionProgramme"));
const Melanoma = lazy(() => import("@/components/immune/MelanomaEvidenceExplorer"));
const Workbench = lazy(() => import("@/components/immune/ScientificWorkbench"));
const Brief = lazy(() => import("@/components/immune/ResearchBriefPanel"));
const Models = lazy(() => import("@/components/immune/ModelRegistryPanel"));
const Quality = lazy(() => import("@/components/immune/AskQualityDashboard"));
const Literature = lazy(() => import("@/components/immune/LiteratureQueue"));
const Investigations = lazy(() => import("@/components/immune/InvestigationPanel"));
const ContextAnnotationPractice = lazy(() => import("@/components/immune/ContextAnnotationPractice"));
export const Route = createFileRoute("/internal-research")({
  head: () => seoHead({ title: "Internal research workspace", description: "Restricted internal testing workspace.", path: "/internal-research", noIndex: true }),
  component: InternalResearch,
});
function InternalResearch() {
  const load = useServerFn(loadInternalResearchProgramme);
  const [data, setData] = useState<SyntheticProgramme | null>(null);
  const [pending, setPending] = useState(true);
  useEffect(() => {
    let active = true;
    load().then((result) => { if (active) setData(result); }).catch(() => { if (active) setData(null); }).finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [load]);
  if (!data) return <main className="page"><h1>Internal research workspace</h1><p role="status">{pending ? "Checking access…" : "Administrator access is required. Your session and stored role must be verified before this workspace can load."}</p></main>;
  return <main className="page"><h1>Internal research workspace</h1><p>Administrator-only workflow testing. Nothing here approves scientific evidence.</p>
    <nav aria-label="Internal tools"><a href="/reasoning">Reasoning tools</a>{" · "}<a href="/simulator">Simulation</a>{" · "}<a href="/patient">Patient-rule testing</a>{" · "}<a href="/hsi/discovery">HSI integration</a>{" · "}<a href="/hsi-consume">Integration diagnostics</a></nav>
    <Suspense fallback={<p>Loading workspace…</p>}><Investigations /><ContextAnnotationPractice /><Programme initialData={data} /><Melanoma /><h2>Investigation workbench</h2><Workbench /><h2>Draft brief</h2><Brief /><h2>Literature curation queue</h2><Literature /><h2>Model interfaces</h2><Models /><h2>Quality diagnostics</h2><Quality /></Suspense></main>;
}
