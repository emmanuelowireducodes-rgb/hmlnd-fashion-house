// Demo editorial content. Placeholder stories, not real HMLND campaigns.
import homeland from "@/assets/project-homeland.jpg";
import mainline from "@/assets/hero-mainline.jpg";
import summer from "@/assets/hero-summer.jpg";
import atelier from "@/assets/hero-customised.jpg";

export interface Project {
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  season: string;
  cover: string;
  coverAlt: string;
  intro: string;
  body: string[];
  quote: string;
  gallery: { src: string; alt: string }[];
  credits: { role: string; name: string }[];
}

export const projects: Project[] = [
  {
    slug: "return-to-the-land",
    number: "01",
    title: "Return to the Land",
    subtitle: "A study of distance and belonging",
    season: "Campaign — Demo",
    cover: homeland,
    coverAlt: "Three models in layered monochrome clothing standing on wide open earth",
    intro: "Homeland is not a place on a map. It is the ground you carry with you.",
    body: [
      "Shot across an open plain at first light, the series follows three figures walking toward a horizon that never quite arrives. Layers are heavy, tonal and worn-in — clothing as shelter.",
      "The palette was drawn from the land itself: dust, charcoal, the grey of a dry-season sky. Every piece is meant to look as though it has already travelled.",
    ],
    quote: "We wanted the clothes to feel like they had a memory.",
    gallery: [
      { src: homeland, alt: "Wide landscape with three figures" },
      { src: mainline, alt: "Model in tonal layers under hard sunlight" },
    ],
    credits: [
      { role: "Photography", name: "Placeholder" },
      { role: "Styling", name: "Placeholder" },
      { role: "Location", name: "Placeholder" },
    ],
  },
  {
    slug: "light-and-concrete",
    number: "02",
    title: "Light & Concrete",
    subtitle: "Mainline foundations, in shadow",
    season: "Lookbook — Demo",
    cover: mainline,
    coverAlt: "Model in an oversized stone hoodie in a concrete room cut by sunlight",
    intro: "Foundations should be quiet. Their strength is in the weight.",
    body: [
      "A single room, a single shaft of light. The Mainline lookbook strips everything back to silhouette, texture and proportion.",
      "Heavy fleece, generous cuts and an unhurried drape — garments that hold their shape the way architecture does.",
    ],
    quote: "Nothing extra. Everything considered.",
    gallery: [
      { src: mainline, alt: "Concrete space with figure in light" },
      { src: atelier, alt: "Hands finishing a black garment" },
    ],
    credits: [
      { role: "Photography", name: "Placeholder" },
      { role: "Creative Direction", name: "Placeholder" },
    ],
  },
  {
    slug: "sunday-by-the-sea",
    number: "03",
    title: "Sunday by the Sea",
    subtitle: "Summer Christian Shirts",
    season: "Story — Demo",
    cover: summer,
    coverAlt: "Two models in white linen shirts on a rocky coast at sunset",
    intro: "After service, the coast. Linen, wind and the last of the gold light.",
    body: [
      "Summer Christian Shirts began as a ritual: the clean shirt kept for Sunday, then worn to the water afterwards.",
      "This story follows that ritual to the shoreline — open collars, light weaves and an easy, unbothered fit.",
    ],
    quote: "The best shirt is the one you keep for Sunday.",
    gallery: [
      { src: summer, alt: "Couple at the shoreline" },
      { src: homeland, alt: "Open landscape in black and white" },
    ],
    credits: [
      { role: "Photography", name: "Placeholder" },
      { role: "Talent", name: "Placeholder" },
    ],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
