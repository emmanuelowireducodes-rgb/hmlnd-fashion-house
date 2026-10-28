import { createFileRoute, Link } from "@tanstack/react-router";
import mainline from "@/assets/hero-mainline.jpg";
import summer from "@/assets/hero-summer.jpg";
import customised from "@/assets/hero-customised.jpg";
import { products } from "@/lib/catalog";
import { projects } from "@/lib/projects";
import { ProductCard } from "@/components/product/ProductCard";
import { Newsletter } from "@/components/site/Newsletter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HMLND — Homeland | Mainline, Summer Shirts & Customised" },
      { name: "description", content: "HMLND (Homeland): heavyweight Mainline essentials, Summer Christian Shirts and made-to-order Customised pieces from Ghana." },
      { property: "og:title", content: "HMLND — Homeland" },
      { property: "og:description", content: "Mainline, Summer Christian Shirts and Customised. Premium streetwear from Ghana." },
    ],
  }),
  component: Index,
});

function Section({
  image, alt, eyebrow, title, copy, cta, to, params, priority, align = "left",
}: {
  image: string; alt: string; eyebrow: string; title: string; copy: string; cta: string;
  to: "/collections/$handle" | "/customised"; params?: { handle: string }; priority?: boolean; align?: "left" | "right";
}) {
  return (
    <section className="group relative h-[92svh] min-h-[560px] overflow-hidden" aria-label={title}>
      <img
        src={image}
        alt={alt}
        width={1920}
        height={1088}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className="absolute inset-0 h-full w-full object-cover img-zoom group-hover:scale-[1.02]"
      />
      <div className="absolute inset-0 hero-overlay" />
      <div className={`relative mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-14 text-background md:px-10 md:pb-20 ${align === "right" ? "md:items-end md:text-right" : ""}`}>
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h2 className="display mt-4 max-w-3xl text-6xl animate-rise md:text-8xl lg:text-[9rem]" style={{ animationDelay: "120ms" }}>
          {title}
        </h2>
        <p className="mt-5 max-w-sm text-sm opacity-85 animate-rise" style={{ animationDelay: "220ms" }}>{copy}</p>
        <Link to={to} params={params as never} className="btn btn-on-image mt-8 w-fit animate-rise" style={{ animationDelay: "320ms" }}>
          {cta}
        </Link>
      </div>
    </section>
  );
}

function Index() {
  const featured = products.filter((p) => p.isNew).slice(0, 4);
  const project = projects[0]!;
  return (
    <>
      <h1 className="sr-only">HMLND — Homeland</h1>
      <Section
        priority
        image={mainline}
        alt="Model in an oversized stone hoodie and wide trousers in a sunlit concrete space"
        eyebrow="HMLND Mainline"
        title="Mainline"
        copy="Heavyweight foundations in stone, taupe and washed black."
        cta="Shop Mainline"
        to="/collections/$handle"
        params={{ handle: "mainline" }}
      />

      <section className="mx-auto max-w-[1600px] px-5 py-24 md:px-10" aria-labelledby="new-title">
        <div className="mb-10 flex items-end justify-between">
          <h2 id="new-title" className="display text-4xl md:text-5xl">New Arrivals</h2>
          <Link to="/collections/$handle" params={{ handle: "mainline" }} className="eyebrow link-line">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </section>

      <Section
        image={summer}
        alt="Two models in white linen shirts on a rocky coastline at sunset"
        eyebrow="HMLND Summer Christian Shirts"
        title="Summer Christian Shirts"
        copy="Open collars and washed linen for long, golden days."
        cta="Shop Summer"
        to="/collections/$handle"
        params={{ handle: "summer-christian-shirts" }}
        align="right"
      />

      <Section
        image={customised}
        alt="A tailor's hands finishing a black garment on a wooden table"
        eyebrow="HMLND Customised"
        title="Customised"
        copy="Made to order. Your idea, finished in our atelier."
        cta="Start an enquiry"
        to="/customised"
      />

      <section className="mx-auto grid max-w-[1600px] items-center gap-10 px-5 py-24 md:grid-cols-2 md:px-10 md:py-32">
        <Link to="/projects/$slug" params={{ slug: project.slug }} className="group block overflow-hidden">
          <img src={project.cover} alt={project.coverAlt} loading="lazy" width={1920} height={1088} className="aspect-[4/3] w-full object-cover img-zoom group-hover:scale-[1.03]" />
        </Link>
        <div className="md:pl-10">
          <p className="eyebrow text-muted-foreground">Projects — {project.number}</p>
          <h2 className="display mt-5 text-5xl md:text-7xl">{project.title}</h2>
          <p className="mt-6 max-w-md text-muted-foreground">{project.intro}</p>
          <div className="mt-10 flex gap-6">
            <Link to="/projects/$slug" params={{ slug: project.slug }} className="btn btn-solid">Read the story</Link>
            <Link to="/projects" className="eyebrow link-line self-center">All projects</Link>
          </div>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
