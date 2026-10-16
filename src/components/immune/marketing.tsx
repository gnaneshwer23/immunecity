import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TRUST_STATEMENT } from "@/lib/brand";

/** Shared page head for marketing prose routes. */
export function MarketingPageHead({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
}) {
  return (
    <header className="bio-page-head mkt-page-head">
      {eyebrow ? <div className="bio-eyebrow"><span className="status-dot" /> {eyebrow}</div> : null}
      <h1>{title}</h1>
      {lede ? <p className="mkt-lede">{lede}</p> : null}
    </header>
  );
}

/** One job per section — shared marketing section shell. */
export function MarketingSection({
  id,
  eyebrow,
  title,
  lede,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section className={`section mkt-section ${className}`.trim()} id={id} aria-labelledby={headingId}>
      <div className="mkt-section-head">
        {eyebrow ? <span className="bio-section-number">{eyebrow}</span> : null}
        <h2 id={headingId}>{title}</h2>
        {lede ? <p className="mkt-section-lede">{lede}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Single trust statement — Methods + Disclaimer links. */
export function TrustBlock({ className = "" }: { className?: string }) {
  return (
    <p className={`mkt-trust ${className}`.trim()}>
      {TRUST_STATEMENT}{" "}
      <Link to="/methods">Methods</Link>
      {" · "}
      <Link to="/disclaimer">Disclaimer</Link>
    </p>
  );
}

/** Compact capability status chip from capabilityStatus labels. */
export function StatusChip({ label, tone = "muted" }: { label: string; tone?: "muted" | "primary" | "warn" }) {
  return <span className={`mkt-status-chip mkt-status-${tone}`}>{label}</span>;
}
