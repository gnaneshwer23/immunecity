/**
 * Vercel Cron entry for Discovery monitor.
 * Auth: Authorization Bearer CRON_SECRET (fail closed).
 * Live PubMed/CT.gov remain opt-in via DISCOVERY_LIVE_* env.
 * Never auto-promotes reviewed_gap; never pretends email sent.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/lib/db.server";
import { runDiscoveryMonitorCronJob } from "@/lib/discovery/runMonitorCron";

function unauthorized(): Response {
  return new Response("Unauthorized", { status: 401 });
}

async function handleCron(request: Request): Promise<Response> {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) {
    console.error("discovery_monitor_cron_fail_closed missing_CRON_SECRET");
    return new Response(JSON.stringify({ ok: false, error: "CRON_SECRET unset — fail closed" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return unauthorized();
  }

  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
    return new Response(JSON.stringify({ ok: false, error: "DATABASE_URL missing" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const db = getDb();
    const summary = await runDiscoveryMonitorCronJob({
      db,
      env: process.env as Record<string, string | undefined>,
      actor: process.env.DISCOVERY_MONITOR_ACTOR ?? "cron:vercel-discovery-monitor",
    });
    console.log("discovery_monitor_cron_ok", summary.runId, summary.alertsInserted);
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "monitor_failed";
    console.error("discovery_monitor_cron_failed", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/cron/discovery-monitor")({
  server: {
    handlers: {
      GET: ({ request }) => handleCron(request),
      POST: ({ request }) => handleCron(request),
    },
  },
});
