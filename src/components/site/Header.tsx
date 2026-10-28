import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Search, User, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { Logo } from "./Logo";

export const NAV = [
  { label: "Mainline", to: "/collections/$handle", params: { handle: "mainline" } },
  { label: "Summer Christian Shirts", to: "/collections/$handle", params: { handle: "summer-christian-shirts" } },
  { label: "Customised", to: "/customised" },
  { label: "Projects", to: "/projects" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { count, ready } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="bg-primary py-2 text-center text-primary-foreground eyebrow !text-[10px]">
        Prototype storefront — demo catalogue &amp; prices
      </div>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-5 md:h-20 md:px-10">
          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} params={"params" in n ? n.params : undefined} className="eyebrow link-line">
                {n.label}
              </Link>
            ))}
          </nav>
          <button className="-ml-2 p-2 lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" strokeWidth={1.25} />
          </button>

          <Link to="/" className="text-xl md:text-[1.7rem]" aria-label="HMLND home">
            <Logo />
          </Link>

          <div className="flex items-center justify-end gap-1 md:gap-4">
            <Link to="/search" search={{ q: "" }} className="p-2" aria-label="Search">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.25} />
            </Link>
            <Link to="/account" className="hidden p-2 sm:block" aria-label="Account">
              <User className="h-[18px] w-[18px]" strokeWidth={1.25} />
            </Link>
            <Link to="/cart" className="eyebrow p-2" aria-label={`Cart, ${count} items`}>
              Bag ({ready ? count : 0})
            </Link>
          </div>
        </div>
      </header>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-300">
          <div className="flex h-16 items-center justify-between px-5">
            <Logo className="text-xl" />
            <button className="p-2" aria-label="Close menu" onClick={() => setOpen(false)} autoFocus>
              <X className="h-5 w-5" strokeWidth={1.25} />
            </button>
          </div>
          <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center gap-6 px-6">
            {NAV.map((n, i) => (
              <Link
                key={n.label}
                to={n.to}
                params={"params" in n ? n.params : undefined}
                className="display animate-rise text-5xl"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex gap-8 border-t px-6 py-6">
            <Link to="/search" search={{ q: "" }} className="eyebrow">Search</Link>
            <Link to="/account" className="eyebrow">Account</Link>
            <Link to="/cart" className="eyebrow">Bag ({count})</Link>
          </div>
        </div>
      )}
    </>
  );
}
