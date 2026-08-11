import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://play.fgn.gg";
export const SITE_NAME = "FGN Esports";

interface SeoProps {
  /** Page-specific title. Rendered as "{title} | FGN Esports" unless titleTemplate is false. */
  title: string;
  /** Meta description. Keep under ~160 characters. */
  description?: string;
  /** Route path this page canonically lives at, e.g. "/tournaments/abc". */
  path?: string;
  /** Absolute https URL for the social preview image. */
  image?: string;
  /** og:type — "website" for hubs, "article" for content pages. */
  type?: "website" | "article";
  /** Set true on pages that should never appear in search results. */
  noindex?: boolean;
  /** Structured data object(s) serialized into a JSON-LD script tag. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Pass false to use `title` verbatim without the site-name suffix. */
  titleTemplate?: boolean;
}

/**
 * Per-route head metadata. Note this mutates document.head client-side, so
 * JS-executing crawlers (Googlebot) see it, but social-preview crawlers only
 * ever read the static tags in index.html.
 */
const Seo = ({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  jsonLd,
  titleTemplate = true,
}: SeoProps) => {
  const fullTitle = titleTemplate ? `${title} | ${SITE_NAME}` : title;
  const canonical = path ? `${SITE_URL}${path}` : undefined;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {canonical && <link rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      {canonical && <meta property="og:url" content={canonical} />}
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}

      {blocks.map((block, i) => (
        <script type="application/ld+json" key={i}>
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
