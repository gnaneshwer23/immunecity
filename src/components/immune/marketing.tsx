import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CAPABILITY_FEATURES,
  CAPABILITY_STATUS_LABEL,
  type CapabilityFeature,
} from "@/data/capabilityStatus";
import { TRUST_STATEMENT, YOUTUBE_CHANNEL_LABEL, YOUTUBE_CHANNEL_URL } from "@/lib/brand";
import {
  EXEMPLAR_MATURITY_SHORT,
  EXEMPLAR_PATHWAYS,
  reportExemplar,
  type ExemplarMaturity,
} from "@/lib/immune/exemplarPathways";
import type { CitationLike } from "@/lib/immune/evidenceStatus";

/** Key public capabilities surfaced on home/overview honesty strips. */
const LANDING_CAPABILITY_IDS = [
  "knowledge-graph",
  "ask-atlas",
  "evidence-curation",
  "academy-curriculum",
  "omics-adapters",
] as const;

const WONT_CLAIM_ITEMS = [
  "Not clinical decision support — for learning and exploration only.",
  "Ask Immune draws on the curated graph and labelled sources; it is not fully evidence-grounded AI.",
  "Most graph relationships are not yet claim-reviewed — see Methods for live coverage.",
  "Academy tracks learning progress; it is not a certification programme.",
  "Omics and molecular AI adapters are planned, not available today.",
] as const;

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
        {eyebrow ? <span className="mkt-section-label">{eyebrow}</span> : null}
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

/** Shared outbound learning link (YouTube immunology channel). */
export function LearningOutboundLink({ className }: { className?: string }) {
  return (
    <a
      className={className}
      href={YOUTUBE_CHANNEL_URL}
      target="_blank"
      rel="noreferrer"
    >
      {YOUTUBE_CHANNEL_LABEL}
    </a>
  );
}

/** Compact capability status chip from capabilityStatus labels. */
export function StatusChip({ label, tone = "muted" }: { label: string; tone?: "muted" | "primary" | "warn" }) {
  return <span className={`mkt-status-chip mkt-status-${tone}`}>{label}</span>;
}

function chipTone(status: CapabilityFeature["status"]): "muted" | "primary" | "warn" {
  if (status === "beta") return "primary";
  if (status === "partial" || status === "in_development") return "warn";
  return "muted";
}

/** Compact capability chips from capabilityStatus (home / overview). */
export function CapabilityChips({ className = "" }: { className?: string }) {
  const features = LANDING_CAPABILITY_IDS.map((id) =>
    CAPABILITY_FEATURES.find((f) => f.id === id),
  ).filter((f): f is CapabilityFeature => Boolean(f));
  return (
    <ul className={`mkt-cap-chips ${className}`.trim()} aria-label="Capability status">
      {features.map((f) => (
        <li key={f.id}>
          <StatusChip label={`${f.name.split(" (")[0]} · ${CAPABILITY_STATUS_LABEL[f.status]}`} tone={chipTone(f.status)} />
        </li>
      ))}
    </ul>
  );
}

/** Concise product limits — one place for public honesty, without engineering jargon. */
export function WontClaimList({ className = "" }: { className?: string }) {
  return (
    <div className={`mkt-wont-claim ${className}`.trim()}>
      <h3>What this is not</h3>
      <ul>
        {WONT_CLAIM_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** TNF / PD-1 / IFN maturity strip from exemplarPathways (+ live cites when provided). */
export function ExemplarMaturityStrip({
  cites = [],
  pending,
  error,
  className = "",
}: {
  cites?: CitationLike[];
  pending?: boolean;
  error?: boolean;
  className?: string;
}) {
  return (
    <ul className={`mkt-exemplar-strip ${className}`.trim()} aria-label="Platform exemplar maturity">
      {EXEMPLAR_PATHWAYS.map((p) => {
        const maturity: ExemplarMaturity = pending
          ? p.maturity
          : error
            ? p.maturity
            : reportExemplar(p, cites).maturity;
        const short = pending ? "…" : error ? EXEMPLAR_MATURITY_SHORT[p.maturity] : EXEMPLAR_MATURITY_SHORT[maturity];
        return (
          <li key={p.id}>
            <span className="mkt-exemplar-title">{p.title}</span>
            <StatusChip label={short} tone={maturity === "reviewed" ? "primary" : "warn"} />
          </li>
        );
      })}
    </ul>
  );
}
