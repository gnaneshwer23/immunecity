import { Link } from "@tanstack/react-router";
import { NAV_GROUPS } from "@/components/immune/nav";
import { KG, SPINE_DESC } from "@/lib/immune/engine";
import { FLAGSHIP_NAME } from "@/lib/brand";

/**
 * Compact original visual of the twelve atlas layers + fifteen-step causal spine.
 * Links into real platform routes — not a mock diagram.
 */
export function PlatformMapVisual() {
  const layers = NAV_GROUPS.flatMap((g) => g.items.filter((l) => l.path !== "/"));
  const spine = KG.core_spine;

  return (
    <div className="platform-map">
      <div className="platform-map-spine" aria-label={`${spine.length}-step causal spine`}>
        <div className="platform-map-kicker">
          <span>{String(spine.length).padStart(2, "0")} · Causal spine</span>
          <Link to="/overview">Open on Platform</Link>
        </div>
        <ol className="platform-map-spine-rail">
          {spine.map((step, i) => (
            <li key={step}>
              <Link
                to="/overview"
                className="platform-map-spine-step"
                title={SPINE_DESC[step] ?? step}
              >
                <span className="platform-map-spine-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="platform-map-spine-label">{step}</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="platform-map-note">
          Trigger → recognition → signalling → response → consequence → failure → disease → biomarker →
          target → therapy → trial → patient → data → model → discovery — with feedback closing the loop.
        </p>
      </div>

      <div className="platform-map-layers" aria-label={`Twelve ${FLAGSHIP_NAME} layers`}>
        <div className="platform-map-kicker">
          <span>{String(layers.length).padStart(2, "0")} · Atlas layers</span>
          <span className="platform-map-kicker-muted">Academy overlays learning — not a 13th layer</span>
        </div>
        <ul className="platform-map-layer-grid">
          {layers.map((layer) => (
            <li key={layer.path}>
              <Link to={layer.path} className="platform-map-layer">
                <span className="platform-map-layer-num">{layer.n}</span>
                <span className="platform-map-layer-body">
                  <strong>{layer.title}</strong>
                  <small>{layer.desc}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
