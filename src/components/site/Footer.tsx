import { Link } from "@tanstack/react-router";
import { NAV } from "./Header";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 py-16 md:grid-cols-4 md:px-10">
        <div className="md:col-span-2">
          <p className="wordmark text-3xl md:text-5xl">HMLND</p>
          <p className="mt-4 max-w-xs text-sm opacity-60">Homeland. Clothing for the ground you carry with you.</p>
        </div>
        <nav aria-label="Shop" className="flex flex-col gap-3">
          <p className="eyebrow opacity-50">Shop</p>
          {NAV.map((n) => (
            <Link key={n.label} to={n.to} params={"params" in n ? n.params : undefined} className="text-sm link-line w-fit">
              {n.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Help" className="flex flex-col gap-3">
          <p className="eyebrow opacity-50">Client Services</p>
          <Link to="/account" className="text-sm link-line w-fit">Account</Link>
          <Link to="/cart" className="text-sm link-line w-fit">Bag</Link>
          <Link to="/search" search={{ q: "" }} className="text-sm link-line w-fit">Search</Link>
          <span className="text-sm opacity-60">Shipping within Ghana — rules coming soon</span>
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-2 border-t border-primary-foreground/15 px-5 py-6 text-[11px] opacity-60 md:flex-row md:px-10">
        <span>© {new Date().getFullYear()} HMLND. Prototype — all products &amp; prices are demo.</span>
        <span>Accra, Ghana</span>
      </div>
    </footer>
  );
}
