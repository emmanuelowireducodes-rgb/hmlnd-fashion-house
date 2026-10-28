import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { lineKey } from "@/lib/cart-math";
import { formatGHS, getProduct } from "@/lib/catalog";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Bag — HMLND" }, { name: "description", content: "Your HMLND shopping bag." }, { property: "og:title", content: "Bag — HMLND" }, { property: "og:description", content: "Your HMLND shopping bag." }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, setQty, remove, ready } = useCart();
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 md:px-10">
      <h1 className="display text-5xl">Bag</h1>
      {ready && lines.length === 0 ? (
        <div className="py-20 text-center"><p className="text-muted-foreground">Your bag is empty.</p>
          <Link to="/collections/$handle" params={{ handle: "mainline" }} className="btn btn-solid mt-8">Shop Mainline</Link></div>
      ) : (
        <div className="mt-10 grid gap-12 md:grid-cols-[1fr_320px]">
          <ul className="divide-y border-y">
            {lines.map((l) => {
              const p = getProduct(l.slug);
              const k = lineKey(l);
              return (
                <li key={k} className="flex gap-5 py-6">
                  {p && <img src={p.images[0]!.src} alt={p.images[0]!.alt} className="aspect-[4/5] w-24 object-cover" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium uppercase tracking-[0.08em]">{p?.name ?? l.slug}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{l.colour} / {l.size}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center border">
                        <button className="h-9 w-9" aria-label="Decrease" onClick={() => setQty(k, l.quantity - 1)}>−</button>
                        <span className="w-6 text-center text-sm">{l.quantity}</span>
                        <button className="h-9 w-9" aria-label="Increase" onClick={() => setQty(k, l.quantity + 1)}>+</button>
                      </div>
                      <button className="eyebrow link-line" onClick={() => remove(k)}>Remove</button>
                    </div>
                  </div>
                  <p className="text-sm">{formatGHS(l.price * l.quantity)}</p>
                </li>
              );
            })}
          </ul>
          <aside className="h-fit border p-6">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatGHS(subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground"><span>Shipping</span><span>Coming soon</span></div>
            <button className="btn btn-solid mt-6 w-full" disabled>Checkout — coming soon</button>
            <p className="mt-3 text-xs text-muted-foreground">Demo store: payments (Mobile Money / card) are not connected yet. No order will be placed.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
