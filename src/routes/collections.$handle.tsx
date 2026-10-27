import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { collections, getCollectionProducts, isCollectionHandle, SIZES } from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";

export const Route = createFileRoute("/collections/$handle")({
  loader: ({ params }) => {
    if (!isCollectionHandle(params.handle)) throw notFound();
    return { handle: params.handle };
  },
  head: ({ loaderData }) => {
    const c = loaderData ? collections[loaderData.handle] : null;
    const title = c ? `${c.title} — HMLND` : "Collection — HMLND";
    const desc = c?.intro ?? "HMLND collection";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }] };
  },
  component: CollectionPage,
  notFoundComponent: () => <p className="px-10 py-32 text-center">Collection not found.</p>,
  errorComponent: () => <p className="px-10 py-32 text-center">Collection failed to load.</p>,
});

function CollectionPage() {
  const { handle } = Route.useLoaderData();
  const c = collections[handle];
  const all = getCollectionProducts(handle);
  const colours = [...new Set(all.flatMap((p) => p.colours.map((x) => x.name)))];
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [sort, setSort] = useState("featured");

  const list = useMemo(() => {
    const r = all.filter(
      (p) =>
        (!colour || p.colours.some((x) => x.name === colour)) &&
        (!size || p.variants.some((v) => v.size === size && v.available && (!colour || v.colour === colour))),
    );
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    if (sort === "high") r.sort((a, b) => b.price - a.price);
    return r;
  }, [all, size, colour, sort]);

  const sel = "field !w-auto !py-2 text-xs uppercase tracking-[0.15em]";
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-16 md:px-10">
      <p className="eyebrow text-muted-foreground">{c.eyebrow}</p>
      <h1 className="display mt-4 text-5xl md:text-7xl">{c.title}</h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">{c.intro}</p>
      <div className="my-10 flex flex-wrap items-center gap-6 border-y py-4">
        <label className="flex items-center gap-2 eyebrow">Size
          <select className={sel} value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">All</option>{SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 eyebrow">Colour
          <select className={sel} value={colour} onChange={(e) => setColour(e.target.value)}>
            <option value="">All</option>{colours.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="ml-auto flex items-center gap-2 eyebrow">Sort
          <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option><option value="low">Price: low</option><option value="high">Price: high</option>
          </select>
        </label>
      </div>
      {list.length ? <ProductGrid products={list} /> : <p className="py-20 text-center text-sm text-muted-foreground">No pieces match these filters.</p>}
    </div>
  );
}
