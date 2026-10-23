/**
 * Release budgets for the public site. These are targets, not a measured Lighthouse score.
 * LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
 */
export const WEB_VITAL_BUDGETS = {
  lcpMs: 2500,
  inpMs: 200,
  cls: 0.1,
} as const;

export const RELEASE_LANDMARKS = {
  mainId: "main",
  headerNavLabel: "Primary",
} as const;
