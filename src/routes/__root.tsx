import { seoHead, absoluteUrl, jsonLd } from "@/lib/seo";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow text-muted-foreground">404</p>
        <h1 className="display mt-4 text-5xl">Page not found</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link to="/" className="btn btn-solid mt-8">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="display text-4xl">This page didn't load</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something went wrong. Try again or head back home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-solid"
          >
            Try again
          </button>
          <a href="/" className="btn btn-outline">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// Set VITE_BRAND_FONT_KIT_URL to the client's authorized Adobe Fonts Web Project URL.
const BRAND_FONT_KIT_URL = import.meta.env["VITE_BRAND_FONT_KIT_URL"]?.trim() ?? "";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      ...seoHead({
        title: "Page Not Found | HMLND",
        description: "The requested HMLND page could not be found.",
        path: "/",
        noindex: true,
      }).meta,
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: jsonLd({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "HMLND",
          alternateName: "Heritage Memory Language Narrative Divinity",
          url: absoluteUrl("/"),
          logo: absoluteUrl("/hmlnd-logo-dark.png"),
          description: "Streetwear from Ghana.",
        }),
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,400;0,500;0,600;0,800;1,800&display=swap",
      },
      ...(BRAND_FONT_KIT_URL ? [{ rel: "stylesheet", href: BRAND_FONT_KIT_URL }] : []),
      { rel: "stylesheet", href: appCss },
      {
        rel: "icon",
        href: "/favicon.ico?v=hmlnd",
        type: "image/x-icon",
        sizes: "16x16 32x32 48x48 64x64 128x128 256x256",
      },
      { rel: "icon", href: "/favicon.png?v=hmlnd", type: "image/png", sizes: "256x256" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isStudio = pathname.startsWith("/studio");

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-background focus:p-3"
        >
          Skip to content
        </a>
        {!isStudio && <Header />}
        <main id="main">
          <Outlet />
        </main>
        {!isStudio && <Footer />}
        <Toaster position="bottom-right" />
      </CartProvider>
    </QueryClientProvider>
  );
}
