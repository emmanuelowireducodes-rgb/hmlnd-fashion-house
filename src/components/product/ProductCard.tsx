import { Link } from "@tanstack/react-router";
import { formatGHS, isProductSoldOut, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const soldOut = isProductSoldOut(product);
  const [a, b] = product.images;
  return (
    <Link to="/products/$slug" params={{ slug: product.slug }} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-card">
        <img src={a.src} alt={a.alt} loading="lazy" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover img-zoom group-hover:scale-[1.03]" />
        {b && (
          <img src={b.src} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
        )}
        {(soldOut || product.isNew) && (
          <span className="absolute left-3 top-3 bg-background px-2 py-1 eyebrow !text-[9px]">{soldOut ? "Sold out" : "New"}</span>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-2 md:gap-4">
        <div>
          <h3 className="text-[13px] font-medium uppercase tracking-[0.08em]">{product.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{product.colours.length} colour{product.colours.length > 1 ? "s" : ""}</p>
        </div>
        <p className="shrink-0 text-[13px]">{formatGHS(product.price)}</p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
