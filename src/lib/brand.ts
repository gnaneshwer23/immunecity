/** User-facing product identity. Internal package paths may still say immune-city. */
export const PRODUCT_NAME = "Immune Super Intelligence";
export const PRODUCT_SHORT = "ISI";
/** Flagship interactive platform under the umbrella brand. */
export const FLAGSHIP_NAME = "Immune City";
export const TAGLINE = "Where Immunology Meets Advanced AI";
/** Exact homepage H1 — includes the terminal period from the product brief. */
export const HERO_HEADLINE = "Understand the immune system as a connected, investigable system.";
export const BRAND_EYEBROW = "Immunology × Scientific AI";
export const PRODUCT_LINE = `${PRODUCT_NAME} — ${TAGLINE}`;
/** Conversational assistant product name (umbrella brand stays PRODUCT_NAME). */
export const ASK_NAME = "Ask Immune";
export const CANONICAL_ORIGIN = "https://www.immune-super-intelligence.co.uk";
export const CANONICAL_URL = `${CANONICAL_ORIGIN}/`;
/** Primary marketing CTA → platform overview (flagship Immune City entry). */
export const EXPLORE_PATH = "/overview" as const;
export const EXPLORE_CTA = "Explore the Immune System";
/** Academy overview — learning entry (not a 13th atlas layer). */
export const LEARN_PATH = "/academy" as const;
export const LEARN_CTA = "Explore the Academy";
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

/** Short hero supporting line — keep the first viewport lean. */
export const HERO_SUPPORT =
  "Explore immune mechanisms, connect biological entities, trace scientific evidence and investigate how immune responses change across cells, tissues, diseases and therapies.";
/** Secondary homepage CTA → mechanism explorer. */
export const INVESTIGATE_PATH = "/mechanism" as const;
export const INVESTIGATE_CTA = "Investigate a Mechanism";
/** Hero trust line — educational beta framing for the first viewport. */
export const HERO_TRUST =
  "Educational beta · curated graph · not clinical decision support";
/** Single public trust line — reuse; avoid repeating “educational beta” on every section. */
export const TRUST_STATEMENT =
  "Educational immunology model with curated references. Ask Immune retrieves from the graph (and may show unreviewed literature as provisional) — not fully evidence-grounded AI. Not clinical decision support.";

export function pageTitle(section?: string): string {
  return section ? `${section} — ${PRODUCT_NAME}` : PRODUCT_LINE;
}
