/** User-facing product identity. Internal package paths may still say immune-city. */
export const PRODUCT_NAME = "Immune Super Intelligence";
export const PRODUCT_SHORT = "ISI";
/** Flagship interactive platform under the umbrella brand. */
export const FLAGSHIP_NAME = "Immune City";
export const TAGLINE = "Where Immunology Meets Advanced AI";
export const BRAND_EYEBROW = "Immunology × Scientific AI";
export const PRODUCT_LINE = `${PRODUCT_NAME} — ${TAGLINE}`;
export const ASK_NAME = `Ask ${PRODUCT_NAME}`;
export const CANONICAL_ORIGIN = "https://www.immune-super-intelligence.co.uk";
export const CANONICAL_URL = `${CANONICAL_ORIGIN}/`;
/** Primary in-app entry for “Explore Immune City” (this deploy is the live beta). */
export const EXPLORE_PATH = "/overview" as const;
/**
 * Public collaboration inbox for mailto enquiries.
 * Update if DNS/mail routing changes; do not invent alternate contact channels in copy.
 */
export const CONTACT_EMAIL = "collaborate@immune-super-intelligence.co.uk";

export const PROPOSITION =
  "Immune Super Intelligence is building tools that connect immunology, scientific evidence and advanced AI—helping people learn mechanisms, explore biological relationships and investigate research questions.";

export const HERO_HEADLINE =
  "Understand the immune system as a connected, evidence-aware system.";

export function pageTitle(section?: string): string {
  return section ? `${section} — ${PRODUCT_NAME}` : PRODUCT_LINE;
}
