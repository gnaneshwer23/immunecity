import InternalResearchGate from "@/components/immune/InternalResearchGate";
/**
 * HSI Discovery consume diagnostics (load order, honesty, licensing).
 * Product ASK→MAP→REVIEW UI lives at /hsi/discovery.
 * Research / HITL only — not CDS. Gate C stays pending; no auto-approve.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";
import {
  summarizeConsume,
  type ConsumeLoadResult,
} from "@/lib/hsi/discoveryConsume";
import { loadVendoredHsiDiscovery } from "@/lib/hsi/vendoredDiscovery";

const TOC = [
  { id: "honesty", label: "Honesty" },
  { id: "load", label: "Loaded artifacts" },
  { id: "ask", label: "ASK (RA)" },
  { id: "gate-c", label: "Gate C queue" },
  { id: "licensing", label: "Source licensing" },
  { id: "next", label: "Next" },
];

type LoaderData =
  | { ok: true; result: ConsumeLoadResult; summary: ReturnType<typeof summarizeConsume> }
  | { ok: false; error: string };

export const Route = createFileRoute("/hsi-consume")({
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
      title: `HSI Discovery diagnostics | ${PRODUCT_NAME}`,
      description:
        "Diagnostics for HSI Discovery JSON consume — research / HITL only. Product loop is /hsi/discovery. Not clinical decision support.",
      path: "/hsi-consume", noIndex: true,
    }),
  component: () => <InternalResearchGate><HsiConsumePage /></InternalResearchGate>,
});

function HsiConsumePage() {
  const data = Route.useLoaderData();

  if (!data.ok) {
    return (
      <main className="page">
        <PageHead
          kicker="HSI → ISI · diagnostics"
          title="HSI Discovery diagnostics"
          lede="Could not load HSI Discovery artifacts. Research surface only — not CDS."
        />
        <Section id="honesty" n={1} title="Load error" lede="Honesty asserts failed or artifacts unreachable.">
          <p className="callout" role="alert">
            {data.error}
          </p>
          <p className="small muted">
            Vendor copies live under <code>/hsi-discovery/</code>. Remote default is GitHub raw{" "}
            <code>gnaneshwer23/hsi-core</code> <code>site/public/discovery</code>. Set{" "}
            <code>HSI_ARTIFACT_BASE_URL</code> to override.
          </p>
        </Section>
      </main>
    );
  }

  const { result, summary } = data;
  const pendingCount = Array.isArray(result.gateC.pending)
    ? result.gateC.pending.length
    : Array.isArray(result.gateC.items)
      ? result.gateC.items.length
      : undefined;
  const lic = summary.licensingSummary;

  return (
    <main className="page">
      <PageHead
        kicker="HSI → ISI · diagnostics"
        title="HSI Discovery diagnostics"
        lede={`Load-order / honesty pin for ${PRODUCT_NAME}. Product ASK → MAP → REVIEW is at /hsi/discovery — notCds, no auto Gate C approve.`}
      />
      <PageToc items={TOC} />

      <Section
        id="honesty"
        n={1}
        title="Honesty banners"
        lede="Binding flags from the consume contract. Nothing here is clinical decision support."
      >
        <p className="small" style={{ marginBottom: 12 }}>
          Open the product Discovery loop: <Link to="/hsi/discovery">/hsi/discovery</Link>
        </p>
        <ul className="small" style={{ paddingLeft: 18 }}>
          <li>
            <strong>notCds</strong> = {String(result.honesty.notCds)}
          </li>
          <li>
            <strong>autoApproveIntoKg</strong> = {String(result.honesty.autoApproveIntoKg)}
          </li>
          <li>
            <strong>Gate C</strong> = pending (never auto-approve into product KG)
          </li>
          <li>
            <strong>partnerSigned (production)</strong> ={" "}
            {String(result.honesty.partnerSignedProduction)} · agreement ={" "}
            <code>{summary.partnerAgreementKind}</code>
            {" · "}
            Gate C never auto-approves even when named partner is locked.
          </li>
          <li>
            Source: <code>{summary.source}</code>
          </li>
        </ul>
      </Section>

      <Section
        id="load"
        n={2}
        title="Load order"
        lede="Artifacts available in this consumer pin (contract priority ∩ local/remote set)."
      >
        <p className="small muted">
          Grades (orthogonal): {summary.grades.join(" · ")}. ASK scope stays{" "}
          <code>{summary.askScope}</code>.
        </p>
        <ol className="small" style={{ paddingLeft: 18 }}>
          {result.loadedFiles.map((f) => (
            <li key={f}>
              <code>{f}</code>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="ask"
        n={3}
        title="ASK stays RA / anti-TNF"
        lede="Dual-track secondary packs (SSc / gut / neuro) must not replace the locked ASK question."
      >
        <p>
          Partner lock scopeLocked={String(result.partnerLock.scopeLocked ?? "—")} · lockedPilot=
          {String(result.partnerLock.lockedPilot ?? false)}.
        </p>
        <p className="small muted">
          Product ASK → MAP → REVIEW UI: <Link to="/hsi/discovery">/hsi/discovery</Link>. Full pilot pack JSON:{" "}
          <code>/hsi-discovery/hsi-pilot-evidence-pack.json</code>. Research Radar (ISI unknowns):{" "}
          <Link to="/discovery">/discovery</Link>; evidence at <Link to="/evidence">/evidence</Link>.
        </p>
      </Section>

      <Section
        id="gate-c"
        n={4}
        title="Gate C queue (pending)"
        lede="Human curation only. Approve / reject / defer on /hsi/discovery REVIEW → ISI Neon autumn-snow — never HSI red-wave, never auto-merge."
      >
        <p>
          Checklist rows stay <strong>pending</strong> until a reviewer acts
          {pendingCount != null ? ` · ~${pendingCount} pending entries in published JSON` : ""}.
        </p>
        <p className="small muted">
          Human queue: <Link to="/hsi/discovery">/hsi/discovery</Link> → REVIEW. Evidence claim path:{" "}
          <Link to="/curation">/curation</Link> (Check → supports → Approve). Model proposals are drafts only and
          must not flip <code>hsiGrade</code>.
        </p>
      </Section>

      <Section
        id="licensing"
        n={5}
        title="Source licensing stub"
        lede="PMID reuse posture from hsi-core curator review — not partner commercial clearance."
      >
        {lic ? (
          <dl className="grid g3 small">
            <div>
              <dt className="muted">PMIDs</dt>
              <dd>
                <b>{String(lic.pmidCount ?? "—")}</b>
              </dd>
            </div>
            <div>
              <dt className="muted">ok_oa</dt>
              <dd>
                <b>{String(lic.okOaCount ?? "—")}</b>
              </dd>
            </div>
            <div>
              <dt className="muted">restricted</dt>
              <dd>
                <b>{String(lic.restrictedCount ?? "—")}</b>
              </dd>
            </div>
            <div>
              <dt className="muted">unknown</dt>
              <dd>
                <b>{String(lic.unknownCount ?? "—")}</b>
              </dd>
            </div>
            <div>
              <dt className="muted">ok_cite</dt>
              <dd>
                <b>{String(lic.okCiteCount ?? "—")}</b>
              </dd>
            </div>
            <div>
              <dt className="muted">partnerCleared</dt>
              <dd>
                <b>{String(lic.partnerClearedCount ?? 0)}</b>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="small muted">Licensing stub not in this pin.</p>
        )}
      </Section>

      <Section id="next" n={6} title="Related surfaces">
        <ul className="small" style={{ paddingLeft: 18 }}>
          <li>
            <Link to="/methods">Methods</Link> — HSI grade panel
          </li>
          <li>
            <Link to="/evidence">Evidence</Link> — live claim coverage
          </li>
          <li>
            <Link to="/hsi/discovery">HSI Discovery</Link> — ASK → MAP → REVIEW product loop
          </li>
          <li>
            <Link to="/discovery">Research Radar</Link> — ISI coverage unknowns feed
          </li>
          <li>
            <a href="/hsi-discovery/hsi-isi-consume-contract.json">Consume contract JSON</a>
          </li>
        </ul>
      </Section>
    </main>
  );
}
