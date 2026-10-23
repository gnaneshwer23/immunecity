/** User-facing product identity. Internal package paths may still say immune-city. */
export const PRODUCT_NAME = "Immune Super Intelligence";
export const PRODUCT_SHORT = "ISI";
/** Flagship interactive platform under the umbrella brand. */
export const FLAGSHIP_NAME = "Immune City";
export const TAGLINE = "Where Immunology Meets Advanced AI";
/** Exact homepage H1 from the ISI 2.0 blueprint. */
export const HERO_HEADLINE = "Understand the Immune System Like Never Before";
/** Flagship graph entry from the homepage hero. */
export const CITY_PATH = "/graph" as const;
export const CITY_CTA = "Explore Immune City";
export const COMMUNITY_PATH = "/community" as const;
export const COMMUNITY_CTA = "Join Community";
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
export const ATLAS_CTA = "Enter Atlas";
/**
 * Public collaboration inbox for mailto enquiries.
 * Update if DNS/mail routing changes; do not invent alternate contact channels in copy.
 */
export const CONTACT_EMAIL = "collaborate@immune-super-intelligence.co.uk";

/**
 * Public educational immunology video channel (outbound learning link).
 * Reuse via LearningOutboundLink — do not invent alternate YouTube URLs in copy.
 */
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@DrGnaneshwer";
/** Visible label — educational video channel, not clinical decision support. */
export const YOUTUBE_CHANNEL_LABEL = "Immunology videos — Dr Gnaneshwer on YouTube";

export const PROPOSITION =
  "Immune Super Intelligence connects immunology, curated evidence and scientific AI—so people can learn mechanisms, explore biological relationships and investigate research questions in one place.";

/** Short hero supporting line — keep the first viewport lean. */
export const HERO_SUPPORT =
  "A curated map of immune relationships, with review status labelled. Educational resource — not clinical decision support.";
/** Secondary homepage CTA → mechanism explorer. */
export const INVESTIGATE_PATH = "/mechanism" as const;
export const INVESTIGATE_CTA = "Investigate a Mechanism";
/** Hero trust line — short, publication-grade disclaimer for the first viewport. */
export const HERO_TRUST = "Educational resource · Not clinical decision support";
/**
 * Single public trust line for footer / TrustBlock.
 * Keep claim-coverage detail on Methods — not in chrome.
 */
export const TRUST_STATEMENT =
  "An educational immunology resource with curated references. Not clinical decision support.";
/**
 * Compact Ask product line for journeys and enter rails.
 * Full limits live on Ask, Reasoning and Methods — avoid restating on every section.
 */
export const ASK_PUBLIC_LINE =
  "Answers draw on the curated graph, with reviewed and provisional sources labelled.";
/** One-line Ask evidence limit for secondary chrome. */
export const ASK_EVIDENCE_LIMIT = "Not fully evidence-grounded AI.";

export function pageTitle(section?: string): string {
  return section ? `${section} — ${PRODUCT_NAME}` : PRODUCT_LINE;
}
