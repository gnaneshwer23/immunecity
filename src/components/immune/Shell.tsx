import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, MessageSquare, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { NAV_GROUPS } from "./nav";
import {
  FOOTER_GROUPS,
  isMarketingPath,
  JOURNEY_NAV,
  JOURNEY_SECONDARY,
  MARKETING_NAV_ACTION,
} from "@/data/marketingNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import AskAtlas from "./AskAtlas";
import ScientificInspector from "./ScientificInspector";
import {
  ASK_NAME,
  ATLAS_CTA,
  ATLAS_PATH,
  EXPLORE_CTA,
  EXPLORE_PATH,
  PRODUCT_NAME,
  TAGLINE,
} from "@/lib/brand";

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
      <circle cx="16" cy="5" r="1.5" fill="currentColor" />
      <circle cx="27" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16" cy="27" r="1.5" fill="currentColor" />
      <circle cx="5" cy="16" r="1.5" fill="currentColor" />
      <path d="M16 12.6V6.6M19.4 16h6M16 19.4v6M12.6 16H6.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PillarMenu({ label, items, pathname, onNavigate }: {
  label: string;
  items: readonly { n: string; path: string; title: string; desc: string }[];
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const active = items.some((l) => l.path === "/" ? pathname === "/" : pathname.startsWith(l.path));
  return (
    <div className="pillar" ref={ref}>
      <button
        type="button"
        className={`pillar-trigger${active ? " active" : ""}${open ? " open" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {label}<ChevronDown size={14} className="pillar-chevron" />
      </button>
      {open && (
        <div className="pillar-menu" role="menu" aria-label={label}>
          {items.map((l) => (
            <Link key={l.path} to={l.path} role="menuitem" className="pillar-item" activeOptions={{ exact: l.path === "/" }} activeProps={{ className: "pillar-item current" }} onClick={() => { setOpen(false); onNavigate(); }}>
              <span className="pillar-num">{l.n}</span>
              <span className="pillar-body"><strong>{l.title}</strong><small>{l.desc}</small></span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="sf-grid sf-grid-marketing">
        <div className="sf-brand">
          <Link className="brand" to="/"><Logo /><span className="brand-text"><strong>{PRODUCT_NAME}</strong><small>{TAGLINE}</small></span></Link>
          <p>
            Educational immunology platform with curated references. Ask teaches from the graph—not patient-specific
            advice or fully evidence-grounded AI.
          </p>
          <span className="sf-status"><span className="sf-dot" /> Educational model · reviewed cites when available · Academy scaffolds in development</span>
        </div>
        {FOOTER_GROUPS.map((g) => (
          <div key={g.label} className="sf-col">
            <div className="sf-label">{g.label}</div>
            {g.items.map((l) => (
              <Link key={l.path} to={l.path}>
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="sf-bottom">
        <span>© {new Date().getFullYear()} {PRODUCT_NAME}</span>
        <span>Educational model with references. Not patient-specific medical advice.</span>
      </div>
    </footer>
  );
}

function MarketingCompactNav({
  open,
  onClose,
  pathname,
  panelId,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  panelId: string;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const ctaPath = pathname === EXPLORE_PATH ? ATLAS_PATH : EXPLORE_PATH;
  const ctaLabel = pathname === EXPLORE_PATH ? ATLAS_CTA : EXPLORE_CTA;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      const toggle = document.querySelector(".marketing-nav-toggle");
      if (toggle?.contains(t)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="marketing-nav-scrim" aria-label="Close navigation" onClick={onClose} />
      <nav
        ref={panelRef}
        id={panelId}
        className="marketing-compact-nav"
        aria-label="Site"
      >
        <div className="marketing-compact-head">
          <span className="marketing-compact-label">Navigate</span>
          <Button variant="ghost" size="icon" className="icon-btn" onClick={onClose} aria-label="Close navigation">
            <X size={20} />
          </Button>
        </div>
        <div className="marketing-compact-links">
          {JOURNEY_NAV.map((g) => (
            <div key={g.label} className="marketing-compact-group">
              <span className="marketing-compact-label">{g.label}</span>
              {g.items.map((item) => (
                <Link key={item.path} to={item.path} activeProps={{ className: "active" }} onClick={onClose}>
                  {item.title}
                </Link>
              ))}
            </div>
          ))}
          <details className="marketing-compact-group marketing-compact-layers">
            <summary className="marketing-compact-label">All twelve science layers</summary>
            {NAV_GROUPS.flatMap((g) => [...g.items] as { n: string; path: string; title: string }[]).filter((l) => l.path !== "/").map((l) => (
              <Link key={l.path} to={l.path as "/"} activeProps={{ className: "active" }} onClick={onClose}>
                <span className="num">{l.n}</span> {l.title}
              </Link>
            ))}
          </details>
          <div className="marketing-compact-group">
            <span className="marketing-compact-label">Organisation</span>
            {[...JOURNEY_SECONDARY, MARKETING_NAV_ACTION].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={item.path === MARKETING_NAV_ACTION.path ? "collab-action" : undefined}
                activeProps={{ className: "active" }}
                onClick={onClose}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="marketing-compact-cta">
          <Button asChild className="bio-primary">
            <Link to={ctaPath} onClick={onClose}>
              {ctaLabel}
            </Link>
          </Button>
        </div>
      </nav>
    </>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const marketing = isMarketingPath(pathname);
  const compactNavId = useId();
  const closeCompact = () => setOpen(false);

  useEffect(() => { setAskOpen(false); setOpen(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAskOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar marketing-topbar">
        {(
          <Button
            variant="ghost"
            size="icon"
            className="icon-btn nav-toggle marketing-nav-toggle"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls={compactNavId}
            title="Toggle navigation"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </Button>
        )}
        <Link className="brand" to="/">
          <Logo />
          <span className="brand-text"><strong>{PRODUCT_NAME}</strong><small>{TAGLINE}</small></span>
        </Link>
        <nav className="journey-nav" aria-label="Primary">
          {JOURNEY_NAV.map((g) => (
            <PillarMenu key={g.label} label={g.label} items={g.items} pathname={pathname} onNavigate={() => setOpen(false)} />
          ))}
          <span className="journey-sep journey-secondary" aria-hidden />
          {JOURNEY_SECONDARY.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="marketing-nav-link journey-secondary"
              activeProps={{ className: "marketing-nav-link journey-secondary current" }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={MARKETING_NAV_ACTION.path}
            className="marketing-nav-link collab-action journey-secondary"
            activeProps={{ className: "marketing-nav-link collab-action journey-secondary current" }}
          >
            {MARKETING_NAV_ACTION.label}
          </Link>
        </nav>
        <Button asChild className="bio-primary topbar-cta">
          <Link to={pathname === EXPLORE_PATH ? ATLAS_PATH : EXPLORE_PATH}>
            {pathname === EXPLORE_PATH ? ATLAS_CTA : EXPLORE_CTA}
          </Link>
        </Button>
      </header>
        {(
          <MarketingCompactNav
            open={open}
            onClose={closeCompact}
            pathname={pathname}
            panelId={compactNavId}
          />
        )}
      <Button className="ask-launcher" onClick={() => setAskOpen(!askOpen)} aria-haspopup="dialog" aria-expanded={askOpen} aria-label={askOpen ? "Close Ask chatbot" : "Open Ask chatbot"} title={ASK_NAME}>
        {askOpen ? <X size={20} /> : <MessageSquare size={20} />}<span>Ask</span>
      </Button>
      <Dialog modal={false} open={askOpen} onOpenChange={setAskOpen}>
        <DialogPortal>
        <DialogPrimitive.Content className="global-ask-dialog corner-ask-dialog" onInteractOutside={(e) => e.preventDefault()}>
          <DialogTitle className="sr-only">{ASK_NAME}</DialogTitle>
          <DialogDescription className="sr-only">Find concepts and explore immune connections. Educational teaching with references, not patient-specific advice.</DialogDescription>
          <Button variant="ghost" size="icon" className="corner-ask-close" onClick={() => setAskOpen(false)} aria-label="Minimize chatbot" title="Minimize chatbot"><X size={18} /></Button>
          <AskAtlas />
        </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
      <ScientificInspector />
      <div className={`shell nav-closed${marketing ? " marketing-shell" : ""}`}>
        <main id="main" tabIndex={-1}>
          {children}
          {pathname !== "/graph" && <SiteFooter />}
        </main>
      </div>
    </>
  );
}
