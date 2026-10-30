import { seoHead, breadcrumbScript } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  collections,
  fetchPublishedCollection,
  fetchPublishedProducts,
  getCollectionProducts,
  SIZES,
  type Product,
} from "@/lib/catalog";
import { ProductGrid } from "@/components/product/ProductCard";

export const Route = createFileRoute("/collections/$handle")({
  loader: ({ params }) => {
    return { handle: params.handle };
  },
  head: ({ loaderData }) => {
    const c = loaderData ? collections[loaderData.handle] : undefined;
    if (!c)
      return seoHead({
        title: "Collection Not Found | HMLND",
        description: "This collection could not be found.",
        path: "/collections",
        noindex: true,
      });
    const path = `/collections/${c.handle}`;
    return {
      ...seoHead({
        title: `${c.title} | HMLND Streetwear`,
        description: c.intro,
        path,
        image: c.image,
        imageAlt: `HMLND ${c.title}`,
      }),
      scripts: breadcrumbScript([
        { name: "Home", path: "/" },
        { name: c.title, path },
      ]),
    };
  },
  component: CollectionPage,
  notFoundComponent: () => <p className="px-10 py-32 text-center">Collection not found.</p>,
  errorComponent: () => <p className="px-10 py-32 text-center">Collection failed to load.</p>,
});

function CollectionPage() {
  const { handle } = Route.useLoaderData();
  const legacyCollection = collections[handle];
  const [databaseCollection, setDatabaseCollection] = useState<{
    title: string;
    eyebrow: string;
    intro: string;
    image: string;
  } | null>(null);
  const [published, setPublished] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [collectionChecked, setCollectionChecked] = useState(false);
  useEffect(() => {
    let active = true;
    fetchPublishedCollection(handle)
      .then((collection) => {
        if (!active) return;
        setDatabaseCollection({
          title: collection.name,
          eyebrow: collection.name,
          intro: collection.description,
          image: collection.coverImage || "/images/hero-mainline.jpg",
        });
        setPublished(collection.products);
        setCollectionChecked(true);
      })
      .catch(async (error: Error) => {
        if (!active) return;
        if (error.message !== "Collection not found") setLoadError(true);
        if (legacyCollection) {
          try {
            const items = await fetchPublishedProducts();
            if (active)
              setPublished(
                items.filter(
                  (item) => item.collections?.includes(handle) || item.collection === handle,
                ),
              );
          } catch {
            if (active) setLoadError(true);
          }
        }
        if (active) setCollectionChecked(true);
      });
    return () => {
      active = false;
    };
  }, [handle, legacyCollection]);
  const c = databaseCollection || legacyCollection;
  const all = useMemo(() => {
    const legacy = getCollectionProducts(handle);
    return [
      ...legacy,
      ...published.filter((item) => !legacy.some((old) => old.slug === item.slug)),
    ];
  }, [handle, published]);
  const colours = [...new Set(all.flatMap((p) => p.colours.map((x) => x.name)))];
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [sort, setSort] = useState("featured");

  const list = useMemo(() => {
    const r = all.filter(
      (p) =>
        (!colour || p.colours.some((x) => x.name === colour)) &&
        (!size ||
          p.variants.some(
            (v) => v.size === size && v.available && (!colour || v.colour === colour),
          )),
    );
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    if (sort === "high") r.sort((a, b) => b.price - a.price);
    return r;
  }, [all, size, colour, sort]);

  const sel = "field !w-auto !py-2 text-xs uppercase tracking-[0.15em]";
  if (!c && !collectionChecked)
    return (
      <p role="status" className="px-6 py-24 text-center">
        Loading collection…
      </p>
    );
  if (!c) return <p className="px-6 py-24 text-center">This collection is unavailable.</p>;
  return (
    <div className="mx-auto max-w-[1600px] px-5 py-16 md:px-10">
      <p className="eyebrow text-muted-foreground">{c.eyebrow}</p>
      <h1 className="display mt-4 text-5xl md:text-7xl">{c.title}</h1>
      <p className="mt-4 max-w-md text-sm text-muted-foreground">{c.intro}</p>
      {loadError && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          Some newly published products could not be loaded.
        </p>
      )}
      <div className="my-10 flex flex-wrap items-center gap-6 border-y py-4">
        <label className="flex items-center gap-2 eyebrow">
          Size
          <select className={sel} value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">All</option>
            {SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 eyebrow">
          Colour
          <select className={sel} value={colour} onChange={(e) => setColour(e.target.value)}>
            <option value="">All</option>
            {colours.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="ml-auto flex items-center gap-2 eyebrow">
          Sort
          <select className={sel} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="low">Price: low</option>
            <option value="high">Price: high</option>
          </select>
        </label>
      </div>
      {list.length ? (
        <ProductGrid products={list} />
      ) : (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No pieces match these filters.
        </p>
      )}
    </div>
  );
}
