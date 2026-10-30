import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import mainline from "@/assets/hero-mainline.jpg";
import { EditorialCta } from "./EditorialCta";

const slides = [
  {
    src: mainline,
    alt: "Model in an oversized stone hoodie and wide trousers in a sunlit concrete space",
    className: "",
  },
  {
    src: "/images/hmlnd_mainline_concrete_couture.png",
    alt: "Model in black HMLND streetwear in a Ghanaian-inspired fashion atelier",
    className: "mainline-carousel__image--atelier",
  },
] as const;

const SWIPE_THRESHOLD = 48;

type CmsHero = {
  id: string;
  image?: string;
  title?: string;
  eyebrow?: string;
  cta?: string;
  focalX?: number;
  focalY?: number;
  desktop?: { x: number; y: number; align: string; ctaX?: number; ctaY?: number };
  tablet?: { x: number; y: number; align: string; ctaX?: number; ctaY?: number };
  mobile?: { x: number; y: number; align: string; ctaX?: number; ctaY?: number };
  href?: string;
  visible?: boolean;
  order?: number;
};

export function MainlineCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [campaign, setCampaign] = useState<CmsHero | null>(null);
  const [breakpoint, setBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const carouselRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () =>
      setBreakpoint(
        window.innerWidth < 768 ? "mobile" : window.innerWidth < 1200 ? "tablet" : "desktop",
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/site/home")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { sections?: CmsHero[] } | null) => {
        if (alive) setCampaign(data?.sections?.find((item) => item.id === "mainline") || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (hovered || focused || interacting || reducedMotion) return;
    const timer = window.setTimeout(
      () => setActiveSlide((current) => (current + 1) % slides.length),
      6000,
    );
    return () => window.clearTimeout(timer);
  }, [activeSlide, focused, hovered, interacting, reducedMotion]);

  const goTo = (index: number) => {
    setActiveSlide((index + slides.length) % slides.length);
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (
      !event.isPrimary ||
      (event.target instanceof Element && event.target.closest("button, a"))
    ) {
      return;
    }
    pointerStart.current = { x: event.clientX, y: event.clientY };
    setInteracting(true);
  };

  const handlePointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    setInteracting(false);
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;
    goTo(activeSlide + (deltaX < 0 ? 1 : -1));
  };

  if (campaign?.visible === false) return null;

  return (
    <section
      ref={carouselRef}
      style={campaign ? { order: campaign.order ?? 0 } : undefined}
      className="collection-hero section-hero section-hero--mainline mainline-carousel group relative h-[92svh] min-h-[560px] overflow-hidden"
      aria-label="Mainline collection campaigns"
      aria-roledescription="carousel"
      data-mobile-placement="lower-center"
      data-tablet-placement="lower-left"
      data-desktop-placement="lower-center"
      data-active-slide={activeSlide}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        pointerStart.current = null;
        setInteracting(false);
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
        setInteracting(false);
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!carouselRef.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(activeSlide - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          goTo(activeSlide + 1);
        }
      }}
    >
      <div className="mainline-carousel__slides" aria-live="off">
        {slides.map((slide, index) => (
          <div
            className={`mainline-carousel__slide${index === activeSlide ? " is-active" : ""}`}
            key={slide.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            aria-hidden={index !== activeSlide}
          >
            <img
              src={index === 0 && campaign?.image ? campaign.image : slide.src}
              alt={slide.alt}
              width={index === 0 ? 1920 : 1122}
              height={index === 0 ? 1088 : 1402}
              loading="eager"
              fetchPriority={index === 0 ? "high" : "low"}
              decoding="async"
              draggable={false}
              style={
                index === 0
                  ? { objectPosition: `${campaign?.focalX ?? 50}% ${campaign?.focalY ?? 50}%` }
                  : undefined
              }
              className={`mainline-carousel__image ${slide.className}`}
            />
          </div>
        ))}
      </div>

      <div className="collection-hero__shade mainline-carousel__shade" />
      <div
        className="collection-hero__content mainline-carousel__content campaign-copy campaign-copy--mainline text-background"
        style={campaign ? { inset: 0, width: "auto", transform: "none" } : undefined}
      >
        <div
          style={
            campaign
              ? {
                  position: "absolute",
                  left: `${campaign[breakpoint]?.x ?? 50}%`,
                  top: `${campaign[breakpoint]?.y ?? 68}%`,
                  bottom: "auto",
                  transform: "translate(-50%,-50%)",
                  width: "min(80%, 34rem)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems:
                    campaign[breakpoint]?.align === "left"
                      ? "flex-start"
                      : campaign[breakpoint]?.align === "right"
                        ? "flex-end"
                        : "center",
                  textAlign: (campaign[breakpoint]?.align || "center") as
                    "left" | "center" | "right",
                }
              : undefined
          }
        >
          <p className="eyebrow animate-rise">{campaign?.eyebrow || "Discover our essentials"}</p>
          <h2
            className="campaign-title section-title section-title--mainline mt-3 animate-rise"
            style={{ animationDelay: "120ms" }}
          >
            {campaign?.title || "Mainline"}
          </h2>
        </div>
        <EditorialCta
          tone="light"
          className="section-cta mt-5 animate-rise"
          style={
            campaign
              ? {
                  position: "absolute",
                  left: `${campaign[breakpoint]?.ctaX ?? 50}%`,
                  top: `${campaign[breakpoint]?.ctaY ?? 82}%`,
                  transform: "translate(-50%,-50%)",
                  margin: 0,
                }
              : { animationDelay: "220ms" }
          }
        >
          {campaign?.href ? (
            <a href={campaign.href}>{campaign.cta || "Shop Now"}</a>
          ) : (
            <Link to="/collections/$handle" params={{ handle: "mainline" }}>
              {campaign?.cta || "Shop Now"}
            </Link>
          )}
        </EditorialCta>
      </div>

      <button
        type="button"
        className="mainline-carousel__arrow mainline-carousel__arrow--previous"
        aria-label="Previous Mainline campaign"
        onClick={() => goTo(activeSlide - 1)}
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <button
        type="button"
        className="mainline-carousel__arrow mainline-carousel__arrow--next"
        aria-label="Next Mainline campaign"
        onClick={() => goTo(activeSlide + 1)}
      >
        <ChevronRight aria-hidden="true" />
      </button>
      <div className="mainline-carousel__indicators" aria-label="Choose Mainline campaign">
        {slides.map((slide, index) => (
          <button
            type="button"
            className={`mainline-carousel__indicator${index === activeSlide ? " is-active" : ""}`}
            key={slide.src}
            aria-label={`Show campaign ${index + 1} of ${slides.length}`}
            aria-pressed={index === activeSlide}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </section>
  );
}
