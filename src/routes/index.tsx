import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import mainline from "@/assets/hero-mainline.jpg";
import summer from "@/assets/hero-summer.jpg";
import customised from "@/assets/hero-customised.jpg";
import { projects } from "@/lib/projects";
import { Newsletter } from "@/components/site/Newsletter";
import { EditorialCta } from "@/components/site/EditorialCta";
import { MainlineCarousel } from "@/components/site/MainlineCarousel";

export const Route = createFileRoute("/")({
  head: () => seoHead({ title: "Heritage Memory Language Narrative Divinity", description: "Explore HMLND (Homeland): Mainline streetwear, Summer Christian Shirts and customised clothing from Ghana.", path: "/", image: mainline }),
  component: Index,
});

type HeroPlacement = "lower-left" | "lower-center" | "lower-right";

const heroPlacement = {
  summer: { mobile: "lower-center", tablet: "lower-center", desktop: "lower-right" },
  customised: { mobile: "lower-center", tablet: "lower-center", desktop: "lower-center" },
} satisfies Record<string, { mobile: HeroPlacement; tablet: HeroPlacement; desktop: HeroPlacement }>;

function Section({
  image, alt, eyebrow, title, titleLines, cta, to, params, priority, placement, sectionId,
}: {
  image: string; alt: string; eyebrow: string; title: string; titleLines?: string[]; cta: string;
  to: "/collections/$handle" | "/customised"; params?: { handle: string }; priority?: boolean;
  placement: { mobile: HeroPlacement; tablet: HeroPlacement; desktop: HeroPlacement };
  sectionId: "summer" | "customised";
}) {
  return (
    <section className={`collection-hero section-hero section-hero--${sectionId} group relative h-[92svh] min-h-[560px] overflow-hidden`} aria-label={title} data-section={sectionId} data-mobile-placement={placement.mobile} data-tablet-placement={placement.tablet} data-desktop-placement={placement.desktop}>
      <img
        src={image}
        alt={alt}
        width={1920}
        height={1088}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={`section-hero__image absolute inset-0 h-full w-full object-cover img-zoom group-hover:scale-[1.02] section-hero__image--${sectionId}`}
      />
      <div className="collection-hero__shade absolute inset-0" />
      <div className={`collection-hero__content section-copy section-copy--${sectionId} text-background`}>
        <p className="eyebrow animate-rise">{eyebrow}</p>
        <h2 className={`campaign-title section-title section-title--${sectionId} mt-3 animate-rise`} style={{ animationDelay: "120ms" }}>
          {titleLines ? titleLines.map((line) => <span className="block" key={line}>{line}</span>) : title}
        </h2>
        <EditorialCta tone="light" className="section-cta mt-5 animate-rise" style={{ animationDelay: "220ms" }}>
          <Link to={to} params={params as never}>{cta}</Link>
        </EditorialCta>
      </div>
    </section>
  );
}

function Index() {
  const project = projects[0]!;
  return (
    <>
      <h1 className="sr-only">HMLND — Homeland</h1>
      <MainlineCarousel />

      <Section
        sectionId="summer"
        image={summer}
        placement={heroPlacement.summer}
        alt="Two models in white linen shirts on a rocky coastline at sunset"
        eyebrow="HMLND Summer Christian Shirts"
        title="Summer Christian Shirts"
        titleLines={["Summer", "Christian", "Shirts"]}
        cta="Shop Now"
        to="/collections/$handle"
        params={{ handle: "summer-christian-shirts" }}
      />

      <Section
        sectionId="customised"
        image={customised}
        placement={heroPlacement.customised}
        alt="A tailor's hands finishing a black garment on a wooden table"
        eyebrow="Create your idea with us"
        title="Customised"
        cta="Start Creating"
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
          <div className="mt-10 flex flex-wrap gap-4">
            <EditorialCta><Link to="/projects/$slug" params={{ slug: project.slug }}>Read the story</Link></EditorialCta>
            <EditorialCta><Link to="/projects">All projects</Link></EditorialCta>
          </div>
        </div>
      </section>

      <Newsletter />
    </>
  );
}
