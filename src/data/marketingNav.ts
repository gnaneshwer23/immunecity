/** Public marketing IA — separate from the twelve atlas layer groups in nav.ts. */

/** Footer item: internal path or outbound href (learning / social). */
export type FooterItem =
  | { label: string; path: string }
  | { label: string; href: string };

/** Primary header links. Insights stays footer-only until the series is ready. */
export const MARKETING_NAV_PRIMARY = [
  { label: "Platform", path: "/overview" },
  { label: "Academy", path: "/academy" },
  { label: "Evidence & Methods", path: "/methods" },
  { label: "Vision", path: "/vision" },
  { label: "About", path: "/about" },
] as const;

/**
 * Secondary header items. Empty by design: a single Insights destination does not
 * justify a More menu (and overflow clipping). Keep Insights in the footer.
 */
export const MARKETING_NAV_MORE = [] as const;

/** Distinct collaborate action (not buried in a submenu). */
export const MARKETING_NAV_ACTION = { label: "Collaborate", path: "/collaborate" } as const;

/** Flat list for tests, mobile panel, and footer alignment checks. */
export const MARKETING_NAV = [
  ...MARKETING_NAV_PRIMARY,
  ...MARKETING_NAV_MORE,
  MARKETING_NAV_ACTION,
] as const;

export const FOOTER_GROUPS: readonly { label: string; items: readonly FooterItem[] }[] = [
  {
    label: "Explore",
    items: [
      { label: "Platform", path: "/overview" },
      { label: "Academy", path: "/academy" },
      { label: "Reasoning & AI", path: "/reasoning" },
      { label: "Community", path: "/community" },
    ],
  },
  {
    label: "Science",
    items: [
      { label: "Evidence & Methods", path: "/methods" },
      { label: "Insights", path: "/insights" },
      { label: "Evidence coverage", path: "/evidence" },
    ],
  },
  {
    label: "Organisation",
    items: [
      { label: "Vision", path: "/vision" },
      { label: "About", path: "/about" },
      { label: "Collaborate", path: "/collaborate" },
      { label: "Research library", path: "/research" },
    ],
  },
  {
    label: "Trust",
    items: [
      { label: "Privacy", path: "/privacy" },
      { label: "Terms", path: "/terms" },
      { label: "Educational disclaimer", path: "/disclaimer" },
      { label: "Accessibility", path: "/accessibility" },
    ],
  },
];

/** Exact paths that use marketing chrome (nav + no layer sidebar). */
export const MARKETING_PATHS = new Set([
  "/",
  "/overview",
  "/academy",
  "/methods",
  "/about",
  "/vision",
  "/collaborate",
  "/insights",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/accessibility",
]);

/** Prefixes whose nested routes stay on marketing chrome (Academy / Learn). */
const MARKETING_PREFIXES = ["/mechanism", "/academy"] as const;

export function isMarketingPath(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  return MARKETING_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Global header IA: the three ISI user journeys (Learn / Explore / Investigate).
 * Separate from NAV_GROUPS, which is the twelve-layer Immune City map.
 */
export type JourneyItem = { n: string; path: string; hash?: string; title: string; desc: string };

/** Unique key for a journey item (path + optional in-page section). */
export function journeyKey(i: { path: string; hash?: string }): string {
  return i.hash ? `${i.path}#${i.hash}` : i.path;
}

export const JOURNEY_NAV: readonly { label: string; items: readonly JourneyItem[] }[] = [
  {
    label: "Learn",
    items: [
      { n: "L1", path: "/ask", title: "Ask Immune", desc: "Graph-based answers with labelled sources." },
      { n: "L2", path: "/atlas", title: "Knowledge atlas", desc: "Concepts across eight domains, each with its own page." },
      { n: "L3", path: "/overview", title: "Overview", desc: "Causal spine and twelve layers in one view." },
      { n: "L4", path: "/learn", title: "Cell atlas", desc: "Immune cells, roles and where metaphors break." },
      { n: "L5", path: "/academy", title: "Immune system foundations", desc: "Guided foundation track through core immunology." },
      { n: "L6", path: "/mechanism", title: "Mechanisms and pathways", desc: "Step-by-step cascades and perturbations." },
    ],
  },
  {
    label: "Explore",
    items: [
      { n: "E1", path: "/graph", title: "Knowledge graph", desc: "Typed concepts and directional causal links." },
      { n: "E2", path: "/dynamics", title: "Immune dynamics", desc: "Tissues, metabolism and genetics." },
      { n: "E3", path: "/disease", title: "Disease explorer", desc: "Hypersensitivity and the cancer immunity cycle." },
      { n: "E4", path: "/therapy", title: "Therapy explorer", desc: "Interventions, targets and linked trials." },
    ],
  },
  {
    label: "Investigate",
    items: [
      { n: "I1", path: "/simulator", title: "System simulator", desc: "Illustrative teaching model — not a prediction." },
      { n: "I2", path: "/reasoning", title: "Scientific reasoning", desc: "Ask, retrieval grounding and path tracing." },
      { n: "I3", path: "/research", title: "Research library", desc: "Journal metadata, candidate claims and workbench." },
      { n: "I4", path: "/evidence", title: "Evidence explorer", desc: "Landmark trials and live claim-review coverage." },
      { n: "I5", path: "/patient", title: "Patient and biomarkers", desc: "Rule-based teaching — not medical advice." },
      { n: "I6", path: "/pipeline", title: "Disease pipelines", desc: "Therapies by mechanism, landmark and active trials." },
    ],
  },
  {
    label: "Trust",
    items: [
      { n: "T1", path: "/methods", title: "Methods", desc: "Evidence lifecycle, live coverage and model limits." },
      { n: "T2", path: "/methods", hash: "live-ev-heading", title: "Live coverage", desc: "How many relationship claims have been reviewed." },
      { n: "T3", path: "/methods", hash: "statuses", title: "Evidence standards", desc: "What each review status means." },
      { n: "T4", path: "/methods", hash: "limitations", title: "Data sources and limitations", desc: "Where the evidence stops." },
    ],
  },
];

/**
 * Visible primary destinations. They also stay inside Learn / Explore / Investigate
 * so those journeys remain the map. Community is listed only because /community exists.
 * My Workspace is intentionally absent.
 */
export const JOURNEY_PRIMARY = [
  { label: "Ask Immune", path: "/ask" },
  { label: "Research", path: "/research" },
  { label: "Simulate", path: "/simulator" },
  { label: "Community", path: "/community" },
] as const;

/** Secondary header links shown after the journeys. */
export const JOURNEY_SECONDARY = [
  { label: "Vision", path: "/vision" },
  { label: "About", path: "/about" },
] as const;
