/** Public marketing IA — separate from the twelve atlas layer groups in nav.ts. */

export const MARKETING_NAV = [
  { label: "Platform", path: "/overview" },
  { label: "Learn", path: "/mechanism" },
  { label: "Scientific AI", path: "/scientific-ai" },
  { label: "Evidence & Methods", path: "/methods" },
  { label: "Insights", path: "/insights" },
  { label: "About", path: "/about" },
] as const;

export const FOOTER_GROUPS = [
  {
    label: "Explore",
    items: [
      { label: "Platform", path: "/overview" },
      { label: "Academy", path: "/mechanism" },
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

/** Routes that use marketing chrome (nav + no layer sidebar). */
export const MARKETING_PATHS = new Set([
  "/",
  "/about",
  "/collaborate",
  "/insights",
  "/scientific-ai",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/accessibility",
]);

export function isMarketingPath(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  return false;
}
