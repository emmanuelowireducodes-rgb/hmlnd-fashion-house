import { collections, products } from "@/lib/catalog";
import { projects } from "@/lib/projects";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export function sitemapPaths() {
  return ["/", "/customised", "/projects", ...Object.keys(collections).map((handle) => `/collections/${handle}`), ...products.map((p) => `/products/${p.slug}`), ...projects.map((p) => `/projects/${p.slug}`)];
}

export function escapeXml(value: string) {
  return value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!);
}

export function sitemapResponse() {
  if (!SITE_URL) return new Response('Set VITE_SITE_URL to enable the sitemap.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
  const urls = sitemapPaths().map((path) => `<url><loc>${escapeXml(absoluteUrl(path)!)}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

export function robotsResponse() {
  // Allow crawling so search engines can read the noindex tags on utility pages.
  const body = `User-agent: *\nAllow: /\n${SITE_URL ? `\nSitemap: ${absoluteUrl('/sitemap.xml')}\n` : ''}`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
