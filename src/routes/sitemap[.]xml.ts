import { createFileRoute } from "@tanstack/react-router";
import { sitemapResponse } from "@/lib/crawling";

export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: { GET: () => sitemapResponse() } },
});
