import { seoHead } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import mainline from "@/assets/hero-mainline.jpg";
import summer from "@/assets/hero-summer.jpg";
import customised from "@/assets/hero-customised.jpg";
import { projects } from "@/lib/projects";
import { Newsletter } from "@/components/site/Newsletter";
import { EditorialCta } from "@/components/site/EditorialCta";
import { MainlineCarousel } from "@/components/site/MainlineCarousel";
import {
  defaultDesignSystem,
  designSystemStyle,
  resolveDesignSystem,
  type DesignSystem,
} from "@/lib/studio-design-system";

export const Route = createFileRoute("/")({
  head: () =>
    seoHead({
      title: "Heritage Memory Language Narrative Divinity",
      description:
        "Explore HMLND (Homeland): Mainline streetwear, Summer Christian Shirts and customised clothing from Ghana.",
      path: "/",
      image: mainline,
    }),
  component: Index,
});

type HeroPlacement = "lower-left" | "lower-center" | "lower-right";
type EditableHero = {
  id: string;
  title: string;
  eyebrow: string;
  cta: string;
  href: string;
  image: string;
  alt: string;
  focalX: number;
  focalY: number;
  visible: boolean;
  order: number;
  desktop?: { x: number; y: number; align: string; ctaX?: number; ctaY?: number };
  tablet?: { x: number; y: number; align: string; ctaX?: number; ctaY?: number };
  mobile?: { x: number; y: number; align: string; ctaX?: number; ctaY?: number };
};
type CampaignPlacement = { x: number; y: number; align: string; ctaX?: number; ctaY?: number };

const heroPlacement = {
  summer: { mobile: "lower-center", tablet: "lower-center", desktop: "lower-right" },
  customised: { mobile: "lower-center", tablet: "lower-center", desktop: "lower-center" },
} satisfies Record<
  string,
  { mobile: HeroPlacement; tablet: HeroPlacement; desktop: HeroPlacement }
>;

function Section({
  image,
  alt,
  eyebrow,
  title,
  titleLines,
  cta,
  to,
  params,
  priority,
  placement,
  sectionId,
}: {
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  titleLines?: string[];
  cta: string;
  to: "/collections/$handle" | "/customised";
  params?: { handle: string };
  priority?: boolean;
  placement: { mobile: HeroPlacement; tablet: HeroPlacement; desktop: HeroPlacement };
  sectionId: "summer" | "customised";
}) {
  const [campaign, setCampaign] = useState<EditableHero | null>(null);
  const [breakpoint, setBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");
  useEffect(() => {
    let alive = true;
    fetch("/api/site/home")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { sections?: EditableHero[] } | null) => {
        if (alive) setCampaign(data?.sections?.find((item) => item.id === sectionId) || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sectionId]);
  useEffect(() => {
    const update = () =>
      setBreakpoint(
        window.innerWidth < 768 ? "mobile" : window.innerWidth < 1200 ? "tablet" : "desktop",
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const placementConfig = campaign?.[breakpoint] as CampaignPlacement | undefined;
  if (campaign && !campaign.visible) return null;
  return (
    <section
      className={`collection-hero section-hero section-hero--${sectionId} group relative h-[92svh] min-h-[560px] overflow-hidden`}
      style={campaign ? { order: campaign.order } : undefined}
      aria-label={campaign?.title || title}
      data-section={sectionId}
      data-mobile-placement={placement.mobile}
      data-tablet-placement={placement.tablet}
      data-desktop-placement={placement.desktop}
    >
      <img
        src={campaign?.image || image}
        alt={campaign?.alt || alt}
        width={1920}
        height={1088}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        style={{ objectPosition: `${campaign?.focalX ?? 50}% ${campaign?.focalY ?? 50}%` }}
        className={`section-hero__image absolute inset-0 h-full w-full object-cover img-zoom group-hover:scale-[1.02] section-hero__image--${sectionId}`}
      />
      <div className="collection-hero__shade absolute inset-0" />
      <div
        className={`collection-hero__content section-copy section-copy--${sectionId} text-background`}
        style={campaign ? { inset: 0, width: "auto", transform: "none" } : undefined}
      >
        <div
          style={
            campaign
              ? {
                  position: "absolute",
                  left: `${placementConfig?.x ?? 50}%`,
                  top: `${placementConfig?.y ?? 70}%`,
                  transform: "translate(-50%,-50%)",
                  textAlign: placementConfig?.align as "left" | "center" | "right",
                  alignItems:
                    placementConfig?.align === "left"
                      ? "flex-start"
                      : placementConfig?.align === "right"
                        ? "flex-end"
                        : "center",
                  display: "flex",
                  flexDirection: "column",
                }
              : undefined
          }
        >
          <p className="eyebrow animate-rise">{campaign?.eyebrow || eyebrow}</p>
          <h2
            className={`campaign-title section-title section-title--${sectionId} mt-3 animate-rise`}
            style={{ animationDelay: "120ms" }}
          >
            {campaign?.title ||
              (titleLines
                ? titleLines.map((line) => (
                    <span className="block" key={line}>
                      {line}
                    </span>
                  ))
                : title)}
          </h2>
        </div>
        <EditorialCta
          tone="light"
          className="section-cta mt-5 animate-rise"
          style={
            campaign
              ? {
                  position: "absolute",
                  left: `${placementConfig?.ctaX ?? 50}%`,
                  top: `${placementConfig?.ctaY ?? 82}%`,
                  transform: "translate(-50%,-50%)",
                  margin: 0,
                }
              : { animationDelay: "220ms" }
          }
        >
          {campaign?.href ? (
            <a href={campaign.href}>{campaign.cta || cta}</a>
          ) : (
            <Link to={to} params={params as never}>
              {campaign?.cta || cta}
            </Link>
          )}
        </EditorialCta>
      </div>
    </section>
  );
}

function Index() {
  const project = projects[0]!;
  const [settings, setSettings] = useState<
    { id: string; order: number; visible: boolean }[] | null
  >(null);
  const [designSettings, setDesignSettings] = useState(defaultDesignSystem);
  useEffect(() => {
    let active = true;
    fetch("/api/site/home")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            sections?: { id: string; order: number; visible: boolean }[];
            designSystem?: DesignSystem;
          } | null,
        ) => {
          if (!active || !data) return;
          if (data.sections) setSettings(data.sections);
          setDesignSettings(resolveDesignSystem(data.designSystem));
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const setting = (id: string) => settings?.find((item) => item.id === id);
  return (
    <div className="home-sequence" style={designSystemStyle(designSettings)}>
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

      {setting("projects")?.visible !== false && (
        <section
          style={{ order: setting("projects")?.order ?? 3 }}
          className="mx-auto grid max-w-[1600px] items-center gap-10 px-5 py-24 md:grid-cols-2 md:px-10 md:py-32"
        >
          <Link
            to="/projects/$slug"
            params={{ slug: project.slug }}
            className="group block overflow-hidden"
          >
            <img
              src={project.cover}
              alt={project.coverAlt}
              loading="lazy"
              width={1920}
              height={1088}
              className="aspect-[4/3] w-full object-cover img-zoom group-hover:scale-[1.03]"
            />
          </Link>
          <div className="md:pl-10">
            <p className="eyebrow text-muted-foreground">Projects — {project.number}</p>
            <h2 className="display mt-5 text-5xl md:text-7xl">{project.title}</h2>
            <p className="mt-6 max-w-md text-muted-foreground">{project.intro}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <EditorialCta>
                <Link to="/projects/$slug" params={{ slug: project.slug }}>
                  Read the story
                </Link>
              </EditorialCta>
              <EditorialCta>
                <Link to="/projects">All projects</Link>
              </EditorialCta>
            </div>
          </div>
        </section>
      )}

      {setting("newsletter")?.visible !== false && (
        <div style={{ order: setting("newsletter")?.order ?? 4 }}>
          <Newsletter />
        </div>
      )}
    </div>
  );
}
