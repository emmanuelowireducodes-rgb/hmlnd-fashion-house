// DEMO CATALOG — placeholder products and prices for prototyping only.
// Shape mirrors a future `products` / `product_variants` table so this module
// can be swapped for a database query without touching components.
import hoodie from "@/assets/p-hoodie.jpg";
import tee from "@/assets/p-tee.jpg";
import pant from "@/assets/p-pant.jpg";
import shirt from "@/assets/p-shirt.jpg";
import mainline from "@/assets/hero-mainline.jpg";
import summer from "@/assets/hero-summer.jpg";
import homeland from "@/assets/project-homeland.jpg";

export type CollectionHandle = "mainline" | "summer-christian-shirts";

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export interface Variant {
  colour: string;
  size: Size;
  available: boolean;
}

export interface Product {
  slug: string;
  name: string;
  collection: CollectionHandle;
  /** Price in pesewas (GHS minor unit) to avoid float errors. */
  price: number;
  colours: { name: string; swatch: string }[];
  variants: Variant[];
  images: { src: string; alt: string }[];
  description: string;
  details: string[];
  care: string[];
  isNew?: boolean;
}

export interface Collection {
  handle: CollectionHandle;
  title: string;
  eyebrow: string;
  intro: string;
  image: string;
}

export const collections: Record<CollectionHandle, Collection> = {
  mainline: {
    handle: "mainline",
    title: "Mainline",
    eyebrow: "HMLND Mainline",
    intro: "Heavyweight foundations. Considered silhouettes built to be worn for years.",
    image: mainline,
  },
  "summer-christian-shirts": {
    handle: "summer-christian-shirts",
    title: "Summer Christian Shirts",
    eyebrow: "HMLND Summer",
    intro: "Light, open-collar shirts for long days and Sunday evenings by the water.",
    image: summer,
  },
};

// Colour swatches are data (product attributes), not UI theme colours.
const BLACK = { name: "Washed Black", swatch: "oklch(0.25 0.005 60)" };
const BONE = { name: "Bone", swatch: "oklch(0.93 0.02 85)" };
const TAUPE = { name: "Taupe", swatch: "oklch(0.64 0.02 70)" };
const WHITE = { name: "Optic White", swatch: "oklch(0.98 0.003 90)" };
const SAND = { name: "Sand", swatch: "oklch(0.82 0.04 80)" };

function grid(colours: string[], sizes: readonly Size[], soldOut: string[] = []): Variant[] {
  return colours.flatMap((colour) =>
    sizes.map((size) => ({ colour, size, available: !soldOut.includes(`${colour}/${size}`) })),
  );
}

export const products: Product[] = [
  {
    slug: "heavyweight-hoodie",
    name: "Heavyweight Hoodie",
    collection: "mainline",
    price: 85000,
    colours: [BLACK, TAUPE],
    variants: grid([BLACK.name, TAUPE.name], SIZES, ["Washed Black/XS", "Taupe/XXL", "Taupe/XS"]),
    images: [
      { src: hoodie, alt: "Heavyweight hoodie in washed black, front view" },
      { src: mainline, alt: "Model wearing an oversized hoodie and wide trousers in a concrete space" },
    ],
    description: "A dense brushed-back fleece hoodie with dropped shoulders and a deep double-layer hood.",
    details: ["Demo spec: 480gsm cotton fleece", "Oversized fit — size down for a closer fit", "Kangaroo pocket", "Ribbed cuffs and hem"],
    care: ["Cold wash inside out", "Do not tumble dry", "Dry flat in shade"],
    isNew: true,
  },
  {
    slug: "boxy-essential-tee",
    name: "Boxy Essential Tee",
    collection: "mainline",
    price: 35000,
    colours: [BONE, BLACK],
    variants: grid([BONE.name, BLACK.name], SIZES, ["Bone/M"]),
    images: [
      { src: tee, alt: "Boxy heavyweight t-shirt in bone, front view" },
      { src: mainline, alt: "Editorial portrait in tonal stone layers" },
    ],
    description: "A cropped, boxy tee in compact jersey with a thick ribbed collar.",
    details: ["Demo spec: 280gsm cotton jersey", "Boxy cropped fit", "Dropped shoulder"],
    care: ["Cold wash", "Iron on reverse"],
  },
  {
    slug: "wide-leg-sweatpant",
    name: "Wide Leg Sweatpant",
    collection: "mainline",
    price: 70000,
    colours: [TAUPE, BLACK],
    variants: grid([TAUPE.name, BLACK.name], ["S", "M", "L", "XL"]),
    images: [
      { src: pant, alt: "Wide leg sweatpant in taupe, folded" },
      { src: mainline, alt: "Model in wide trousers standing in shadow and light" },
    ],
    description: "A relaxed wide-leg trouser with an elasticated waist and long, pooling hem.",
    details: ["Demo spec: 420gsm cotton fleece", "Side seam pockets", "Elasticated waist with drawcord"],
    care: ["Cold wash inside out", "Dry flat"],
    isNew: true,
  },
  {
    slug: "field-layer-jacket",
    name: "Field Layer Jacket",
    collection: "mainline",
    price: 145000,
    colours: [BLACK],
    variants: grid([BLACK.name], ["S", "M", "L", "XL"], ["Washed Black/S", "Washed Black/M", "Washed Black/L", "Washed Black/XL"]),
    images: [
      { src: homeland, alt: "Three models in layered monochrome outerwear on open land" },
      { src: hoodie, alt: "Washed black fabric detail" },
    ],
    description: "A boxy utility jacket in waxed cotton canvas with a funnel neck.",
    details: ["Demo spec: waxed cotton canvas", "Four-pocket front", "Concealed placket"],
    care: ["Spot clean only"],
  },
  {
    slug: "open-collar-linen-shirt",
    name: "Open Collar Linen Shirt",
    collection: "summer-christian-shirts",
    price: 55000,
    colours: [WHITE, SAND],
    variants: grid([WHITE.name, SAND.name], SIZES, ["Sand/XS"]),
    images: [
      { src: shirt, alt: "White linen open collar shirt on a wooden hanger" },
      { src: summer, alt: "Two models in white linen shirts on a coastline at dusk" },
    ],
    description: "A breathable camp-collar shirt in washed linen with a single patch pocket.",
    details: ["Demo spec: 100% washed linen", "Relaxed fit", "Corozo-style buttons"],
    care: ["Cold gentle wash", "Line dry", "Warm iron while damp"],
    isNew: true,
  },
  {
    slug: "sunday-camp-shirt",
    name: "Sunday Camp Shirt",
    collection: "summer-christian-shirts",
    price: 60000,
    colours: [SAND, WHITE],
    variants: grid([SAND.name, WHITE.name], ["S", "M", "L", "XL"]),
    images: [
      { src: summer, alt: "Model in a light shirt looking out over the sea" },
      { src: shirt, alt: "Camp collar shirt detail" },
    ],
    description: "A softly structured short-sleeve shirt with a notched camp collar, cut for warm evenings.",
    details: ["Demo spec: linen-cotton blend", "Straight hem", "Boxy fit"],
    care: ["Cold gentle wash", "Line dry"],
  },
  {
    slug: "coastline-overshirt",
    name: "Coastline Overshirt",
    collection: "summer-christian-shirts",
    price: 75000,
    colours: [WHITE],
    variants: grid([WHITE.name], ["M", "L", "XL"], ["Optic White/M"]),
    images: [
      { src: shirt, alt: "White overshirt hanging against a warm wall" },
      { src: summer, alt: "Sunset coastline campaign image" },
    ],
    description: "A long-sleeve linen overshirt to layer over tees when the sea breeze turns.",
    details: ["Demo spec: heavy washed linen", "Two chest pockets", "Oversized fit"],
    care: ["Cold gentle wash", "Line dry"],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getCollectionProducts(handle: CollectionHandle) {
  return products.filter((p) => p.collection === handle);
}

export function isCollectionHandle(h: string): h is CollectionHandle {
  return h in collections;
}

export function isVariantAvailable(p: Product, colour: string, size: string) {
  return p.variants.some((v) => v.colour === colour && v.size === size && v.available);
}

export function isProductSoldOut(p: Product) {
  return !p.variants.some((v) => v.available);
}

export function searchProducts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) =>
    [p.name, p.description, collections[p.collection].title, ...p.colours.map((c) => c.name)]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export function formatGHS(pesewas: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(pesewas / 100);
}
