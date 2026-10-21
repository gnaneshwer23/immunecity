import { CANONICAL_ORIGIN, CANONICAL_URL, PRODUCT_NAME, TAGLINE } from "./brand";

/** Stable social preview image (served from /public). */
export const OG_IMAGE_URL = `${CANONICAL_ORIGIN}/og-image.jpg`;
export const OG_IMAGE_WIDTH = "1200";
export const OG_IMAGE_HEIGHT = "630";
export const OG_IMAGE_ALT = `${PRODUCT_NAME} — the immune system as a connected, investigable system`;

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return CANONICAL_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_ORIGIN}${normalized}`;
}

type SeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
  noIndex?: boolean;
};

/** Shared head meta for public pages (title, description, Open Graph, Twitter, robots). */
export function seoHead({
  title,
  description,
  path = "/",
  image = OG_IMAGE_URL,
  type = "website",
  noIndex = false,
}: SeoInput) {
  const url = absoluteUrl(path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: noIndex
          ? "noindex, nofollow"
          : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      },
      { name: "googlebot", content: noIndex ? "noindex, nofollow" : "index, follow" },
      { property: "og:type", content: type },
      { property: "og:site_name", content: PRODUCT_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      ...(image?.startsWith("https://")
        ? [
            { property: "og:image", content: image },
            ...(image === OG_IMAGE_URL
              ? [
                  { property: "og:image:width", content: OG_IMAGE_WIDTH },
                  { property: "og:image:height", content: OG_IMAGE_HEIGHT },
                ]
              : []),
            {
              property: "og:image:alt",
              content: image === OG_IMAGE_URL ? OG_IMAGE_ALT : `${PRODUCT_NAME} — ${TAGLINE}`,
            },
            { name: "twitter:image", content: image },
            {
              name: "twitter:image:alt",
              content: image === OG_IMAGE_URL ? OG_IMAGE_ALT : `${PRODUCT_NAME} — ${TAGLINE}`,
            },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Organization + WebSite JSON-LD for the document head. */
export function siteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${CANONICAL_ORIGIN}/#organization`,
        name: PRODUCT_NAME,
        url: CANONICAL_URL,
        logo: `${CANONICAL_ORIGIN}/logo.svg`,
        description:
          "Educational immunology platform connecting mechanisms, curated evidence and scientific AI — teaching with references, not clinical advice.",
        email: "collaborate@immune-super-intelligence.co.uk",
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": `${CANONICAL_ORIGIN}/#website`,
        url: CANONICAL_URL,
        name: PRODUCT_NAME,
        description: `${PRODUCT_NAME}: learn immunology as a connected system — curated causal map, mechanisms and Ask that educates with references.`,
        publisher: { "@id": `${CANONICAL_ORIGIN}/#organization` },
        inLanguage: "en-GB",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${CANONICAL_ORIGIN}/ask?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/** Schema.org DefinedTerm for one Atlas concept page (curated graph entry, not medical advice). */
export function conceptJsonLd(c: {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  graphVersion: string;
  sameAs?: string[];
}): Record<string, unknown> {
  const url = absoluteUrl(`/atlas/${c.id}`);
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${url}#term`,
    name: c.name,
    termCode: c.id,
    description: c.description,
    ...(c.aliases.length ? { alternateName: c.aliases } : {}),
    ...(c.sameAs?.length ? { sameAs: c.sameAs } : {}),
    url,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": `${CANONICAL_ORIGIN}/atlas#termset`,
      name: `${PRODUCT_NAME} Knowledge Atlas`,
      url: absoluteUrl("/atlas"),
      version: c.graphVersion,
      publisher: { "@id": `${CANONICAL_ORIGIN}/#organization` },
    },
    mainEntityOfPage: url,
    inLanguage: "en-GB",
  };
}
