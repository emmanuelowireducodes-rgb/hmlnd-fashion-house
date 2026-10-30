import { seoHead } from "@/lib/seo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fetchPublishedProducts, searchProducts, type Product } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: () =>
    seoHead({
      title: "Search | HMLND",
      description: "Search the HMLND catalogue.",
      path: "/search",
      noindex: true,
    }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [published, setPublished] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let active = true;
    fetchPublishedProducts()
      .then((items) => {
        if (active) setPublished(items);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const results = useMemo(() => {
    const query = q.slice(0, 100).trim().toLowerCase();
    const databaseResults = query
      ? published.filter((item) =>
          `${item.name} ${item.description} ${item.colours.map((colour) => colour.name).join(" ")}`
            .toLowerCase()
            .includes(query),
        )
      : [];
    const legacy = searchProducts(query);
    return [
      ...legacy,
      ...databaseResults.filter((item) => !legacy.some((old) => old.slug === item.slug)),
    ];
  }, [published, q]);
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-16 md:px-10">
      <label htmlFor="q" className="eyebrow text-muted-foreground">
        Search
      </label>
      <input
        id="q"
        autoFocus
        className="field display !text-4xl md:!text-6xl"
        placeholder="Hoodie, linen, black…"
        value={q}
        onChange={(e) => navigate({ search: { q: e.target.value }, replace: true })}
      />
      <p className="my-8 text-xs text-muted-foreground" aria-live="polite">
        {q
          ? `${results.length} result${results.length === 1 ? "" : "s"}`
          : "Start typing to search"}
      </p>
      {loadError && (
        <p role="status" className="mb-6 text-xs text-muted-foreground">
          Some newly published products could not be loaded.
        </p>
      )}
      <ProductGrid products={results} />
    </div>
  );
}
