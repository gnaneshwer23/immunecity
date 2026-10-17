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
      { label: "Research workbench", path: "/research" },
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
export const JOURNEY_NAV = [
  {
    label: "Learn",
    items: [
      { n: "L1", path: "/overview", title: "Platform", desc: "The 15-step causal spine and twelve layers in one view." },
      { n: "L2", path: "/learn", title: "Cell atlas", desc: "Immune cells, what they do, and their limits." },
      { n: "L3", path: "/academy", title: "Academy", desc: "Guided foundation track through core immunology." },
      { n: "L4", path: "/mechanism", title: "Mechanisms", desc: "Step-by-step cascades and perturbations." },
      { n: "L5", path: "/patient", title: "Patient guide", desc: "Educational, rule-based — not medical advice." },
    ],
  },
  {
    label: "Explore",
    items: [
      { n: "E1", path: "/graph", title: "Knowledge graph", desc: "Every concept and typed causal link." },
      { n: "E2", path: "/disease", title: "Disease", desc: "Hypersensitivity and the cancer immunity cycle." },
      { n: "E3", path: "/therapy", title: "Therapy", desc: "Interventions, their targets and trials." },
      { n: "E4", path: "/simulator", title: "Simulator", desc: "Illustrative infection and treatment model." },
      { n: "E5", path: "/dynamics", title: "Dynamics", desc: "Tissues, metabolism and genetics." },
    ],
  },
  {
    label: "Investigate",
    items: [
      { n: "I1", path: "/evidence", title: "Evidence", desc: "Trials as experiments and claim coverage." },
      { n: "I2", path: "/methods", title: "Methods", desc: "How evidence is graded and reviewed." },
      { n: "I3", path: "/reasoning", title: "Reasoning & AI", desc: "Ask, how the AI works, and the path tracer." },
      { n: "I4", path: "/research", title: "Research workbench", desc: "Literature candidates and draft hypotheses." },
    ],
  },
] as const;

/** Secondary header links shown after the journeys. */
export const JOURNEY_SECONDARY = [
  { label: "Vision", path: "/vision" },
  { label: "About", path: "/about" },
] as const;
