import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { TRUST_STATEMENT } from "@/lib/brand";

/** Midnight marketing hero — brand-forward, lean first viewport. */
export function MarketingHero({
  eyebrow,
  title,
  lede,
  actions,
  foot,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  foot?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mkt-hero">
      <div className={`mkt-hero-inner${aside ? " mkt-hero-split" : ""}`}>
        <div className="mkt-hero-main">
        <div className="bio-eyebrow mkt-hero-eyebrow">
          <span className="status-dot" /> {eyebrow}
        </div>
        <h1>{title}</h1>
        {lede ? <p className="mkt-hero-lede">{lede}</p> : null}
        {actions ? <div className="bio-actions mkt-hero-actions">{actions}</div> : null}
        {foot ? <p className="mkt-hero-foot">{foot}</p> : null}
        </div>
        {aside ? <aside className="mkt-hero-aside">{aside}</aside> : null}
      </div>
    </header>
  );
}

/** Shared page head for lighter marketing prose routes (no midnight band). */
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
      {eyebrow ? (
        <div className="bio-eyebrow">
          <span className="status-dot" /> {eyebrow}
        </div>
      ) : null}
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
    <section className={`mkt-section ${className}`.trim()} id={id} aria-labelledby={headingId}>
      <div className="mkt-section-head">
        {eyebrow ? <span className="bio-section-number">{eyebrow}</span> : null}
        <h2 id={headingId}>{title}</h2>
        {lede ? <p className="mkt-section-lede">{lede}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Ivory reading column wrapping marketing body sections. */
export function MarketingBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mkt-body ${className}`.trim()}>{children}</div>;
}

/** Final CTA band — mint surface, not a card grid. */
export function MarketingCta({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: ReactNode;
  children: ReactNode;
}) {
  const id = "mkt-cta-heading";
  return (
    <section className="mkt-cta" aria-labelledby={id}>
      <div>
        <h2 id={id}>{title}</h2>
        {lede ? <p>{lede}</p> : null}
      </div>
      <div className="bio-actions">{children}</div>
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
