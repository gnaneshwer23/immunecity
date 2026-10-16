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
/** Primary marketing CTA → platform overview (flagship Immune City entry). */
export const EXPLORE_PATH = "/overview" as const;
export const EXPLORE_CTA = "Explore Immune City";
/** Academy overview — learning entry (not a 13th atlas layer). */
export const LEARN_PATH = "/academy" as const;
export const LEARN_CTA = "Start learning";
/** Atlas graph entry from the platform overview CTA. */
export const ATLAS_PATH = "/graph" as const;
export const ATLAS_CTA = "Enter atlas";
/**
 * Public collaboration inbox for mailto enquiries.
 * Update if DNS/mail routing changes; do not invent alternate contact channels in copy.
 */
export const CONTACT_EMAIL = "collaborate@immune-super-intelligence.co.uk";

export const PROPOSITION =
  "Immune Super Intelligence is building tools that connect immunology, scientific evidence and advanced AI—helping people learn mechanisms, explore biological relationships and investigate research questions.";

export const HERO_HEADLINE =
  "Understand the immune system as a connected, evidence-aware system.";

/** Short hero supporting line — keep the first viewport lean. */
export const HERO_SUPPORT =
  "Learn mechanisms, explore causal relationships, and investigate research questions—with references.";

export function pageTitle(section?: string): string {
  return section ? `${section} — ${PRODUCT_NAME}` : PRODUCT_LINE;
}
