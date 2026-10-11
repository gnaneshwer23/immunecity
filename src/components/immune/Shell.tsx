import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { graphReleaseLabel, graphReleaseSnapshot } from "@/lib/immune/graphRelease";
import { NAV_GROUPS } from "./nav";
import { FOOTER_GROUPS, isMarketingPath, MARKETING_NAV } from "@/data/marketingNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import AskAtlas from "./AskAtlas";
import ScientificInspector from "./ScientificInspector";
import { ASK_NAME, EXPLORE_PATH, FLAGSHIP_NAME, PRODUCT_NAME, TAGLINE } from "@/lib/brand";

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
  const snap = graphReleaseSnapshot();
  return (
    <footer className="site-footer">
      <div className="sf-grid sf-grid-marketing">
        <div className="sf-brand">
          <Link className="brand" to="/"><Logo /><span className="brand-text"><strong>{PRODUCT_NAME}</strong><small>{TAGLINE}</small></span></Link>
          <p>
            Educational beta — {graphReleaseLabel(snap)} · {snap.runtimeRelationships} runtime links, each labelled with
            review status. {FLAGSHIP_NAME} is the flagship atlas. Educating with references; Ask is graph-retrieved
            teaching, not fully evidence-grounded AI.
          </p>
          <span className="sf-status"><span className="sf-dot" /> {snap.snapshotAt} · reviewed cites when available · Academy foundation scaffold · illustrative walks</span>
        </div>
        {FOOTER_GROUPS.map((g) => (
          <div key={g.label} className="sf-col">
            <div className="sf-label">{g.label}</div>
            {g.items.map((l) => (
              <Link key={l.path} to={l.path as "/"}>
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

export default function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const marketing = isMarketingPath(pathname);
  const isHome = pathname === "/";
  useEffect(() => { setAskOpen(false); }, [pathname]);
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
      <header className={`topbar${isHome ? " home-topbar" : ""}${marketing ? " marketing-topbar" : ""}`}>
        {!marketing && (
          <Button variant="ghost" size="icon" className="icon-btn nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} title="Toggle navigation"><Menu size={20} /></Button>
        )}
        {marketing && (
          <Button variant="ghost" size="icon" className="icon-btn nav-toggle marketing-nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} title="Toggle navigation"><Menu size={20} /></Button>
        )}
        <Link className="brand" to="/">
          <Logo />
          <span className="brand-text"><strong>{PRODUCT_NAME}</strong><small>{TAGLINE}</small></span>
        </Link>
        {marketing ? (
          <>
            <nav className="marketing-nav" aria-label="Primary">
              {MARKETING_NAV.map((item) => (
                <Link
                  key={item.path}
                  to={item.path as "/"}
                  className="marketing-nav-link"
                  activeOptions={{ exact: item.path === "/" }}
                  activeProps={{ className: "marketing-nav-link current" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button asChild className="bio-primary topbar-cta">
              <Link to={EXPLORE_PATH}>Explore {FLAGSHIP_NAME}</Link>
            </Button>
          </>
        ) : (
          <nav className="pillar-nav" aria-label="Primary">
            {NAV_GROUPS.map((g) => (
              <PillarMenu key={g.label} label={g.label} items={g.items} pathname={pathname} onNavigate={() => setOpen(false)} />
            ))}
          </nav>
        )}
      </header>
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
      <div className={`shell${marketing || !open ? " nav-closed" : ""}${marketing ? " marketing-shell" : ""}`}>
        {!marketing && (
          <nav className={`sidebar${open ? " open" : ""}`} aria-label="Layers">
            {NAV_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="nav-label">{g.label}</div>
                <div className="nav-group">
                  {g.items.map((l) => (
                    <Link key={l.path} to={l.path} activeOptions={{ exact: l.path === "/" }} activeProps={{ className: "active" }} onClick={() => setOpen(false)}>
                      <span className="num">{l.n}</span>{l.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="nav-label">Tools</div>
            <div className="nav-group">
              <Link to="/curation" activeProps={{ className: "active" }} onClick={() => setOpen(false)}>
                <span className="num">EV</span>Citation curation
              </Link>
              <Link to="/methods" activeProps={{ className: "active" }} onClick={() => setOpen(false)}>
                <span className="num">MT</span>Methods &amp; trust
              </Link>
            </div>
            <p className="nav-foot">Educational atlas with references — not patient-specific advice.</p>
          </nav>
        )}
        {marketing && open && (
          <nav className="sidebar open marketing-mobile-nav" aria-label="Site">
            <div className="nav-label">Explore</div>
            <div className="nav-group">
              {MARKETING_NAV.map((item) => (
                <Link key={item.path} to={item.path as "/"} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              ))}
              <Link to={EXPLORE_PATH} onClick={() => setOpen(false)}>Explore {FLAGSHIP_NAME}</Link>
              <Link to="/collaborate" onClick={() => setOpen(false)}>Collaborate</Link>
            </div>
          </nav>
        )}
        <main id="main" tabIndex={-1}>
          {children}
          {pathname !== "/graph" && <SiteFooter />}
        </main>
      </div>
    </>
  );
}
