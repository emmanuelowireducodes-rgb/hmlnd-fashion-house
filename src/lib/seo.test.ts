import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); });

describe("SEO metadata", () => {
  it("uses the production origin and strips search parameters from canonical paths", async () => {
    vi.stubEnv("VITE_SITE_URL", "https://hmlnd.example");
    const { seoHead } = await import("./seo");
    const head = seoHead({ title: "Mainline", description: "Streetwear", path: "/collections/mainline?sort=low" });
    expect(head.links).toEqual([{ rel: "canonical", href: "https://hmlnd.example/collections/mainline" }]);
    expect(head.meta).toContainEqual({ property: "og:image", content: expect.stringMatching(/^https:\/\/hmlnd\.example\//) });
  });
  it("keeps utility pages out of the index", async () => {
    vi.stubEnv("VITE_SITE_URL", "https://hmlnd.example");
    const { seoHead } = await import("./seo");
    const head = seoHead({ title: "Bag", description: "Bag", path: "/cart", noindex: true });
    expect(head.links).toEqual([]);
    expect(head.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  });
  it("does not invent a public domain when it is unconfigured", async () => {
    vi.stubEnv("VITE_SITE_URL", "");
    const { seoHead } = await import("./seo");
    expect(seoHead({ title: "Home", description: "Home", path: "/" }).links).toEqual([]);
    const { sitemapResponse } = await import("./crawling");
    expect(sitemapResponse().status).toBe(503);
  });
  it("lists public catalogue URLs but excludes utility pages", async () => {
    vi.stubEnv("VITE_SITE_URL", "https://hmlnd.example");
    const { sitemapResponse, robotsResponse } = await import("./crawling");
    const xml = await sitemapResponse().text();
    expect(xml).toContain("https://hmlnd.example/products/heavyweight-hoodie");
    expect(xml).not.toMatch(/\/(cart|search|account)</);
    expect(await robotsResponse().text()).toContain("Sitemap: https://hmlnd.example/sitemap.xml");
  });
  it("escapes script delimiters in JSON-LD without changing the data", async () => {
    const { jsonLd, validateOrigin } = await import("./seo");
    const value = { name: "</script><script>alert(1)</script>" };
    const serialized = jsonLd(value);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(value);
    expect(() => validateOrigin("https://example.com/path")).toThrow();
  });
});
