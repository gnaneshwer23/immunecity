/**
 * Public HSI → ISI Discovery consume surface.
 * Research / HITL only — not CDS. Gate C stays pending; no auto-approve.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import { seoHead } from "@/lib/seo";
import {
  loadHsiDiscoveryConsume,
  summarizeConsume,
  type ConsumeLoadResult,
} from "@/lib/hsi/discoveryConsume";

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
  loader: async (): Promise<LoaderData> => {
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.VITE_SITE_ORIGIN ||
            process.env.E2E_BASE_URL ||
            "http://127.0.0.1:4173";
      // Prefer local vendor during SSR (reliable).
      const result = await loadHsiDiscoveryConsume({
        origin,
        preferLocal: true,
      });
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
      title: `HSI Discovery consume | ${PRODUCT_NAME}`,
      description:
        "ISI consumer view of HSI Discovery JSON — research / HITL only. Not clinical decision support. Gate C never auto-approves.",
      path: "/hsi-consume",
    }),
  component: HsiConsumePage,
});

function HsiConsumePage() {
  const data = Route.useLoaderData();

  if (!data.ok) {
    return (
      <main className="page">
        <PageHead
          kicker="HSI → ISI"
          title="HSI Discovery consume"
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
        kicker="HSI → ISI"
        title="HSI Discovery consume"
        lede={`Published HSI packs for ${PRODUCT_NAME} Discovery / evidence — notCds, no auto Gate C approve, no production MoU.`}
      />
      <PageToc items={TOC} />

      <Section
        id="honesty"
        n={1}
        title="Honesty banners"
        lede="Binding flags from the consume contract. Nothing here is clinical decision support."
      >
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
            <strong>partnerSigned (production)</strong> = false · fixture kind ={" "}
            <code>{summary.partnerAgreementKind}</code>
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
          Open the full pilot pack JSON under <code>/hsi-discovery/hsi-pilot-evidence-pack.json</code> for MAP /
          REVIEW payloads. Product Discovery radar remains at{" "}
          <Link to="/discovery">/discovery</Link>; evidence coverage at <Link to="/evidence">/evidence</Link>.
        </p>
      </Section>

      <Section
        id="gate-c"
        n={4}
        title="Gate C queue (pending)"
        lede="Human curation only. Approve+supports target ISI Neon autumn-snow — never HSI red-wave, never auto-merge."
      >
        <p>
          Checklist rows stay <strong>pending</strong>
          {pendingCount != null ? ` · ~${pendingCount} pending entries in published JSON` : ""}.
        </p>
        <p className="small muted">
          Curators: <Link to="/curation">/curation</Link> (admin) · HSI bridge map section. Model proposals in the
          checklist are drafts only and must not flip <code>hsiGrade</code>.
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
            <Link to="/discovery">Discovery radar</Link> — product unknowns feed
          </li>
          <li>
            <a href="/hsi-discovery/hsi-isi-consume-contract.json">Consume contract JSON</a>
          </li>
        </ul>
      </Section>
    </main>
  );
}
