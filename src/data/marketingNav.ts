/** Public marketing IA — separate from the twelve atlas layer groups in nav.ts. */

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

export const FOOTER_GROUPS = [
  {
    label: "Explore",
    items: [
      { label: "Platform", path: "/overview" },
      { label: "Academy", path: "/academy" },
      { label: "Reasoning & AI", path: "/reasoning" },
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
] as const;

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
      { n: "L1", path: "/ask", title: "Ask Immune", desc: "Ask immunology questions answered from the graph." },
      { n: "L2", path: "/atlas", title: "Knowledge atlas", desc: "Every concept across eight domains, with its own page." },
      { n: "L3", path: "/overview", title: "Overview", desc: "The 15-step causal spine and twelve layers in one view." },
      { n: "L4", path: "/learn", title: "Cell atlas", desc: "Immune cells, what they do, and their limits." },
      { n: "L5", path: "/academy", title: "Immune system foundations", desc: "Guided foundation track through core immunology." },
      { n: "L6", path: "/mechanism", title: "Mechanisms and pathways", desc: "Step-by-step cascades and perturbations." },
    ],
  },
  {
    label: "Explore",
    items: [
      { n: "E1", path: "/graph", title: "Knowledge graph", desc: "Every concept and typed causal link." },
      { n: "E2", path: "/dynamics", title: "Immune dynamics", desc: "Tissues, metabolism and genetics." },
      { n: "E3", path: "/disease", title: "Disease explorer", desc: "Hypersensitivity and the cancer immunity cycle." },
      { n: "E4", path: "/therapy", title: "Therapy explorer", desc: "Interventions, their targets and trials." },
    ],
  },
  {
    label: "Investigate",
    items: [
      { n: "I1", path: "/simulator", title: "System simulator", desc: "Illustrative teaching model — not a prediction." },
      { n: "I2", path: "/reasoning", title: "Scientific reasoning", desc: "Ask, how the AI works, and the path tracer." },
      { n: "I3", path: "/research", title: "Research library", desc: "Nature Immunology metadata, candidates and workbench." },
      { n: "I4", path: "/evidence", title: "Evidence explorer", desc: "Trials as experiments and claim coverage." },
      { n: "I5", path: "/patient", title: "Patient and biomarkers", desc: "Educational, rule-based — not medical advice." },
    ],
  },
  {
    label: "Trust",
    items: [
      { n: "T1", path: "/methods", title: "Methods", desc: "Data model and how the platform is built." },
      { n: "T2", path: "/methods", hash: "statuses", title: "Evidence standards", desc: "What each evidence status means." },
      { n: "T3", path: "/methods", hash: "lifecycle", title: "Scientific review", desc: "How a claim moves from candidate to approved." },
      { n: "T4", path: "/methods", hash: "limitations", title: "Data sources and limitations", desc: "Where the evidence stops." },
    ],
  },
];

/** Secondary header links shown after the journeys. */
export const JOURNEY_SECONDARY = [
  { label: "Vision", path: "/vision" },
  { label: "About", path: "/about" },
] as const;
