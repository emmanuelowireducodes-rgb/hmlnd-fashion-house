import defaultImage from "@/assets/hero-mainline.jpg";

// Set this to the final public origin at build time, never a preview URL.
const configuredUrl = import.meta.env["VITE_SITE_URL"]?.trim();
export const SITE_URL = configuredUrl ? validateOrigin(configuredUrl) : undefined;

export function validateOrigin(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_SITE_URL must be an HTTP(S) origin, such as https://example.com');
  }
  return url.origin;
}

export function absoluteUrl(path: string): string | undefined {
  return SITE_URL ? new URL(path, SITE_URL).href : undefined;
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
};

export function seoHead({ title, description, path, image = defaultImage, imageAlt = 'HMLND Mainline streetwear', type = 'website', noindex = false }: SeoOptions) {
  const canonical = absoluteUrl(path.split(/[?#]/)[0]!);
  const imageUrl = absoluteUrl(image);
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:site_name', content: 'HMLND' },
      { property: 'og:locale', content: 'en_GH' },
      ...(canonical ? [{ property: 'og:url', content: canonical }] : []),
      ...(imageUrl ? [{ property: 'og:image', content: imageUrl }, { property: 'og:image:alt', content: imageAlt }] : []),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(imageUrl ? [{ name: 'twitter:image', content: imageUrl }, { name: 'twitter:image:alt', content: imageAlt }] : []),
    ],
    links: canonical && !noindex ? [{ rel: 'canonical', href: canonical }] : [],
  };
}

export function breadcrumbScript(items: { name: string; path: string }[]) {
  return SITE_URL ? [{ type: 'application/ld+json', children: jsonLd({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  }) }] : [];
}
