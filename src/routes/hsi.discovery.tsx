import InternalResearchGate from "@/components/immune/InternalResearchGate";
/**
 * Product HSI Discovery surface — ASK → MAP → REVIEW (+ optional VALIDATE / TRANSLATE).
 * Distinct from Research Radar at /discovery. Research / HITL only — not CDS.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { Section } from "@/components/immune/page";
import { HsiDiscoveryLoop } from "@/components/immune/HsiDiscoveryLoop";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";
import {
  summarizeConsume,
  type ConsumeLoadResult,
} from "@/lib/hsi/discoveryConsume";
import { loadVendoredHsiDiscovery } from "@/lib/hsi/vendoredDiscovery";

type LoaderData =
  | { ok: true; result: ConsumeLoadResult; summary: ReturnType<typeof summarizeConsume> }
  | { ok: false; error: string };

export const Route = createFileRoute("/hsi/discovery")({
  ssr: false,
  loader: async (): Promise<LoaderData> => {
    try {
      const result = await loadVendoredHsiDiscovery();
      return { ok: true, result, summary: summarizeConsume(result) };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
  head: () =>
    seoHead({
      title: `HSI Discovery | ${PRODUCT_NAME}`,
      description:
        "ASK → MAP → REVIEW on published HSI Discovery packs — research / HITL only. Not clinical decision support. Gate C never auto-approves.",
      path: "/hsi/discovery", noIndex: true,
    }),
  component: () => <InternalResearchGate><HsiDiscoveryPage /></InternalResearchGate>,
});

function HsiDiscoveryPage() {
  const data = Route.useLoaderData();

  if (!data.ok) {
    return (
      <main className="page">
        <PageHead
          kicker="Research · HSI Discovery"
          title="HSI Discovery"
          lede="Could not load vendored HSI Discovery packs. Research surface only — not CDS."
        />
        <Section id="error" n={1} title="Load error" lede="Honesty asserts failed or artifacts unreachable.">
          <p className="callout" role="alert">
            {data.error}
          </p>
          <p className="small muted">
            Vendor copies live under <code>/hsi-discovery/</code>. Diagnostics:{" "}
            <Link to="/hsi-consume">/hsi-consume</Link>.
          </p>
        </Section>
      </main>
    );
  }

  const { result, summary } = data;

  return (
    <main className="page">
      <PageHead
        kicker="Research · HSI Discovery"
        title="ASK → MAP → REVIEW"
        lede={`Published HSI packs for ${PRODUCT_NAME} — notCds, no auto Gate C approve. Partner scope stays RA / anti-TNF (${summary.askScope}).`}
      />
      <Section
        id="workspace"
        n={1}
        title="Discovery workspace"
        lede={`Loaded ${summary.artifactCount} contract artifacts from ${summary.source}. Grades: ${summary.grades.join(" · ")}.`}
      >
        <HsiDiscoveryLoop result={result} />
        <p className="small muted" style={{ marginTop: 16 }}>
          Research Radar (ISI coverage unknowns) stays at <Link to="/discovery">/discovery</Link>.
          Consume diagnostics at <Link to="/hsi-consume">/hsi-consume</Link>. Evidence explorer:{" "}
          <Link to="/evidence">/evidence</Link>.
        </p>
      </Section>
    </main>
  );
}
