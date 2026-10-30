import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { Section } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import {
  listMyDiscoveryAlerts,
  markDiscoveryAlertsRead,
  runMyDiscoveryMonitor,
} from "@/lib/discovery/monitor.functions";
import { seoHead } from "@/lib/seo";

export const Route = createFileRoute("/discovery/alerts")({
  head: () =>
    seoHead({
      title: `Discovery alerts | ${PRODUCT_NAME}`,
      description:
        "In-app Discovery monitor notices for followed gaps and profile interests. Not automatic scientific review. Email deferred.",
      path: "/discovery/alerts",
      noIndex: true,
    }),
  component: DiscoveryAlertsPage,
});

type Alerts = Awaited<ReturnType<typeof listMyDiscoveryAlerts>>;

function DiscoveryAlertsPage() {
  const load = useServerFn(listMyDiscoveryAlerts);
  const mark = useServerFn(markDiscoveryAlertsRead);
  const runMonitor = useServerFn(runMyDiscoveryMonitor);
  const [data, setData] = useState<Alerts | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setData(await load({ data: { limit: 50 } }));
  }

  useEffect(() => {
    refresh().catch((e) => setMsg(e instanceof Error ? e.message : "Sign in to view Discovery alerts."));
  }, [load]);

  return (
    <div className="page">
      <PageHead
        kicker="Investigate · Research Radar"
        title="Discovery alerts"
        lede="In-app notices when the monitor sees new or changed ISI signals for gaps you follow or interests on your research profile. These updates are engineering change signals — not automatic scientific review. Email is deferred."
      />

      <Section id="actions" title="Monitor" lede="Safe to re-run; alert dedupe is idempotent.">
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn sm primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setMsg("");
              runMonitor({ data: {} })
                .then(async (res) => {
                  setMsg(
                    `Monitor complete · targets ${res.targets} · signals ${res.signals} · alerts inserted ${res.alertsInserted}. ${res.note}`,
                  );
                  await refresh();
                })
                .catch((e) => setMsg(e instanceof Error ? e.message : "Monitor failed (sign in required)."))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Running…" : "Run monitor now"}
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              mark({ data: { all: true } })
                .then(() => refresh())
                .catch((e) => setMsg(e instanceof Error ? e.message : "Mark read failed."));
            }}
          >
            Mark all read
          </button>
          <Link className="btn sm" to="/discovery">
            Back to Radar
          </Link>
          <Link className="btn sm" to="/discovery/profile">
            Profile
          </Link>
        </div>
        {msg ? (
          <p className="small" role="status" style={{ marginTop: 8 }}>
            {msg}
          </p>
        ) : null}
      </Section>

      <Section
        id="inbox"
        title="In-app inbox"
        lede="Email alerts are not sent. Human review is still required before any gap becomes reviewed_gap."
      >
        {!data ? <p className="muted">Loading alerts…</p> : null}
        {data?.items.length ? (
          <ul className="isi-library-list">
            {data.items.map((item) => (
              <li key={item.id}>
                <div className="isi-radar-meta">
                  <span className="isi-gap-badge" data-tone={item.read ? "neutral" : "info"}>
                    {item.read ? "Read" : "Unread"}
                  </span>
                  <span className="small muted">{item.eventType}</span>
                  <span className="small muted">{item.createdAt}</span>
                </div>
                <strong>{item.title}</strong>
                <p className="isi-radar-why">{item.body}</p>
                <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {item.href ? (
                    <a className="btn sm" href={item.href}>
                      Open gap
                    </a>
                  ) : null}
                  {!item.read ? (
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        mark({ data: { id: item.id } })
                          .then(() => refresh())
                          .catch((e) => setMsg(e instanceof Error ? e.message : "Mark read failed."));
                      }}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : data ? (
          <p className="muted">No Discovery alerts yet. Follow a persisted gap (researcher_pro stub) or set profile interests, then run the monitor.</p>
        ) : null}
        <p className="small muted" style={{ marginTop: 12 }}>
          {data?.note ?? "Scientific review is never implied by monitor updates."}
        </p>
      </Section>
    </div>
  );
}
