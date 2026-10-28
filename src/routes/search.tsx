import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { searchProducts } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: () => ({ meta: [{ title: "Search — HMLND" }, { name: "description", content: "Search the HMLND catalogue." }, { property: "og:title", content: "Search — HMLND" }, { property: "og:description", content: "Search the HMLND catalogue." }, { name: "robots", content: "noindex" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const results = searchProducts(q.slice(0, 100));
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-16 md:px-10">
      <label htmlFor="q" className="eyebrow text-muted-foreground">Search</label>
      <input id="q" autoFocus className="field display !text-4xl md:!text-6xl" placeholder="Hoodie, linen, black…" value={q}
        onChange={(e) => navigate({ search: { q: e.target.value }, replace: true })} />
      <p className="my-8 text-xs text-muted-foreground" aria-live="polite">{q ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Start typing to search"}</p>
      <ProductGrid products={results} />
    </div>
  );
}
