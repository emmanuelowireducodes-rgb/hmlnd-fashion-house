import { seoHead, breadcrumbScript, absoluteUrl, jsonLd } from "@/lib/seo";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { formatGHS, getProduct, isVariantAvailable, SIZES } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/products/$slug")({
  loader: ({ params }) => {
    const p = getProduct(params.slug);
    if (!p) throw notFound();
    return { slug: p.slug, name: p.name, description: p.description, price: p.price };
  },
  head: ({ loaderData }) => {
    const product = loaderData ? getProduct(loaderData.slug) : undefined;
    if (!product) return seoHead({ title: "Product Not Found | HMLND", description: "This product could not be found.", path: "/products", noindex: true });
    const path = `/products/${product.slug}`;
    return { ...seoHead({ title: `${product.name} | HMLND`, description: product.description, path, image: product.images[0]!.src, imageAlt: product.images[0]!.alt }),
      scripts: [
        ...breadcrumbScript([{ name: "Home", path: "/" }, { name: product.collection === "mainline" ? "Mainline" : "Summer Christian Shirts", path: `/collections/${product.collection}` }, { name: product.name, path }]),
        { type: "application/ld+json", children: jsonLd({
          "@context": "https://schema.org", "@type": "Product", name: product.name,
          description: product.description, url: absoluteUrl(path),
          image: product.images.map((image) => absoluteUrl(image.src)).filter(Boolean),
          // Demo catalogue: do not publish an Offer until real prices and checkout are live.
        }) },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => <p className="px-10 py-32 text-center">This product doesn't exist.</p>,
  errorComponent: () => <p className="px-10 py-32 text-center">Product failed to load.</p>,
});

function ProductPage() {
  const { slug } = Route.useLoaderData();
  const p = getProduct(slug)!;
  const { add } = useCart();
  const [img, setImg] = useState(0);
  const [colour, setColour] = useState(p.colours[0]!.name);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const sizes = SIZES.filter((s) => p.variants.some((v) => v.size === s));
  const ok = size && isVariantAvailable(p, colour, size);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-10 px-5 py-10 md:grid-cols-[1.4fr_1fr] md:px-10">
      <div>
        <img src={p.images[img]!.src} alt={p.images[img]!.alt} width={1024} height={1280} className="aspect-[4/5] w-full bg-card object-cover" />
        <div className="mt-3 flex gap-3">
          {p.images.map((im, i) => (
            <button key={i} onClick={() => setImg(i)} aria-label={`View image ${i + 1}`} className={`w-20 border ${i === img ? "border-foreground" : "border-transparent"}`}>
              <img src={im.src} alt="" className="aspect-[4/5] w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <div className="md:sticky md:top-28 md:self-start">
        <Link to="/collections/$handle" params={{ handle: p.collection }} className="eyebrow text-muted-foreground link-line">Back to collection</Link>
        <h1 className="mt-6 font-display text-2xl font-normal uppercase tracking-[0.08em]">{p.name}</h1>
        <p className="mt-2">{formatGHS(p.price)} <span className="text-xs text-muted-foreground">(demo price)</span></p>
        <p className="mt-6 text-sm text-muted-foreground">{p.description}</p>

        <p className="eyebrow mt-8">Colour — {colour}</p>
        <div className="mt-3 flex gap-3">
          {p.colours.map((c) => (
            <button key={c.name} aria-label={c.name} aria-pressed={c.name === colour} onClick={() => { setColour(c.name); setSize(""); }}
              className={`h-8 w-8 border p-0.5 ${c.name === colour ? "border-foreground" : "border-border"}`}>
              <span className="block h-full w-full" style={{ background: c.swatch }} />
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="eyebrow">Size</p>
          <Dialog>
            <DialogTrigger className="eyebrow link-line">Size guide</DialogTrigger>
            <DialogContent>
              <DialogTitle>Size guide (demo, chest in cm)</DialogTitle>
              <table className="w-full text-sm"><tbody>
                {[["XS", 96], ["S", 104], ["M", 112], ["L", 120], ["XL", 128], ["XXL", 136]].map(([s, c]) => (
                  <tr key={s} className="border-b"><td className="py-2">{s}</td><td>{c}</td></tr>
                ))}
              </tbody></table>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {sizes.map((s) => {
            const avail = isVariantAvailable(p, colour, s);
            return (
              <button key={s} disabled={!avail} aria-pressed={s === size} onClick={() => setSize(s)}
                className={`h-11 border text-xs ${s === size ? "border-foreground bg-foreground text-background" : ""} ${avail ? "" : "line-through opacity-40"}`}>
                {s}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <div className="flex items-center border">
            <button className="h-12 w-10" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
            <span className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
            <button className="h-12 w-10" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(10, q + 1))}>+</button>
          </div>
          <button className="btn btn-solid flex-1" disabled={!ok}
            onClick={() => { add({ slug: p.slug, colour, size, quantity: qty, price: p.price }); toast(`${p.name} added to bag`); }}>
            {sizes.every((s) => !isVariantAvailable(p, colour, s)) ? "Sold out" : size ? "Add to bag" : "Select a size"}
          </button>
        </div>

        <Accordion type="single" collapsible className="mt-10">
          <AccordionItem value="d"><AccordionTrigger className="eyebrow">Details</AccordionTrigger>
            <AccordionContent><ul className="list-disc pl-4 text-sm">{p.details.map((d) => <li key={d}>{d}</li>)}</ul></AccordionContent></AccordionItem>
          <AccordionItem value="c"><AccordionTrigger className="eyebrow">Care</AccordionTrigger>
            <AccordionContent><ul className="list-disc pl-4 text-sm">{p.care.map((d) => <li key={d}>{d}</li>)}</ul></AccordionContent></AccordionItem>
          <AccordionItem value="s"><AccordionTrigger className="eyebrow">Shipping</AccordionTrigger>
            <AccordionContent className="text-sm">Shipping rules for Ghana are coming soon.</AccordionContent></AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
