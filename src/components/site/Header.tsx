import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { projects } from "@/lib/projects";
import mainline from "@/assets/hero-mainline.jpg";
import summer from "@/assets/hero-summer.jpg";
import customised from "@/assets/hero-customised.jpg";
import { Logo } from "./Logo";

export const NAV = [
  { label: "Mainline", to: "/collections/$handle", params: { handle: "mainline" } },
  {
    label: "Summer Christian Shirts",
    to: "/collections/$handle",
    params: { handle: "summer-christian-shirts" },
  },
  { label: "Customised", to: "/customised" },
  { label: "Projects", to: "/projects" },
] as const;

const previews = [
  {
    image: mainline,
    alt: "Mainline tonal layers in a sunlit concrete space",
    copy: "Heavyweight foundations. Considered silhouettes.",
    action: "Explore Mainline",
    stories: projects.filter((p) => p.slug === "light-and-concrete"),
  },
  {
    image: summer,
    alt: "Summer Christian Shirts on the coast",
    copy: "Open collars and washed linen for long, golden days.",
    action: "Explore Summer Christian Shirts",
    stories: projects.filter((p) => p.slug === "sunday-by-the-sea"),
  },
  {
    image: customised,
    alt: "Hands finishing a made-to-order garment",
    copy: "Made to order. Your idea, finished in our atelier.",
    action: "Start a customisation enquiry",
    stories: [],
  },
  {
    image: projects[0]!.cover,
    alt: projects[0]!.coverAlt,
    copy: "Campaigns, lookbooks and stories from Homeland.",
    action: "All projects",
    stories: projects,
  },
];

function ShoppingBagLink({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <Link
      to="/cart"
      className="header-icon relative"
      aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}
      onClick={onClick}
    >
      <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.25} aria-hidden="true" />
      {count > 0 && (
        <span aria-hidden="true" className="bag-count">
          {count}
        </span>
      )}
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState("");
  const { count, ready } = useCart();
  const bagCount = ready ? count : 0;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
    setPreview("");
  }, [pathname]);

  // A narrow resize or a touch-only pointer switches to tap navigation.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1200px) and (hover: hover) and (pointer: fine)");
    const change = () => {
      setPreview("");
      setOpen(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  function changeMobile(next: boolean) {
    setPreview("");
    setOpen(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeMobile}>
      <div className="bg-primary py-2 text-center text-primary-foreground eyebrow !text-[10px]">
        Prototype storefront — demo catalogue &amp; prices
      </div>
      <header className="site-header sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-5 md:h-20 md:px-10">
          <NavigationMenu.Root
            aria-label="Primary"
            className="desktop-navigation"
            value={preview}
            onValueChange={setPreview}
            delayDuration={100}
            skipDelayDuration={300}
          >
            <NavigationMenu.List className="flex items-center gap-6">
              {NAV.map((n, index) => {
                const detail = previews[index]!;
                return (
                  <NavigationMenu.Item key={n.label} value={n.label.replaceAll(" ", "-")}>
                    <NavigationMenu.Trigger className="nav-preview-trigger eyebrow link-line">
                      {n.label}
                    </NavigationMenu.Trigger>
                    <NavigationMenu.Content
                      className="nav-preview"
                      onClickCapture={(e) => {
                        if (e.target instanceof Element && e.target.closest("a[href]"))
                          setPreview("");
                      }}
                    >
                      <div className="nav-preview__inner">
                        <div>
                          <p className="eyebrow">{n.label}</p>
                          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                            {detail.copy}
                          </p>
                          <ul className="mt-5 flex flex-col items-start gap-1">
                            <li>
                              <NavigationMenu.Link asChild>
                                <Link
                                  to={n.to}
                                  {...("params" in n ? { params: n.params } : {})}
                                  className="nav-preview__link eyebrow link-line"
                                >
                                  {detail.action}
                                </Link>
                              </NavigationMenu.Link>
                            </li>
                            {detail.stories.map((p) => (
                              <li key={p.slug}>
                                <NavigationMenu.Link asChild>
                                  <Link
                                    to="/projects/$slug"
                                    params={{ slug: p.slug }}
                                    className="nav-preview__link text-sm link-line"
                                  >
                                    {p.title}
                                  </Link>
                                </NavigationMenu.Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <NavigationMenu.Link asChild>
                          <Link
                            to={n.to}
                            {...("params" in n ? { params: n.params } : {})}
                            className="nav-preview__image"
                            aria-label={detail.action}
                          >
                            <img
                              src={detail.image}
                              alt={detail.alt}
                              width={320}
                              height={216}
                              className="h-full w-full object-cover"
                            />
                          </Link>
                        </NavigationMenu.Link>
                      </div>
                    </NavigationMenu.Content>
                  </NavigationMenu.Item>
                );
              })}
            </NavigationMenu.List>
          </NavigationMenu.Root>
          <Dialog.Trigger asChild>
            <button className="mobile-menu-trigger header-icon -ml-2" aria-label="Open menu">
              <Menu className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
            </button>
          </Dialog.Trigger>
          <Link
            to="/"
            className="text-xl md:text-[1.7rem]"
            aria-label="HMLND home"
            onClick={() => setPreview("")}
          >
            <Logo />
          </Link>
          <div
            className="flex items-center justify-end md:gap-1"
            onPointerEnter={() => setPreview("")}
            onFocusCapture={() => setPreview("")}
          >
            <Link to="/search" search={{ q: "" }} className="header-icon" aria-label="Search">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.25} aria-hidden="true" />
            </Link>
            <Link to="/account" className="header-icon hidden sm:inline-flex" aria-label="Account">
              <User className="h-[18px] w-[18px]" strokeWidth={1.25} aria-hidden="true" />
            </Link>
            <ShoppingBagLink count={bagCount} />
          </div>
        </div>
      </header>
      <Dialog.Portal>
        <Dialog.Overlay className="mobile-menu-overlay" />
        <Dialog.Content className="mobile-menu-panel">
          <Dialog.Title className="sr-only">HMLND navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Explore collections, customised clothing and projects.
          </Dialog.Description>
          <div className="flex h-16 shrink-0 items-center justify-between px-5">
            <Logo className="text-xl" />
            <Dialog.Close className="header-icon" aria-label="Close menu">
              <X className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <nav aria-label="Mobile" className="flex flex-1 flex-col justify-center gap-6 px-6 py-8">
            {NAV.map((n) => (
              <Dialog.Close asChild key={n.label}>
                <Link
                  to={n.to}
                  {...("params" in n ? { params: n.params } : {})}
                  className="display text-[clamp(1.75rem,7vw,3rem)] leading-tight"
                >
                  {n.label}
                </Link>
              </Dialog.Close>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-8 border-t px-6 py-4">
            <Dialog.Close asChild>
              <Link
                to="/search"
                search={{ q: "" }}
                className="eyebrow inline-flex min-h-11 items-center"
              >
                Search
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link to="/account" className="eyebrow inline-flex min-h-11 items-center">
                Account
              </Link>
            </Dialog.Close>
            <ShoppingBagLink count={bagCount} onClick={() => setOpen(false)} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
