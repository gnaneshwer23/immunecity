import { Link, useRouterState } from "@tanstack/react-router";
import { neonAuth } from "@/integrations/neon/auth-client";
import { BookOpen, Box, ChevronDown, FlaskConical, Menu, MessageSquare, Network, Search, Shield, UserRound, Users, X, Youtube } from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useMember, useUnreadCount } from "@/components/immune/community/chrome";
import { NAV_GROUPS } from "./nav";
import {
  FOOTER_GROUPS,
  isMarketingPath,
  JOURNEY_NAV,
  JOURNEY_PRIMARY,
  journeyKey,
  type JourneyItem,
  JOURNEY_SECONDARY,
  MARKETING_NAV_ACTION,
} from "@/data/marketingNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import AskAtlas from "./AskAtlas";
import ScientificInspector from "./ScientificInspector";
import { JourneyNext } from "./page";
import {
  ASK_NAME,
  PRODUCT_NAME,
  TAGLINE,
  TRUST_STATEMENT,
  YOUTUBE_CHANNEL_LABEL,
  YOUTUBE_CHANNEL_URL,
} from "@/lib/brand";

const JOURNEY_ICONS: Record<string, ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  Learn: BookOpen,
  Explore: Network,
  Investigate: Search,
  Trust: Shield,
};

const PRIMARY_ICONS: Record<string, ComponentType<{ size?: number; "aria-hidden"?: boolean }>> = {
  "/research": FlaskConical,
  "/simulator": Box,
  "/community": Users,
};

function NavIcon({ icon: Icon }: { icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }> }) {
  return <Icon size={16} aria-hidden />;
}

function YouTubeNavIcon({ className }: { className?: string }) {
  return (
    <a
      href={YOUTUBE_CHANNEL_URL}
      className={className}
      target="_blank"
      rel="noreferrer"
      aria-label={YOUTUBE_CHANNEL_LABEL}
      title={YOUTUBE_CHANNEL_LABEL}
    >
      <Youtube size={16} aria-hidden />
    </a>
  );
}

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

function HeaderAccount({ pathname, variant = "bar", onNavigate }: {
  pathname: string;
  variant?: "bar" | "compact";
  onNavigate?: () => void;
}) {
  const member = useMember();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  async function logout() {
    setMenuOpen(false);
    onNavigate?.();
    try {
      const { error } = await neonAuth.signOut();
      if (error) return;
    } catch {
      return;
    }
    window.location.assign("/");
  }
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);
  if (member) {
    const raw = (member.name ?? "").trim();
    const label = raw && !raw.includes("@") ? raw.slice(0, 22) : "Account";
    if (variant === "compact") {
      return (
        <>
          <span className="header-account">
            <UserRound size={16} aria-hidden />
            <span>{label}</span>
          </span>
          <Link to="/community/profile" onClick={onNavigate}>Profile</Link>
          <Link to="/workspace" onClick={onNavigate}>My Workspace</Link>
          <button type="button" className="header-logout" onClick={logout}>Logout</button>
        </>
      );
    }
    return (
      <div className="header-account-slot" ref={menuRef}>
        <button
          type="button"
          className="header-account"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <UserRound size={16} aria-hidden />
          <span>{label}</span>
        </button>
        {menuOpen ? (
          <div className="header-account-menu" role="menu" aria-label="Account">
            <Link role="menuitem" to="/community/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
            <Link role="menuitem" to="/workspace" onClick={() => setMenuOpen(false)}>My Workspace</Link>
            <button type="button" role="menuitem" className="header-logout" onClick={logout}>Logout</button>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <Link className="header-signin" to="/auth" search={{ redirect: pathname || "/" }}>
      <UserRound size={16} aria-hidden />
      Sign in
    </Link>
  );
}

function PillarMenu({ label, items, pathname, onNavigate }: {
  label: string;
  items: readonly JourneyItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  const Icon = JOURNEY_ICONS[label];
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
        aria-label={label}
        title={label}
        onClick={() => setOpen(!open)}
      >
        {Icon ? <NavIcon icon={Icon} /> : null}
        <span className="nav-label">{label}</span>
        <ChevronDown size={14} className="pillar-chevron" />
      </button>
      {open && (
        <div className="pillar-menu" role="menu" aria-label={label}>
          {items.map((l) => (
            <Link key={journeyKey(l)} to={l.path as "/"} hash={l.hash} role="menuitem" className="pillar-item" activeOptions={{ exact: l.path === "/", includeHash: Boolean(l.hash) }} activeProps={{ className: "pillar-item current" }} onClick={() => { setOpen(false); onNavigate(); }}>
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
          <p className="sf-trust">{TRUST_STATEMENT}</p>
        </div>
        {FOOTER_GROUPS.map((g) => (
          <div key={g.label} className="sf-col">
            <div className="sf-label">{g.label}</div>
            {g.items.map((l) =>
              "href" in l ? (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ) : (
                <Link key={l.path} to={l.path}>
                  {l.label}
                </Link>
              ),
            )}
          </div>
        ))}
      </div>
      <div className="sf-bottom">
        <span>© {new Date().getFullYear()} {PRODUCT_NAME}</span>
        <span>
          <Link to="/methods">Methods</Link>
          {" · "}
          <Link to="/disclaimer">Disclaimer</Link>
        </span>
      </div>
    </footer>
  );
}

function MarketingCompactNav({
  open,
  onClose,
  panelId,
  pathname,
  unread,
}: {
  open: boolean;
  onClose: () => void;
  panelId: string;
  pathname: string;
  unread: number;
}) {
  const panelRef = useRef<HTMLElement>(null);

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
          {JOURNEY_NAV.map((g) => {
            const Icon = JOURNEY_ICONS[g.label];
            return (
              <div key={g.label} className="marketing-compact-group">
                <span className="marketing-compact-label nav-line">{Icon ? <NavIcon icon={Icon} /> : null}{g.label}</span>
                {g.items.map((item) => (
                  <Link key={journeyKey(item)} to={item.path as "/"} hash={item.hash} activeProps={{ className: "active" }} onClick={onClose}>
                    {item.title}
                  </Link>
                ))}
              </div>
            );
          })}
          <div className="marketing-compact-group">
            <span className="marketing-compact-label">Tools</span>
            {JOURNEY_PRIMARY.map((item) => {
              const Icon = PRIMARY_ICONS[item.path];
              return (
                <Link key={item.path} to={item.path} className="nav-line" activeProps={{ className: "active" }} onClick={onClose}>
                  {Icon ? <NavIcon icon={Icon} /> : null}
                  {item.label}
                  {item.path === "/community" && unread > 0 ? <span className="community-unread-count">{unread}</span> : null}
                </Link>
              );
            })}
          </div>
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
            <a
              href={YOUTUBE_CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
            >
              {YOUTUBE_CHANNEL_LABEL}
            </a>
            {[...JOURNEY_SECONDARY, MARKETING_NAV_ACTION].map((item) => (
              <Link
                key={item.path}
                to={item.path}
                activeProps={{ className: "active" }}
                onClick={onClose}
              >
                {item.label}
              </Link>
            ))}
            <HeaderAccount pathname={pathname} variant="compact" onNavigate={onClose} />
          </div>
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
  /** Full Ask page already hosts AskAtlas — hide the corner FAB to avoid overlap. */
  const showAskFab = pathname !== "/ask";
  const compactNavId = useId();
  const closeCompact = () => setOpen(false);
  const member = useMember();
  const unread = useUnreadCount(member);

  useEffect(() => { setAskOpen(false); setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!showAskFab) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAskOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showAskFab]);

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
          <div className="journey-main">
            {JOURNEY_NAV.map((g) => (
              <PillarMenu key={g.label} label={g.label} items={g.items} pathname={pathname} onNavigate={() => setOpen(false)} />
            ))}
            {JOURNEY_PRIMARY.map((item) => {
              const Icon = PRIMARY_ICONS[item.path];
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="marketing-nav-link journey-direct nav-line"
                  activeOptions={{ exact: item.path !== "/community" }}
                  activeProps={{ className: "marketing-nav-link journey-direct nav-line current" }}
                  title={item.label}
                >
                  {Icon ? <NavIcon icon={Icon} /> : null}
                  <span className="nav-label">{item.label}</span>
                  {item.path === "/community" && unread > 0 ? <span className="community-unread-count">{unread}</span> : null}
                </Link>
              );
            })}
          </div>
          <div className="journey-org">
            <YouTubeNavIcon className="marketing-nav-link youtube-nav-link" />
            {JOURNEY_SECONDARY.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="marketing-nav-link"
                activeProps={{ className: "marketing-nav-link current" }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={MARKETING_NAV_ACTION.path}
              className="marketing-nav-link"
              activeProps={{ className: "marketing-nav-link current" }}
            >
              {MARKETING_NAV_ACTION.label}
            </Link>
          </div>
          <HeaderAccount pathname={pathname} />
        </nav>
      </header>
        {(
          <MarketingCompactNav
            open={open}
            onClose={closeCompact}
            panelId={compactNavId}
            pathname={pathname}
            unread={unread}
          />
        )}
      {showAskFab ? (
        <>
          <Button className="ask-launcher" onClick={() => setAskOpen(!askOpen)} aria-haspopup="dialog" aria-expanded={askOpen} aria-label={askOpen ? `Close ${ASK_NAME}` : `Open ${ASK_NAME}`} title={ASK_NAME}>
            {askOpen ? <X size={20} /> : <MessageSquare size={20} />}<span>Ask Immune</span>
          </Button>
          <Dialog modal={false} open={askOpen} onOpenChange={setAskOpen}>
            <DialogPortal>
            <DialogPrimitive.Content className="global-ask-dialog corner-ask-dialog" onInteractOutside={(e) => e.preventDefault()}>
              <DialogTitle className="sr-only">{ASK_NAME}</DialogTitle>
              <DialogDescription className="sr-only">Find concepts and explore immune connections. Educational resource with references — not clinical decision support.</DialogDescription>
              <Button variant="ghost" size="icon" className="corner-ask-close" onClick={() => setAskOpen(false)} aria-label={`Minimize ${ASK_NAME}`} title={`Minimize ${ASK_NAME}`}><X size={18} /></Button>
              <AskAtlas showFullPageLink />
            </DialogPrimitive.Content>
            </DialogPortal>
          </Dialog>
        </>
      ) : null}
      <ScientificInspector />
      <div className={`shell nav-closed${marketing ? " marketing-shell" : ""}`}>
        <main id="main" tabIndex={-1}>
          {children}
          {pathname !== "/graph" ? <JourneyNext /> : null}
          {pathname !== "/graph" && <SiteFooter />}
        </main>
      </div>
    </>
  );
}
