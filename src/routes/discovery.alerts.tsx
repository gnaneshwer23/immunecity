import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/immune/ui";
import { PageToc, Section, Toolbar } from "@/components/immune/page";
import { PRODUCT_NAME } from "@/lib/brand";
import {
  listMyDiscoveryAlerts,
  markDiscoveryAlertsRead,
  runMyDiscoveryMonitor,
} from "@/lib/discovery/monitor.functions";
import { seoHead } from "@/lib/seo";

const TOC = [
  { id: "actions", label: "Monitor" },
  { id: "inbox", label: "Inbox" },
];

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

  const unread = data?.items.filter((i) => !i.read).length ?? 0;

  return (
    <main className="page isi-auth-page">
      <PageHead
        kicker="Research · Research Radar"
        title="Discovery alerts"
        lede="In-app notices when followed research questions or profile interests see new or changed ISI coverage signals. Updates are change notices — not automatic scientific review. Email is deferred."
        stats={
          data
            ? [
                { v: String(data.items.length), l: "Alerts" },
                { v: String(unread), l: "Unread" },
                { v: "In-app", l: "Delivery" },
              ]
            : undefined
        }
      />
      <PageToc items={TOC} />

      <Section id="actions" title="Monitor" lede="Safe to re-run; duplicate alerts are not re-inserted.">
        <Toolbar count={data ? `${unread} unread` : undefined}>
          <div className="isi-auth-btn-row">
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
                      `Checked ${res.targets} questions · ${res.signals} updates · ${res.alertsInserted} new alerts. ${res.note}`,
                    );
                    await refresh();
                  })
                  .catch((e) => setMsg(e instanceof Error ? e.message : "Monitor failed (sign in required)."))
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? "Checking…" : "Check for updates"}
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
        </Toolbar>
        {msg ? (
          <p className="isi-auth-status" role="status">
            {msg}
          </p>
        ) : null}
      </Section>

      <Section
        id="inbox"
        title="In-app inbox"
        lede="Email alerts are not sent. Human review is still required before any candidate becomes a reviewed research gap."
      >
        {!data ? <p className="isi-loading" role="status">Loading alerts…</p> : null}
        {data?.items.length ? (
          <ul className="isi-auth-queue">
            {data.items.map((item) => (
              <li key={item.id} className="isi-auth-queue-item">
                <div className="isi-auth-queue-head">
                  <strong>{item.title}</strong>
                  <span className="isi-gap-badge" data-tone={item.read ? "neutral" : "info"}>
                    {item.read ? "Read" : "Unread"}
                  </span>
                </div>
                <div className="isi-auth-queue-meta">
                  <span>{item.eventType}</span>
                  <span>{item.createdAt}</span>
                </div>
                <p className="isi-radar-why">{item.body}</p>
                <div className="isi-auth-btn-row">
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
          <div className="isi-auth-empty">
            <h3>No alerts yet</h3>
            <p>
              Follow a saved research question (paid follows are not available yet; server quota enforced) or
              set profile interests, then run the monitor.
            </p>
          </div>
        ) : null}
        <p className="small muted" style={{ marginTop: "var(--isi-space-3)" }}>
          {data?.note ?? "Scientific review is never implied by monitor updates."}
        </p>
      </Section>
    </main>
  );
}
