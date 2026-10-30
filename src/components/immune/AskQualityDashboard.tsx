import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/evidence.functions";
import { getAskQualityDashboard } from "@/lib/askQuality.functions";
import type { AskQualitySummary } from "@/lib/askQualityDashboard";
import { PROMPT_VERSION } from "@/lib/askGrounding";

type Summary = AskQualitySummary & { available: boolean };

/**
 * Admin Trust panel: outcome rates by prompt version from ai_evaluation_runs.
 * Never displays personal-health question text — redacted flags only.
 */
export default function AskQualityDashboard() {
  const roleFn = useServerFn(getMyRole);
  const load = useServerFn(getAskQualityDashboard);
  const [admin, setAdmin] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await roleFn();
        if (cancelled) return;
        setAdmin(Boolean(r.administrator));
        setChecked(true);
        if (!r.administrator) return;
        const s = await load();
        if (!cancelled) setSummary(s);
      } catch (err) {
        if (cancelled) return;
        setChecked(true);
        setAdmin(false);
        setError(err instanceof Error ? err.message.slice(0, 200) : "Could not load Ask quality rates.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleFn, load]);

  if (!checked || !admin) return null;

  return (
    <div className="mkt-ev-panel" aria-labelledby="ask-quality-heading" id="ask-quality">
      <h3 id="ask-quality-heading">Ask quality loop (admin)</h3>
      <p className="mkt-aside">
        Gate outcome rates by prompt version from <code>ai_evaluation_runs</code>. Fail closed: abstains and
        citation rejects count as honest outcomes. Personal-health questions are a redacted flag only — full
        question text is never logged here. Current prompt <code>{PROMPT_VERSION}</code>. Educational beta —
        not CDS; not fully evidence-grounded AI.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : !summary ? (
        <p className="xs muted">Loading outcome rates…</p>
      ) : !summary.available ? (
        <p className="xs muted" role="status">
          Evaluation table unavailable (migration may be pending). Rates will appear after{" "}
          <code>0013</code>/<code>0014</code> apply and Ask gates run.
        </p>
      ) : summary.total === 0 ? (
        <p className="xs muted" role="status">
          No gate outcomes logged yet. Empty set — not a claim that Ask is perfect.
        </p>
      ) : (
        <>
          <p className="xs muted">
            {summary.total} runs · {summary.redactedCount} personal-health redacted · never shows question text
          </p>
          <h4 className="mkt-subhead">Overall</h4>
          <ul className="mkt-aside" style={{ paddingLeft: 18 }}>
            {summary.overall.map((o) => (
              <li key={o.outcome}>
                <code>{o.outcome}</code>: {o.count} ({Math.round(o.rate * 100)}%)
              </li>
            ))}
          </ul>
          {summary.byPromptVersion.map((pv) => (
            <div key={pv.promptVersion} style={{ marginTop: 10 }}>
              <h4 className="mkt-subhead">
                Prompt <code>{pv.promptVersion}</code> · {pv.total} runs · {pv.redactedCount} redacted
              </h4>
              <dl className="mkt-ev-metrics">
                {pv.outcomes.map((o) => (
                  <div key={o.outcome}>
                    <dt>{o.outcome}</dt>
                    <dd>{`${o.count} (${Math.round(o.rate * 100)}%)`}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <p className="mkt-aside">{summary.note}</p>
        </>
      )}
      <p className="mkt-aside">
        Gold-set / retrieval: <code>bun run sme:status</code> · <code>bun run benchmark:retrieval</code> ·{" "}
        <code>bun run ask:quality</code>. SME sign-off remains human-only.{" "}
        <Link to="/curation">Curation</Link>
      </p>
    </div>
  );
}
