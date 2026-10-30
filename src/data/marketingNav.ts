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

/** Collaborate destination — footer Organisation only; not a header item. */
export const MARKETING_NAV_ACTION = { label: "Collaborate", path: "/collaborate" } as const;

/** Flat list for tests and footer alignment checks (Collaborate is footer-only). */
export const MARKETING_NAV = [
  ...MARKETING_NAV_PRIMARY,
  ...MARKETING_NAV_MORE,
  MARKETING_NAV_ACTION,
] as const;

export const FOOTER_GROUPS: readonly { label: string; items: readonly FooterItem[] }[] = [
  {
    label: "Explore",
    items: [
      { label: "Explore hub", path: "/explore" },
      { label: "Knowledge atlas", path: "/atlas" },
      { label: "Knowledge graph", path: "/graph" },
      { label: "Academy", path: "/academy" },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Research library", path: "/research" },
      { label: "Research Radar", path: "/discovery" },
      { label: "Ask Immune", path: "/ask" },
      { label: "Scientific reasoning", path: "/reasoning" },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Discussions", path: "/community" },
      { label: "Start a discussion", path: "/community/new" },
      { label: "Journal clubs", path: "/community/journal-clubs" },
    ],
  },
  {
    label: "Organisation",
    items: [
      { label: "Vision", path: "/vision" },
      { label: "About", path: "/about" },
      { label: "Collaborate", path: "/collaborate" },
      { label: "Methods", path: "/methods" },
      { label: "Insights", path: "/insights" },
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
  "/explore",
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
 * Global header IA: five ISI destinations (Explore / Research / Academy / Community / Ask Immune).
 * Separate from NAV_GROUPS, which is the twelve-layer Immune City science model.
 */
export type JourneyItem = { n: string; path: string; hash?: string; title: string; desc: string };

/** Unique key for a journey item (path + optional in-page section). */
export function journeyKey(i: { path: string; hash?: string }): string {
  return i.hash ? `${i.path}#${i.hash}` : i.path;
}

/**
 * Five primary pillars. Expert workspaces (SME/curation) and Trust/Methods live in
 * secondary/account/footer chrome — not competing science destinations.
 */
export const JOURNEY_NAV: readonly { label: string; items: readonly JourneyItem[] }[] = [
  {
    label: "Explore",
    items: [
      { n: "E0", path: "/explore", title: "Explore hub", desc: "Atlas, graph, mechanisms and biological explorers in one place." },
      { n: "E1", path: "/atlas", title: "Knowledge atlas", desc: "Concepts across eight domains, each with its own page." },
      { n: "E2", path: "/graph", title: "Knowledge graph", desc: "Typed concepts and directional causal links." },
      { n: "E3", path: "/mechanism", title: "Mechanisms and pathways", desc: "Step-by-step cascades and perturbations." },
      { n: "E4", path: "/dynamics", title: "Immune dynamics", desc: "Tissues, metabolism and genetics." },
      { n: "E5", path: "/disease", title: "Disease explorer", desc: "Hypersensitivity and the cancer immunity cycle." },
      { n: "E6", path: "/therapy", title: "Therapy explorer", desc: "Interventions, targets and linked trials." },
      { n: "E7", path: "/learn", title: "Cell atlas", desc: "Immune cells, roles and where metaphors break." },
      { n: "E8", path: "/overview", title: "System overview", desc: "Causal spine and twelve layers in one view." },
    ],
  },
  {
    label: "Research",
    items: [
      { n: "R1", path: "/research", title: "Research library", desc: "Journal metadata, candidate claims and workbench." },
      { n: "R2", path: "/discovery", title: "Research Radar", desc: "Evidence-governed unknowns and defensible next questions — ISI coverage, not worldwide absence." },
      { n: "R3", path: "/evidence", title: "Evidence explorer", desc: "Landmark trials and live claim-review coverage." },
      { n: "R4", path: "/reasoning", title: "Scientific reasoning", desc: "Retrieval grounding, curated pathways and path tracing — tools, not a second chatbot." },
      { n: "R5", path: "/simulator", title: "System simulator", desc: "Illustrative teaching model — not a prediction." },
      { n: "R6", path: "/patient", title: "Patient and biomarkers", desc: "Rule-based teaching — not medical advice." },
      { n: "R7", path: "/pipeline", title: "Disease pipelines", desc: "Therapies by mechanism, landmark and active trials." },
    ],
  },
  {
    label: "Academy",
    items: [
      { n: "A1", path: "/academy", title: "Immunology Academy", desc: "Guided foundation track through core immunology." },
      { n: "A2", path: "/mechanism", title: "Foundation lessons", desc: "Open a mechanism lesson from the curriculum." },
    ],
  },
  {
    label: "Community",
    items: [
      { n: "C1", path: "/community", title: "Discussions", desc: "Educational immunology discussion — not clinical advice." },
      { n: "C2", path: "/community/new", title: "Start a discussion", desc: "Open a new community post." },
      { n: "C3", path: "/community/journal-clubs", title: "Journal clubs", desc: "Shared reading and discussion threads." },
    ],
  },
  {
    label: "Ask Immune",
    items: [
      {
        n: "Q1",
        path: "/ask",
        title: "Ask Immune",
        desc: "Graph-grounded answers with reviewed and provisional sources labelled. Starting point for atlas, dossiers and research.",
      },
    ],
  },
];

/**
 * Direct header destinations beside the journey menus.
 * Empty by design: the five primaries live in JOURNEY_NAV pillars.
 * Account / workspace stay in the account menu; Methods in JOURNEY_SECONDARY.
 */
export const JOURNEY_PRIMARY = [] as const;

/** Secondary header links shown after the journeys (org / trust). */
export const JOURNEY_SECONDARY = [
  { label: "Methods", path: "/methods" },
  { label: "Vision", path: "/vision" },
  { label: "About", path: "/about" },
] as const;
