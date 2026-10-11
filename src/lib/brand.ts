/** User-facing product identity. Internal package paths may still say immune-city. */
export const PRODUCT_NAME = "Immune Super Intelligence";
export const PRODUCT_SHORT = "ISI";
export const TAGLINE = "Where Immunology Meets Advanced AI";
export const PRODUCT_LINE = `${PRODUCT_NAME} — ${TAGLINE}`;
export const ASK_NAME = `Ask ${PRODUCT_NAME}`;
export const CANONICAL_ORIGIN = "https://www.immune-super-intelligence.co.uk";
export const CANONICAL_URL = `${CANONICAL_ORIGIN}/`;

export function pageTitle(section?: string): string {
  return section ? `${section} — ${PRODUCT_NAME}` : PRODUCT_LINE;
}
