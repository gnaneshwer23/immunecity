/** Public marketing IA — separate from the twelve atlas layer groups in nav.ts. */

/** Primary header links (Insights lives under More). */
export const MARKETING_NAV_PRIMARY = [
  { label: "Platform", path: "/overview" },
  { label: "Academy", path: "/academy" },
  { label: "Scientific AI", path: "/scientific-ai" },
  { label: "Evidence & Methods", path: "/methods" },
  { label: "About", path: "/about" },
] as const;

/** Secondary items under More — keep Insights here until the series is reviewed and useful. */
export const MARKETING_NAV_MORE = [
  { label: "Insights", path: "/insights" },
] as const;

/** Distinct collaborate action (not buried in More). */
export const MARKETING_NAV_ACTION = { label: "Collaborate", path: "/collaborate" } as const;

/** Flat list for tests and footer alignment checks. */
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
      { label: "Scientific AI", path: "/scientific-ai" },
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
  "/collaborate",
  "/insights",
  "/scientific-ai",
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
